import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface EmailMessage {
  id: string;
  thread_id: string | null;
  owner_user_id: string;
  mailbox: string;
  direction: string;
  from_email: string;
  from_name: string | null;
  to_emails: string[];
  cc_emails: string[];
  bcc_emails: string[];
  subject: string;
  body: string;
  snippet: string | null;
  is_read: boolean;
  is_starred: boolean;
  is_logged_to_crm: boolean;
  created_at: string;
}

export interface ComposeData {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  buyerId?: string;
  buyerName?: string;
}

interface EmailContextType {
  messages: EmailMessage[];
  loading: boolean;
  unreadCount: number;
  fetchMessages: (mailbox?: string) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  getMessage: (id: string) => Promise<EmailMessage | null>;
  markAsRead: (id: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  sendEmail: (data: ComposeData) => Promise<boolean>;
  saveDraft: (data: ComposeData) => Promise<boolean>;
  seedSampleEmails: () => Promise<void>;
  logActivity: (action: string, messageId?: string, threadId?: string, meta?: Record<string, unknown>) => Promise<void>;
  logEmailToCRM: (messageId: string, buyerId: string, buyerName: string) => Promise<{ success: boolean }>;
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

export function EmailProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const hasSeededRef = useRef(false);

  const logActivity = useCallback(async (
    action: string,
    messageId?: string,
    threadId?: string,
    meta?: Record<string, unknown>
  ) => {
    if (!user) return;
    try {
      await supabase.from('email_activity_log').insert([{
        user_id: user.id,
        action,
        message_id: messageId || null,
        thread_id: threadId || null,
        meta: (meta || {}) as unknown as Record<string, never>,
      }]);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }, [user]);

  const fetchMessages = useCallback(async (mailbox?: string) => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('email_messages')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false });

      if (mailbox && mailbox !== 'all') {
        query = query.eq('mailbox', mailbox);
      }

      const { data, error } = await query;
      if (error) throw error;

      const parsed = (data || []).map((msg) => ({
        ...msg,
        to_emails: Array.isArray(msg.to_emails) ? msg.to_emails : [],
        cc_emails: Array.isArray(msg.cc_emails) ? msg.cc_emails : [],
        bcc_emails: Array.isArray(msg.bcc_emails) ? msg.bcc_emails : [],
      })) as EmailMessage[];

      setMessages(parsed);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast({
        title: '오류',
        description: '이메일을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { count, error } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('owner_user_id', user.id)
        .eq('mailbox', 'inbox')
        .eq('is_read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [user]);

  const getMessage = useCallback(async (id: string): Promise<EmailMessage | null> => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('id', id)
        .eq('owner_user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        to_emails: Array.isArray(data.to_emails) ? data.to_emails : [],
        cc_emails: Array.isArray(data.cc_emails) ? data.cc_emails : [],
        bcc_emails: Array.isArray(data.bcc_emails) ? data.bcc_emails : [],
      } as EmailMessage;
    } catch (error) {
      console.error('Failed to get message:', error);
      return null;
    }
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await supabase
        .from('email_messages')
        .update({ is_read: true })
        .eq('id', id)
        .eq('owner_user_id', user.id);

      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, is_read: true } : msg))
      );
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, [user, fetchUnreadCount]);

  const toggleStar = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const message = messages.find((m) => m.id === id);
      if (!message) return;

      const newStarred = !message.is_starred;
      await supabase
        .from('email_messages')
        .update({ is_starred: newStarred })
        .eq('id', id)
        .eq('owner_user_id', user.id);

      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, is_starred: newStarred } : msg))
      );
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  }, [user, messages]);

  const deleteMessage = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const message = messages.find((m) => m.id === id);
      
      if (message?.mailbox === 'trash') {
        await supabase
          .from('email_messages')
          .delete()
          .eq('id', id)
          .eq('owner_user_id', user.id);
      } else {
        await supabase
          .from('email_messages')
          .update({ mailbox: 'trash' })
          .eq('id', id)
          .eq('owner_user_id', user.id);
      }

      setMessages((prev) => prev.filter((msg) => msg.id !== id));
      toast({
        title: '삭제됨',
        description: '이메일이 삭제되었습니다.',
      });
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast({
        title: '오류',
        description: '이메일 삭제에 실패했습니다.',
        variant: 'destructive',
      });
    }
  }, [user, messages, toast]);

  const createThread = useCallback(async (subject: string): Promise<string | null> => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('email_threads')
        .insert({
          owner_user_id: user.id,
          subject,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Failed to create thread:', error);
      return null;
    }
  }, [user]);

  const sendEmail = useCallback(async (composeData: ComposeData) => {
    if (!user) return false;

    const userEmail = user.email || 'me@taas.local';
    const toEmails = composeData.to.split(',').map((e) => e.trim()).filter(Boolean);
    const ccEmails = composeData.cc?.split(',').map((e) => e.trim()).filter(Boolean) || [];
    const bccEmails = composeData.bcc?.split(',').map((e) => e.trim()).filter(Boolean) || [];
    const snippet = composeData.body.substring(0, 100);

    try {
      const threadId = await createThread(composeData.subject);

      const { data: sentData, error: sentError } = await supabase
        .from('email_messages')
        .insert({
          thread_id: threadId,
          owner_user_id: user.id,
          mailbox: 'sent',
          direction: 'outbound',
          from_email: userEmail,
          from_name: user.user_metadata?.full_name || null,
          to_emails: toEmails,
          cc_emails: ccEmails,
          bcc_emails: bccEmails,
          subject: composeData.subject,
          body: composeData.body,
          snippet,
          is_read: true,
          is_logged_to_crm: !!composeData.buyerId,
        })
        .select('id, created_at')
        .single();

      if (sentError) throw sentError;

      // If buyer selected, log to CRM automatically
      if (composeData.buyerId && sentData) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        const projectId = projectData?.id || null;

        const ccPart = ccEmails.length > 0 ? `\n참조: ${ccEmails.join(', ')}` : '';
        const bccPart = bccEmails.length > 0 ? `\n숨은참조: ${bccEmails.join(', ')}` : '';
        const content = `받는사람: ${toEmails.join(', ')}${ccPart}${bccPart}\n제목: ${composeData.subject}\n발신일: ${sentData.created_at}\n\n${composeData.body}`;

        await supabase
          .from('sales_activity_logs')
          .insert({
            project_id: projectId,
            buyer_id: composeData.buyerId,
            source: 'email',
            direction: 'outbound',
            title: composeData.subject,
            content,
            email_message_id: sentData.id,
            occurred_at: sentData.created_at,
            created_by: user.id,
          });
      }

      // Insert simulated incoming message for testing
      await supabase
        .from('email_messages')
        .insert({
          thread_id: threadId,
          owner_user_id: user.id,
          mailbox: 'inbox',
          direction: 'inbound',
          from_email: toEmails[0] || 'demo@taas.local',
          from_name: 'Demo Recipient',
          to_emails: [userEmail],
          cc_emails: [],
          bcc_emails: [],
          subject: `Re: ${composeData.subject}`,
          body: `This is a simulated auto-reply to your email:\n\n---\n${composeData.body}`,
          snippet: 'This is a simulated auto-reply...',
          is_read: false,
        });

      const toastMessage = composeData.buyerId && composeData.buyerName
        ? `이메일이 전송되고 ${composeData.buyerName} CRM에 기록되었습니다.`
        : '이메일이 전송되었습니다.';

      toast({
        title: '전송 완료',
        description: toastMessage,
      });

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      toast({
        title: '오류',
        description: '이메일 전송에 실패했습니다.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast, createThread]);

  const saveDraft = useCallback(async (composeData: ComposeData) => {
    if (!user) return false;

    const userEmail = user.email || 'me@taas.local';
    const toEmails = composeData.to.split(',').map((e) => e.trim()).filter(Boolean);
    const ccEmails = composeData.cc?.split(',').map((e) => e.trim()).filter(Boolean) || [];
    const bccEmails = composeData.bcc?.split(',').map((e) => e.trim()).filter(Boolean) || [];
    const snippet = composeData.body.substring(0, 100);

    try {
      const { error } = await supabase
        .from('email_messages')
        .insert({
          owner_user_id: user.id,
          mailbox: 'draft',
          direction: 'outbound',
          from_email: userEmail,
          from_name: user.user_metadata?.full_name || null,
          to_emails: toEmails,
          cc_emails: ccEmails,
          bcc_emails: bccEmails,
          subject: composeData.subject || '(제목 없음)',
          body: composeData.body,
          snippet,
          is_read: true,
        });

      if (error) throw error;

      toast({
        title: '저장됨',
        description: '임시보관함에 저장되었습니다.',
      });

      return true;
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast({
        title: '오류',
        description: '임시저장에 실패했습니다.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast]);

  const seedSampleEmails = useCallback(async () => {
    if (!user || hasSeededRef.current) return;
    
    try {
      const { count } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('owner_user_id', user.id);

      if (count && count > 0) {
        hasSeededRef.current = true;
        return;
      }

      hasSeededRef.current = true;

      const sampleEmails = [
        {
          owner_user_id: user.id,
          mailbox: 'inbox',
          direction: 'inbound',
          from_email: 'support@taas.local',
          from_name: 'TaaS Support',
          to_emails: [user.email || 'me@taas.local'],
          cc_emails: [],
          bcc_emails: [],
          subject: 'TaaS CRM에 오신 것을 환영합니다!',
          body: '안녕하세요!\n\nTaaS CRM을 사용해 주셔서 감사합니다. 이 이메일 시스템은 테스트 용도로 제공됩니다.\n\n질문이 있으시면 언제든지 문의해 주세요.\n\n감사합니다,\nTaaS 팀',
          snippet: '안녕하세요! TaaS CRM을 사용해 주셔서 감사합니다...',
          is_read: false,
          is_starred: false,
        },
        {
          owner_user_id: user.id,
          mailbox: 'inbox',
          direction: 'inbound',
          from_email: 'buyer@example.com',
          from_name: 'ABC Trading Co.',
          to_emails: [user.email || 'me@taas.local'],
          cc_emails: [],
          bcc_emails: [],
          subject: 'B/L 관련 문의드립니다',
          body: '안녕하세요,\n\n귀사의 제품에 관심이 있어 연락드립니다. 상세 견적을 보내주실 수 있으신가요?\n\n감사합니다.',
          snippet: '안녕하세요, 귀사의 제품에 관심이 있어...',
          is_read: false,
          is_starred: true,
        },
        {
          owner_user_id: user.id,
          mailbox: 'inbox',
          direction: 'inbound',
          from_email: 'partner@logistics.com',
          from_name: 'Global Logistics',
          to_emails: [user.email || 'me@taas.local'],
          cc_emails: [],
          bcc_emails: [],
          subject: '운송 일정 확인 요청',
          body: '안녕하세요,\n\n다음 주 선적 일정을 확인해 주시기 바랍니다.\n\n- 출발항: 부산\n- 도착항: 로스앤젤레스\n- 예상 출발일: 다음 주 월요일\n\n감사합니다.',
          snippet: '안녕하세요, 다음 주 선적 일정을 확인해...',
          is_read: true,
          is_starred: false,
        },
      ];

      await supabase.from('email_messages').insert(sampleEmails);
      fetchMessages('inbox');
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to seed sample emails:', error);
    }
  }, [user, fetchMessages, fetchUnreadCount]);

  const logEmailToCRM = useCallback(async (
    messageId: string,
    buyerId: string,
    buyerName: string
  ): Promise<{ success: boolean }> => {
    if (!user) return { success: false };

    try {
      // Get the email message
      const { data: emailData, error: emailError } = await supabase
        .from('email_messages')
        .select('*')
        .eq('id', messageId)
        .eq('owner_user_id', user.id)
        .maybeSingle();

      if (emailError || !emailData) {
        throw new Error('Email not found');
      }

      if (emailData.is_logged_to_crm) {
        toast({
          title: '이미 기록됨',
          description: '이 이메일은 이미 CRM에 저장되었습니다.',
        });
        return { success: false };
      }

      // Get user's active project
      const { data: projectData } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const projectId = projectData?.id || null;

      // Determine direction based on mailbox
      const isInbound = emailData.direction === 'inbound' || emailData.mailbox === 'inbox';
      const direction = isInbound ? 'inbound' : 'outbound';

      // Format content (legacy - for display fallback)
      const toEmailsList = Array.isArray(emailData.to_emails) ? emailData.to_emails : [];
      const ccEmailsList = Array.isArray(emailData.cc_emails) ? emailData.cc_emails : [];
      const bccEmailsList = Array.isArray(emailData.bcc_emails) ? emailData.bcc_emails : [];
      // Format "Name <email>" for from_email display
      const formatEmailWithName = (email: string, name: string | null): string => {
        if (name && name.trim()) {
          return `${name} <${email}>`;
        }
        return email;
      };

      // Format to_emails with names if available (for now just emails, but could be enhanced)
      const formattedFromEmail = formatEmailWithName(emailData.from_email, emailData.from_name);
      
      const content = `보낸사람: ${formattedFromEmail}\n받는사람: ${toEmailsList.join(', ')}\n날짜: ${emailData.created_at}\n\n${emailData.snippet || emailData.body?.substring(0, 200) || ''}`;

      // Insert activity log with the selected buyer - include all email fields
      const { error: insertError } = await supabase
        .from('sales_activity_logs')
        .insert({
          project_id: projectId,
          buyer_id: buyerId,
          source: 'email',
          direction,
          title: emailData.subject,
          content,
          email_message_id: messageId,
          occurred_at: emailData.created_at,
          created_by: user.id,
          // Store full email details for Mail Timeline display - use "Name <email>" format
          from_email: formattedFromEmail,
          to_emails: toEmailsList,
          cc_emails: ccEmailsList,
          bcc_emails: bccEmailsList,
          body_text: emailData.body,
          snippet: emailData.snippet,
        });

      if (insertError) throw insertError;

      // Mark email as logged
      await supabase
        .from('email_messages')
        .update({ is_logged_to_crm: true })
        .eq('id', messageId)
        .eq('owner_user_id', user.id);

      // Update local state
      setMessages(prev =>
        prev.map(msg => msg.id === messageId ? { ...msg, is_logged_to_crm: true } : msg)
      );

      toast({
        title: 'CRM 기록 완료',
        description: `${buyerName}에 저장되었습니다.`,
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to log email to CRM:', error);
      toast({
        title: '오류',
        description: 'CRM 기록에 실패했습니다.',
        variant: 'destructive',
      });
      return { success: false };
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user, fetchUnreadCount]);

  const value: EmailContextType = {
    messages,
    loading,
    unreadCount,
    fetchMessages,
    fetchUnreadCount,
    getMessage,
    markAsRead,
    toggleStar,
    deleteMessage,
    sendEmail,
    saveDraft,
    seedSampleEmails,
    logActivity,
    logEmailToCRM,
  };

  return (
    <EmailContext.Provider value={value}>
      {children}
    </EmailContext.Provider>
  );
}

export function useEmailContext() {
  const context = useContext(EmailContext);
  if (context === undefined) {
    throw new Error('useEmailContext must be used within an EmailProvider');
  }
  return context;
}
