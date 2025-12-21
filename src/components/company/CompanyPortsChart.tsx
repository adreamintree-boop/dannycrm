import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BLRecord } from '@/data/blMockData';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface CompanyPortsChartProps {
  data: BLRecord[];
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
];

const CompanyPortsChart: React.FC<CompanyPortsChartProps> = ({ data }) => {
  const [portType, setPortType] = useState<'loading' | 'discharge'>('loading');

  // Since we don't have port data in the mock, we'll use destination country as proxy
  const portStats = useMemo(() => {
    const stats: Record<string, number> = {};
    
    data.forEach(record => {
      // Use destination or origin country as port proxy
      const port = portType === 'loading' 
        ? (record.originCountry || 'UNKNOWN')
        : (record.destinationCountry || 'UNKNOWN');
      
      if (!stats[port]) {
        stats[port] = 0;
      }
      stats[port] += 1;
    });

    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [data, portType]);

  const totalCount = portStats.reduce((sum, s) => sum + s.value, 0);

  return (
    <Card className="p-6 bg-card border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">
          {portType === 'loading' ? '상위 로딩 포트' : '최고 배출 포트'}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">정렬 기준</span>
          <Select value={portType} onValueChange={(v) => setPortType(v as 'loading' | 'discharge')}>
            <SelectTrigger className="w-[80px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="loading">로딩</SelectItem>
              <SelectItem value="discharge">배출</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Donut Chart */}
        <div className="w-1/2 h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={portStats}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name }) => name.length > 10 ? name.substring(0, 10) + '...' : name}
                labelLine={true}
              >
                {portStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [value, '건수']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend list */}
        <div className="w-1/2 space-y-2 max-h-[250px] overflow-y-auto">
          {portStats.map((stat, index) => (
            <div 
              key={stat.name} 
              className="flex items-center justify-between text-sm py-1"
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-foreground truncate max-w-[120px]" title={stat.name}>
                  {stat.name}
                </span>
              </div>
              <span className="text-muted-foreground font-medium">{stat.value}</span>
            </div>
          ))}
          
          {portStats.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              데이터 없음
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default CompanyPortsChart;
