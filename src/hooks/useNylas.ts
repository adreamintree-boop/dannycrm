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

function isUnauthorizedErrorMessage(message: string | undefined): boolean {
  const m = (message ?? '').toLowerCase();
  return m.includes('unauthorized') || m.includes('jwt') || m.includes('session');
}

export function useNylas() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invokeAuthed = useCallback(async <T,>(
    functionName: string,
    body: Record<string, unknown>
  ): Promise<{ data: T | null; error: { message: string } | null }> => {
    // Always attach a fresh access token explicitly.
    const { data: sessionData } = await supabase.auth.getSession();
    let accessToken = sessionData.session?.access_token ?? null;

    const doInvoke = async () => {
      const { data, error: invokeError } = await supabase.functions.invoke(functionName, {
        method: 'POST',
        body,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      return { data: (data as T) ?? null, error: invokeError ? { message: invokeError.message } : null };
    };

    let result = await doInvoke();

    // If we hit an auth race (token not ready / expired), refresh once and retry.
    if (result.error && isUnauthorizedErrorMessage(result.error.message)) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      accessToken = refreshed.session?.access_token ?? accessToken;
      result = await doInvoke();
    }

    return result;
  }, []);

  const getEmailAccount = useCallback(async (): Promise<NylasEmailAccount | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await invokeAuthed<NylasEmailAccount>('nylas-get-me', {});

      if (invokeError) {
        console.error('nylas-get-me error:', invokeError);
        setError(invokeError.message);
        return null;
      }

      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get email account';
      console.error('getEmailAccount error:', err);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [invokeAuthed]);

  const listMessages = useCallback(
    async (
      folder: string = 'inbox',
      page: number = 1,
      pageSize: number = 20,
      search?: string
    ): Promise<NylasListResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: invokeError } = await invokeAuthed<NylasListResponse>('nylas-list-messages', {
          folder,
          page,
          page_size: pageSize,
          search,
        });

        if (invokeError) {
          console.error('nylas-list-messages error:', invokeError);
          setError(invokeError.message);
          return null;
        }

        return data;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to list messages';
        console.error('listMessages error:', err);
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [invokeAuthed]
  );

  const getMessage = useCallback(async (messageId: string): Promise<NylasMessageDetail | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await invokeAuthed<NylasMessageDetail>('nylas-get-message', {
        message_id: messageId,
      });

      if (invokeError) {
        console.error('nylas-get-message error:', invokeError);
        setError(invokeError.message);
        return null;
      }

      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get message';
      console.error('getMessage error:', err);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [invokeAuthed]);

  const sendMessage = useCallback(
    async (payload: {
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
        const { data, error: invokeError } = await invokeAuthed<{
          success: boolean;
          message_id?: string;
          thread_id?: string;
          logged_to_crm?: boolean;
        }>('nylas-send', payload as unknown as Record<string, unknown>);

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
    },
    [invokeAuthed]
  );

  const logToCRM = useCallback(
    async (messageId: string, buyerId: string): Promise<{ logged: boolean; sales_activity_id?: string; buyer_name?: string } | null> => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: invokeError } = await invokeAuthed<{ logged: boolean; sales_activity_id?: string; buyer_name?: string }>(
          'nylas-log-to-crm',
          { message_id: messageId, buyer_id: buyerId }
        );

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
    },
    [invokeAuthed]
  );

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

