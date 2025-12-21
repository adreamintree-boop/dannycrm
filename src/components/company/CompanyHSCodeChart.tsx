import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
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
      
      // Truncate to selected digits
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
      .slice(0, 10);
  }, [data, hsDigits, sortBy]);

  const totalCount = hsStats.reduce((sum, s) => sum + s.count, 0);
  const maxCount = Math.max(...hsStats.map(s => s.count), 1);

  return (
    <Card className="p-6 bg-card border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">상위 HS 코드</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">정렬 기준</span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'count' | 'value')}>
            <SelectTrigger className="w-[80px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">배송</SelectItem>
              <SelectItem value="value">가치</SelectItem>
            </SelectContent>
          </Select>
          <Select value={hsDigits} onValueChange={(v) => setHsDigits(v as '6' | '4')}>
            <SelectTrigger className="w-[90px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">HS 6자리</SelectItem>
              <SelectItem value="4">HS 4자리</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {hsStats.map((stat) => {
          const percentage = ((stat.count / totalCount) * 100).toFixed(2);
          const barWidth = (stat.count / maxCount) * 100;
          
          return (
            <div key={stat.hsCode} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-foreground">{stat.hsCode || 'N/A'}</span>
                <span className="text-muted-foreground">
                  {stat.count}({percentage}%)
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
        
        {hsStats.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            데이터 없음
          </p>
        )}
      </div>
    </Card>
  );
};

export default CompanyHSCodeChart;
