import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';

interface DailyBehaviorData {
  [day: number]: number; // day (1-31) -> behavior count
}

export const useBehaviorIndex = () => {
  const { user } = useAuthContext();
  const [dailyData, setDailyData] = useState<DailyBehaviorData>({});
  const [loading, setLoading] = useState(true);

  // Current system date for reference
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  // Selected year/month state (defaults to current)
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);

  const fetchBehaviorData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Calculate date range for selected month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();

      // Initialize daily counts
      const dailyCounts: DailyBehaviorData = {};

      // Fetch in parallel: buyer creations, move_history (stage changes), sales_activity_logs
      const [buyersResult, moveHistoryResult, activityLogsResult] = await Promise.all([
        // 1. New buyers registered this month
        supabase
          .from('crm_buyers')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', startDateStr)
          .lte('created_at', endDateStr),

        // 2. Move history (includes stage changes)
        supabase
          .from('move_history')
          .select('created_at, category')
          .eq('user_id', user.id)
          .gte('created_at', startDateStr)
          .lte('created_at', endDateStr),

        // 3. Sales activity logs (includes emails logged to CRM)
        supabase
          .from('sales_activity_logs')
          .select('occurred_at, source, direction')
          .eq('created_by', user.id)
          .gte('occurred_at', startDateStr)
          .lte('occurred_at', endDateStr),
      ]);

      // Process buyer creations (+1 each)
      if (buyersResult.data) {
        buyersResult.data.forEach((buyer) => {
          const date = new Date(buyer.created_at);
          const day = date.getDate();
          dailyCounts[day] = (dailyCounts[day] || 0) + 1;
        });
      }

      // Process move history - funnel changes (+1 each)
      if (moveHistoryResult.data) {
        moveHistoryResult.data.forEach((entry) => {
          // Only count funnel-related changes (stage moves)
          if (entry.category === 'funnel') {
            const date = new Date(entry.created_at);
            const day = date.getDate();
            dailyCounts[day] = (dailyCounts[day] || 0) + 1;
          }
        });
      }

      // Process sales activity logs (+1 each for activities and emails)
      if (activityLogsResult.data) {
        activityLogsResult.data.forEach((log) => {
          const date = new Date(log.occurred_at);
          const day = date.getDate();
          dailyCounts[day] = (dailyCounts[day] || 0) + 1;
        });
      }

      setDailyData(dailyCounts);
    } catch (error) {
      console.error('Error fetching behavior data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, year, month]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchBehaviorData();
  }, [fetchBehaviorData]);

  // Compute square counts using ceil (1-10 = 1, 11-20 = 2, etc.)
  const squareData = useMemo(() => {
    const result: { [day: number]: number } = {};
    Object.entries(dailyData).forEach(([day, count]) => {
      // 0 count = 0 squares, >0 count = ceil(count/10)
      result[parseInt(day)] = count > 0 ? Math.ceil(count / 10) : 0;
    });
    return result;
  }, [dailyData]);

  // Get max squares for any day (for determining grid height)
  const maxSquares = useMemo(() => {
    const squares = Object.values(squareData);
    return squares.length > 0 ? Math.max(...squares, 4) : 4; // minimum 4 rows
  }, [squareData]);

  // Navigation handlers
  const goToPreviousMonth = useCallback(() => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }, [month, year]);

  const goToNextMonth = useCallback(() => {
    // Block navigation into future months
    if (year === currentYear && month >= currentMonth) {
      return;
    }
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }, [month, year, currentYear, currentMonth]);

  // Check if we can navigate to next month
  const canGoNext = useMemo(() => {
    return !(year === currentYear && month >= currentMonth);
  }, [year, month, currentYear, currentMonth]);

  return {
    year,
    month,
    dailyData,
    squareData,
    maxSquares,
    loading,
    refresh: fetchBehaviorData,
    goToPreviousMonth,
    goToNextMonth,
    canGoNext,
  };
};
