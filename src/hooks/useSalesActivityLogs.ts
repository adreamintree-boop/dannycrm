import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';

export interface SalesActivityLog {
  id: string;
  project_id: string | null;
  buyer_id: string | null;
  source: string;
  direction: string;
  title: string;
  content: string | null;
  email_message_id: string | null;
  occurred_at: string;
  created_by: string;
  created_at: string;
}

export function useSalesActivityLogs() {
  const { user } = useAuthContext();
  const [logs, setLogs] = useState<SalesActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogsByBuyer = useCallback(async (buyerId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales_activity_logs')
        .select('*')
        .eq('buyer_id', buyerId)
        .eq('created_by', user.id)
        .order('occurred_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch sales activity logs:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUnassignedLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales_activity_logs')
        .select('*')
        .is('buyer_id', null)
        .eq('created_by', user.id)
        .order('occurred_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch unassigned logs:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchAllLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales_activity_logs')
        .select('*')
        .eq('created_by', user.id)
        .order('occurred_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch all logs:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getLogCountByBuyer = useCallback(async (buyerId: string): Promise<number> => {
    if (!user) return 0;
    try {
      const { count, error } = await supabase
        .from('sales_activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', buyerId)
        .eq('created_by', user.id);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Failed to get log count:', error);
      return 0;
    }
  }, [user]);

  const assignLogToBuyer = useCallback(async (logId: string, buyerId: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('sales_activity_logs')
        .update({ buyer_id: buyerId })
        .eq('id', logId)
        .eq('created_by', user.id);

      if (error) throw error;
      
      setLogs(prev => prev.map(log => 
        log.id === logId ? { ...log, buyer_id: buyerId } : log
      ));
      
      return true;
    } catch (error) {
      console.error('Failed to assign log to buyer:', error);
      return false;
    }
  }, [user]);

  return {
    logs,
    loading,
    fetchLogsByBuyer,
    fetchUnassignedLogs,
    fetchAllLogs,
    getLogCountByBuyer,
    assignLogToBuyer,
  };
}
