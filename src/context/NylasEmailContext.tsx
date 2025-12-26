import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNylas, NylasEmailAccount, NylasMessage, NylasMessageDetail } from '@/hooks/useNylas';

interface NylasEmailContextType {
  // Account state
  emailAccount: NylasEmailAccount | null;
  accountLoading: boolean;
  isConnected: boolean;
  
  // Messages state
  messages: NylasMessage[];
  messagesLoading: boolean;
  currentMessage: NylasMessageDetail | null;
  messageLoading: boolean;
  
  // Actions
  checkConnection: () => Promise<void>;
  fetchMessages: (folder?: string, page?: number, search?: string) => Promise<void>;
  fetchMessage: (messageId: string) => Promise<NylasMessageDetail | null>;
  sendEmail: (payload: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body_html: string;
    buyer_id?: string;
    reply_to_message_id?: string;
  }) => Promise<boolean>;
  logEmailToCRM: (messageId: string, buyerId: string) => Promise<{ success: boolean; buyerName?: string }>;
  
  // Pagination
  hasMore: boolean;
  currentPage: number;
  currentFolder: string;
  
  // Error
  error: string | null;
}

const NylasEmailContext = createContext<NylasEmailContextType | undefined>(undefined);

export function NylasEmailProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const nylas = useNylas();
  
  // Account state
  const [emailAccount, setEmailAccount] = useState<NylasEmailAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  
  // Messages state
  const [messages, setMessages] = useState<NylasMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<NylasMessageDetail | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);
  
  // Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFolder, setCurrentFolder] = useState('inbox');
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Request deduplication refs
  const fetchMessagesInFlight = useRef<string | null>(null);
  const fetchMessageInFlight = useRef<string | null>(null);
  const checkConnectionInFlight = useRef(false);

  const isConnected = emailAccount?.connected ?? false;

  const checkConnection = useCallback(async () => {
    if (!user) return;
    // Prevent duplicate calls
    if (checkConnectionInFlight.current) return;
    
    checkConnectionInFlight.current = true;
    setAccountLoading(true);
    setError(null);
    try {
      const account = await nylas.getEmailAccount();
      setEmailAccount(account);
    } catch (err) {
      console.error('Failed to check connection:', err);
      setError('Failed to check email connection');
    } finally {
      setAccountLoading(false);
      checkConnectionInFlight.current = false;
    }
  }, [user, nylas]);

  const fetchMessages = useCallback(async (
    folder: string = 'inbox',
    page: number = 1,
    search?: string
  ) => {
    if (!user || !emailAccount?.connected) return;
    
    // Create a unique key for this request
    const requestKey = `${folder}-${page}-${search || ''}`;
    
    // Prevent duplicate calls for the same request
    if (fetchMessagesInFlight.current === requestKey) {
      console.log('[NylasEmailContext] Skipping duplicate fetchMessages call:', requestKey);
      return;
    }
    
    fetchMessagesInFlight.current = requestKey;
    setMessagesLoading(true);
    setError(null);
    setCurrentFolder(folder);
    setCurrentPage(page);
    
    try {
      const response = await nylas.listMessages(folder, page, 20, search);
      if (response) {
        setMessages(response.items);
        setHasMore(response.has_more);
      } else {
        setMessages([]);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError('Failed to fetch messages');
      toast({
        title: '오류',
        description: '이메일을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setMessagesLoading(false);
      fetchMessagesInFlight.current = null;
    }
  }, [user, emailAccount, nylas, toast]);

  const fetchMessage = useCallback(async (messageId: string): Promise<NylasMessageDetail | null> => {
    if (!user || !emailAccount?.connected) return null;
    
    // Prevent duplicate calls for the same message
    if (fetchMessageInFlight.current === messageId) {
      console.log('[NylasEmailContext] Skipping duplicate fetchMessage call:', messageId);
      // Return current message if it matches
      if (currentMessage?.id === messageId) {
        return currentMessage;
      }
      return null;
    }
    
    fetchMessageInFlight.current = messageId;
    setMessageLoading(true);
    setError(null);
    
    try {
      const message = await nylas.getMessage(messageId);
      setCurrentMessage(message);
      return message;
    } catch (err) {
      console.error('Failed to fetch message:', err);
      setError('Failed to fetch message');
      return null;
    } finally {
      setMessageLoading(false);
      fetchMessageInFlight.current = null;
    }
  }, [user, emailAccount, nylas, currentMessage]);

  const sendEmail = useCallback(async (payload: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body_html: string;
    buyer_id?: string;
    reply_to_message_id?: string;
  }): Promise<boolean> => {
    if (!user || !emailAccount?.connected) {
      toast({
        title: '오류',
        description: '이메일이 연동되지 않았습니다.',
        variant: 'destructive',
      });
      return false;
    }
    
    try {
      const result = await nylas.sendMessage(payload);
      if (result?.success) {
        const crmMessage = result.logged_to_crm 
          ? '이메일이 전송되고 CRM에 기록되었습니다.'
          : '이메일이 전송되었습니다.';
        toast({
          title: '전송 완료',
          description: crmMessage,
        });
        return true;
      } else {
        throw new Error('Failed to send email');
      }
    } catch (err) {
      console.error('Failed to send email:', err);
      toast({
        title: '오류',
        description: '이메일 전송에 실패했습니다.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, emailAccount, nylas, toast]);

  const logEmailToCRM = useCallback(async (
    messageId: string,
    buyerId: string
  ): Promise<{ success: boolean; buyerName?: string }> => {
    if (!user || !emailAccount?.connected) {
      return { success: false };
    }
    
    try {
      const result = await nylas.logToCRM(messageId, buyerId);
      if (result?.logged) {
        toast({
          title: 'CRM 기록 완료',
          description: `${result.buyer_name || '바이어'}에 저장되었습니다.`,
        });
        
        // Update current message state if it matches
        if (currentMessage?.id === messageId) {
          setCurrentMessage({ ...currentMessage, is_logged_to_crm: true, crm_buyer_id: buyerId });
        }
        
        // Update messages list
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg } : msg
        ));
        
        return { success: true, buyerName: result.buyer_name };
      } else {
        throw new Error('Failed to log to CRM');
      }
    } catch (err) {
      console.error('Failed to log to CRM:', err);
      toast({
        title: '오류',
        description: 'CRM 기록에 실패했습니다.',
        variant: 'destructive',
      });
      return { success: false };
    }
  }, [user, emailAccount, nylas, toast, currentMessage]);

  const value: NylasEmailContextType = {
    emailAccount,
    accountLoading,
    isConnected,
    messages,
    messagesLoading,
    currentMessage,
    messageLoading,
    checkConnection,
    fetchMessages,
    fetchMessage,
    sendEmail,
    logEmailToCRM,
    hasMore,
    currentPage,
    currentFolder,
    error,
  };

  return (
    <NylasEmailContext.Provider value={value}>
      {children}
    </NylasEmailContext.Provider>
  );
}

export function useNylasEmailContext() {
  const context = useContext(NylasEmailContext);
  if (context === undefined) {
    throw new Error('useNylasEmailContext must be used within a NylasEmailProvider');
  }
  return context;
}
