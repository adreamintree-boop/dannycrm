import { useState, useEffect, useCallback } from 'react';
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
  created_at: string;
}

export interface EmailThread {
  id: string;
  owner_user_id: string;
  subject: string;
  created_at: string;
  updated_at: string;
}

export interface ComposeData {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  replyToId?: string;
  forwardFromId?: string;
}

export function useEmail() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

      await logActivity('mark_read', id);
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

      await logActivity('star', id, undefined, { starred: newStarred });
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

      await logActivity('delete', id);
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

  const createThread = async (subject: string): Promise<string | null> => {
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
  };

  const sendEmail = useCallback(async (composeData: ComposeData) => {
    if (!user) return false;

    const userEmail = user.email || 'me@taas.local';
    const toEmails = composeData.to.split(',').map((e) => e.trim()).filter(Boolean);
    const ccEmails = composeData.cc?.split(',').map((e) => e.trim()).filter(Boolean) || [];
    const bccEmails = composeData.bcc?.split(',').map((e) => e.trim()).filter(Boolean) || [];
    const snippet = composeData.body.substring(0, 100);

    try {
      const threadId = await createThread(composeData.subject);

      // Insert sent message for current user
      const { data: sentMsg, error: sentError } = await supabase
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
        })
        .select('id')
        .single();

      if (sentError) throw sentError;

      await logActivity('send', sentMsg.id, threadId || undefined, {
        to: toEmails,
        subject: composeData.subject,
      });

      // Insert simulated incoming message for testing
      const { data: inboxMsg, error: inboxError } = await supabase
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
        })
        .select('id')
        .single();

      if (inboxError) throw inboxError;

      await logActivity('compose', inboxMsg.id, threadId || undefined, {
        simulated: true,
      });

      toast({
        title: '전송 완료',
        description: '이메일이 전송되었습니다.',
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
  }, [user, toast]);

  const saveDraft = useCallback(async (composeData: ComposeData) => {
    if (!user) return false;

    const userEmail = user.email || 'me@taas.local';
    const toEmails = composeData.to.split(',').map((e) => e.trim()).filter(Boolean);
    const ccEmails = composeData.cc?.split(',').map((e) => e.trim()).filter(Boolean) || [];
    const bccEmails = composeData.bcc?.split(',').map((e) => e.trim()).filter(Boolean) || [];
    const snippet = composeData.body.substring(0, 100);

    try {
      const { data, error } = await supabase
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
        })
        .select('id')
        .single();

      if (error) throw error;

      await logActivity('save_draft', data.id);

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
    if (!user) return;
    
    try {
      const { count } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('owner_user_id', user.id);

      if (count && count > 0) return;

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

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user, fetchUnreadCount]);

  return {
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
  };
}
