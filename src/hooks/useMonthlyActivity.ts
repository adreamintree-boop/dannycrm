import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';

interface MonthlyActivityData {
  month: string;
  monthNum: number;
  buyerRegistrations: number;
  salesLogs: number;
  emailSent: number;
  emailReceived: number;
}

export function useMonthlyActivity() {
  const { user } = useAuthContext();
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyActivityData[]>([]);

  const monthLabels = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  const fetchMonthlyData = useCallback(async () => {
    if (!user?.id) {
      setMonthlyData(monthLabels.map((label, i) => ({
        month: label,
        monthNum: i + 1,
        buyerRegistrations: 0,
        salesLogs: 0,
        emailSent: 0,
        emailReceived: 0,
      })));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const startOfYear = `${year}-01-01T00:00:00.000Z`;
      const endOfYear = `${year}-12-31T23:59:59.999Z`;

      // Fetch all data in parallel
      const [buyersRes, salesLogsRes, emailSentRes, emailReceivedRes] = await Promise.all([
        // Buyer registrations
        supabase
          .from('crm_buyers')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', startOfYear)
          .lte('created_at', endOfYear),
        
        // Sales activity logs
        supabase
          .from('sales_activity_logs')
          .select('occurred_at')
          .eq('created_by', user.id)
          .gte('occurred_at', startOfYear)
          .lte('occurred_at', endOfYear),
        
        // Email sent
        supabase
          .from('sales_activity_logs')
          .select('occurred_at')
          .eq('created_by', user.id)
          .eq('source', 'email')
          .eq('direction', 'outbound')
          .gte('occurred_at', startOfYear)
          .lte('occurred_at', endOfYear),
        
        // Email received
        supabase
          .from('sales_activity_logs')
          .select('occurred_at')
          .eq('created_by', user.id)
          .eq('source', 'email')
          .eq('direction', 'inbound')
          .gte('occurred_at', startOfYear)
          .lte('occurred_at', endOfYear),
      ]);

      // Aggregate by month
      const aggregateByMonth = (data: { created_at?: string; occurred_at?: string }[] | null, dateField: 'created_at' | 'occurred_at') => {
        const counts: Record<number, number> = {};
        for (let i = 1; i <= 12; i++) counts[i] = 0;
        
        if (!data) return counts;
        
        data.forEach(item => {
          const dateStr = item[dateField];
          if (dateStr) {
            const date = new Date(dateStr);
            const m = date.getMonth() + 1;
            if (m >= 1 && m <= 12) {
              counts[m]++;
            }
          }
        });
        
        return counts;
      };

      const buyerCounts = aggregateByMonth(buyersRes.data, 'created_at');
      const salesLogCounts = aggregateByMonth(salesLogsRes.data, 'occurred_at');
      const emailSentCounts = aggregateByMonth(emailSentRes.data, 'occurred_at');
      const emailReceivedCounts = aggregateByMonth(emailReceivedRes.data, 'occurred_at');

      const result: MonthlyActivityData[] = monthLabels.map((label, i) => ({
        month: label,
        monthNum: i + 1,
        buyerRegistrations: buyerCounts[i + 1] || 0,
        salesLogs: salesLogCounts[i + 1] || 0,
        emailSent: emailSentCounts[i + 1] || 0,
        emailReceived: emailReceivedCounts[i + 1] || 0,
      }));

      setMonthlyData(result);
    } catch (error) {
      console.error('Failed to fetch monthly activity data:', error);
      setMonthlyData(monthLabels.map((label, i) => ({
        month: label,
        monthNum: i + 1,
        buyerRegistrations: 0,
        salesLogs: 0,
        emailSent: 0,
        emailReceived: 0,
      })));
    } finally {
      setLoading(false);
    }
  }, [user?.id, year]);

  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData]);

  const goToPreviousYear = useCallback(() => {
    setYear(prev => prev - 1);
  }, []);

  const goToNextYear = useCallback(() => {
    setYear(prev => prev + 1);
  }, []);

  const canGoNext = useMemo(() => {
    return year < currentDate.getFullYear();
  }, [year, currentDate]);

  const totals = useMemo(() => ({
    buyerRegistrations: monthlyData.reduce((sum, d) => sum + d.buyerRegistrations, 0),
    salesLogs: monthlyData.reduce((sum, d) => sum + d.salesLogs, 0),
    emailSent: monthlyData.reduce((sum, d) => sum + d.emailSent, 0),
    emailReceived: monthlyData.reduce((sum, d) => sum + d.emailReceived, 0),
  }), [monthlyData]);

  const hasData = useMemo(() => {
    return monthlyData.some(d => 
      d.buyerRegistrations > 0 || d.salesLogs > 0 || d.emailSent > 0 || d.emailReceived > 0
    );
  }, [monthlyData]);

  return {
    year,
    month,
    setMonth,
    monthlyData,
    loading,
    goToPreviousYear,
    goToNextYear,
    canGoNext,
    totals,
    hasData,
    refresh: fetchMonthlyData,
  };
}
