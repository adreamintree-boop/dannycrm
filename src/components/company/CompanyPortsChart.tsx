import React, { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BLRecord } from '@/data/blMockData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface CompanyPortsChartProps {
  data: BLRecord[];
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#f97316'
];

const CompanyPortsChart: React.FC<CompanyPortsChartProps> = ({ data }) => {
  const [portType, setPortType] = useState<'loading' | 'discharge'>('loading');

  const portStats = useMemo(() => {
    const stats: Record<string, number> = {};
    
    data.forEach(record => {
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
      .slice(0, 6);
  }, [data, portType]);

  const totalCount = portStats.reduce((sum, s) => sum + s.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded shadow-lg px-2 py-1 text-xs">
          <span className="font-medium">{data.name}</span>: {data.value}건
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          {portType === 'loading' ? '상위 선적항' : '상위 양하항'}
        </h3>
        <Select value={portType} onValueChange={(v) => setPortType(v as 'loading' | 'discharge')}>
          <SelectTrigger className="w-[65px] h-6 text-[10px] border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="loading" className="text-xs">선적</SelectItem>
            <SelectItem value="discharge" className="text-xs">양하</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3">
        {/* Donut Chart */}
        <div className="w-[120px] h-[120px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={portStats}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={50}
                paddingAngle={2}
                dataKey="value"
              >
                {portStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend list */}
        <div className="flex-1 space-y-1 overflow-y-auto max-h-[120px] scrollbar-thin">
          {portStats.map((stat, index) => {
            const percentage = ((stat.value / totalCount) * 100).toFixed(1);
            return (
              <div 
                key={stat.name} 
                className="flex items-center justify-between text-xs py-0.5"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div 
                    className="w-2 h-2 rounded-sm flex-shrink-0" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-gray-700 truncate text-[11px]">
                    {stat.name}
                  </span>
                </div>
                <span className="text-gray-500 flex-shrink-0 text-[11px]">
                  {stat.value} ({percentage}%)
                </span>
              </div>
            );
          })}
          
          {portStats.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">
              데이터 없음
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyPortsChart;