import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NylasEmailAccount {
  connected: boolean;
  email_address: string | null;
  provider: string | null;
  grant_id: string | null;
}

export interface NylasMessage {
  id: string;
  thread_id: string | null;
  folder: string;
  subject: string;
  snippet: string;
  from: { email: string; name?: string };
  to: { email: string; name?: string }[];
  cc: { email: string; name?: string }[];
  bcc: { email: string; name?: string }[];
  date: string;
  has_attachments: boolean;
  unread: boolean;
  starred: boolean;
}

export interface NylasMessageDetail extends NylasMessage {
  body_html: string;
  body_text: string;
  attachments: { id: string; filename: string; content_type: string; size: number }[];
  folders: string[];
  is_logged_to_crm: boolean;
  crm_buyer_id: string | null;
}

export interface NylasListResponse {
  items: NylasMessage[];
  page: number;
  page_size: number;
  has_more: boolean;
}

export function useNylas() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getEmailAccount = useCallback(async (): Promise<NylasEmailAccount | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('nylas-get-me', {
        method: 'POST',
        body: {},
      });

      if (invokeError) {
        console.error('nylas-get-me error:', invokeError);
        setError(invokeError.message);
        return null;
      }

      return data as NylasEmailAccount;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get email account';
      console.error('getEmailAccount error:', err);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const listMessages = useCallback(async (
    folder: string = 'inbox',
    page: number = 1,
    pageSize: number = 20,
    search?: string
  ): Promise<NylasListResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('nylas-list-messages', {
        method: 'POST',
        body: { folder, page, page_size: pageSize, search },
      });

      if (invokeError) {
        console.error('nylas-list-messages error:', invokeError);
        setError(invokeError.message);
        return null;
      }

      return data as NylasListResponse;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list messages';
      console.error('listMessages error:', err);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMessage = useCallback(async (messageId: string): Promise<NylasMessageDetail | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('nylas-get-message', {
        method: 'POST',
        body: { message_id: messageId },
      });

      if (invokeError) {
        console.error('nylas-get-message error:', invokeError);
        setError(invokeError.message);
        return null;
      }

      return data as NylasMessageDetail;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get message';
      console.error('getMessage error:', err);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (payload: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body_html: string;
    buyer_id?: string;
    reply_to_message_id?: string;
  }): Promise<{ success: boolean; message_id?: string; thread_id?: string; logged_to_crm?: boolean } | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('nylas-send', {
        method: 'POST',
        body: payload,
      });

      if (invokeError) {
        console.error('nylas-send error:', invokeError);
        setError(invokeError.message);
        return null;
      }

      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      console.error('sendMessage error:', err);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logToCRM = useCallback(async (
    messageId: string,
    buyerId: string
  ): Promise<{ logged: boolean; sales_activity_id?: string; buyer_name?: string } | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('nylas-log-to-crm', {
        method: 'POST',
        body: { message_id: messageId, buyer_id: buyerId },
      });

      if (invokeError) {
        console.error('nylas-log-to-crm error:', invokeError);
        setError(invokeError.message);
        return null;
      }

      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to log to CRM';
      console.error('logToCRM error:', err);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getEmailAccount,
    listMessages,
    getMessage,
    sendMessage,
    logToCRM,
  };
}
