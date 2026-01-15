import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';

export interface CrmEmailLink {
  nylas_message_id: string;
  buyer_id: string;
  buyer_name?: string;
}

export function useCrmEmailStatus() {
  const { user } = useAuthContext();
  const [linkedMessages, setLinkedMessages] = useState<Map<string, CrmEmailLink>>(new Map());
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const fetchLinkedMessages = useCallback(async () => {
    if (!user || fetchedRef.current) return;
    
    fetchedRef.current = true;
    setLoading(true);
    
    try {
      // Fetch all sales_activity_logs with nylas_message_id for this user
      const { data, error } = await supabase
        .from('sales_activity_logs')
        .select(`
          nylas_message_id,
          buyer_id,
          crm_buyers!sales_activity_logs_buyer_id_fkey(company_name)
        `)
        .eq('created_by', user.id)
        .not('nylas_message_id', 'is', null);

      if (error) throw error;

      const linkMap = new Map<string, CrmEmailLink>();
      data?.forEach((log: any) => {
        if (log.nylas_message_id) {
          linkMap.set(log.nylas_message_id, {
            nylas_message_id: log.nylas_message_id,
            buyer_id: log.buyer_id,
            buyer_name: log.crm_buyers?.company_name,
          });
        }
      });

      setLinkedMessages(linkMap);
    } catch (error) {
      console.error('Failed to fetch CRM email links:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const isLinked = useCallback((messageId: string) => {
    return linkedMessages.has(messageId);
  }, [linkedMessages]);

  const getLink = useCallback((messageId: string) => {
    return linkedMessages.get(messageId);
  }, [linkedMessages]);

  const addLink = useCallback((messageId: string, buyerId: string, buyerName: string) => {
    setLinkedMessages(prev => {
      const next = new Map(prev);
      next.set(messageId, { nylas_message_id: messageId, buyer_id: buyerId, buyer_name: buyerName });
      return next;
    });
  }, []);

  const refreshLinks = useCallback(() => {
    fetchedRef.current = false;
    fetchLinkedMessages();
  }, [fetchLinkedMessages]);

  return {
    linkedMessages,
    loading,
    fetchLinkedMessages,
    isLinked,
    getLink,
    addLink,
    refreshLinks,
  };
}
