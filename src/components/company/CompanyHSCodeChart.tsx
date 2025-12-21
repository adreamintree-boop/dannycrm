import React, { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BLRecord } from '@/data/blMockData';

interface CompanyHSCodeChartProps {
  data: BLRecord[];
}

const CompanyHSCodeChart: React.FC<CompanyHSCodeChartProps> = ({ data }) => {
  const [hsDigits, setHsDigits] = useState<'6' | '4'>('6');
  const [sortBy, setSortBy] = useState<'count' | 'value'>('count');

  const hsStats = useMemo(() => {
    const stats: Record<string, { count: number; value: number }> = {};
    
    data.forEach(record => {
      if (!record.hsCode || record.hsCode === '-') return;
      
      const hsCode = hsDigits === '4' 
        ? record.hsCode.substring(0, 4) 
        : record.hsCode.substring(0, 6);
      
      if (!stats[hsCode]) {
        stats[hsCode] = { count: 0, value: 0 };
      }
      stats[hsCode].count += 1;
      stats[hsCode].value += record.valueUSD || 0;
    });

    return Object.entries(stats)
      .map(([hsCode, stat]) => ({ hsCode, ...stat }))
      .sort((a, b) => sortBy === 'count' ? b.count - a.count : b.value - a.value)
      .slice(0, 8);
  }, [data, hsDigits, sortBy]);

  const totalCount = hsStats.reduce((sum, s) => sum + s.count, 0);
  const maxCount = Math.max(...hsStats.map(s => s.count), 1);

  const HS_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];

  return (
    <div className="bg-white rounded border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">상위 HS 코드</h3>
        <div className="flex items-center gap-1.5">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'count' | 'value')}>
            <SelectTrigger className="w-[60px] h-6 text-[10px] border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count" className="text-xs">건수</SelectItem>
              <SelectItem value="value" className="text-xs">가치</SelectItem>
            </SelectContent>
          </Select>
          <Select value={hsDigits} onValueChange={(v) => setHsDigits(v as '6' | '4')}>
            <SelectTrigger className="w-[70px] h-6 text-[10px] border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6" className="text-xs">6자리</SelectItem>
              <SelectItem value="4" className="text-xs">4자리</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        {hsStats.map((stat, index) => {
          const percentage = ((stat.count / totalCount) * 100).toFixed(1);
          const barWidth = (stat.count / maxCount) * 100;
          
          return (
            <div key={stat.hsCode} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-gray-700">{stat.hsCode || 'N/A'}</span>
                <span className="text-gray-500">
                  {stat.count} <span className="text-gray-400">({percentage}%)</span>
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${barWidth}%`,
                    backgroundColor: HS_COLORS[index % HS_COLORS.length]
                  }}
                />
              </div>
            </div>
          );
        })}
        
        {hsStats.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">
            데이터 없음
          </p>
        )}
      </div>
    </div>
  );
};

export default CompanyHSCodeChart;