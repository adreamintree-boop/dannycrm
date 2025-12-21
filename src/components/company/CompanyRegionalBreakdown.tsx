import React, { useMemo, useState } from 'react';
import { BLRecord } from '@/data/blMockData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface CompanyRegionalBreakdownProps {
  data: BLRecord[];
}

const REGION_MAP: Record<string, string> = {
  'China': '아시아',
  'Japan': '아시아',
  'Korea': '아시아',
  'South Korea': '아시아',
  'Taiwan': '아시아',
  'Vietnam': '아시아',
  'Thailand': '아시아',
  'India': '아시아',
  'Indonesia': '아시아',
  'Malaysia': '아시아',
  'Singapore': '아시아',
  'Philippines': '아시아',
  'USA': '북미',
  'United States': '북미',
  'Canada': '북미',
  'Mexico': '북미',
  'Germany': '유럽',
  'UK': '유럽',
  'France': '유럽',
  'Italy': '유럽',
  'Netherlands': '유럽',
  'Spain': '유럽',
  'Brazil': '남미',
  'Argentina': '남미',
  'Chile': '남미',
  'Australia': '오세아니아',
  'New Zealand': '오세아니아',
};

const REGION_COLORS: Record<string, string> = {
  '아시아': '#3b82f6',
  '북미': '#10b981',
  '유럽': '#f59e0b',
  '남미': '#8b5cf6',
  '오세아니아': '#ec4899',
  '기타': '#94a3b8',
};

type MetricType = 'shipments' | 'value' | 'weight' | 'quantity';

const CompanyRegionalBreakdown: React.FC<CompanyRegionalBreakdownProps> = ({ data }) => {
  const [metric, setMetric] = useState<MetricType>('shipments');

  const regionStats = useMemo(() => {
    const stats: Record<string, { shipments: number; value: number; weight: number; quantity: number }> = {};
    
    data.forEach(record => {
      const country = record.originCountry || record.destinationCountry || '';
      const region = REGION_MAP[country] || '기타';
      
      if (!stats[region]) {
        stats[region] = { shipments: 0, value: 0, weight: 0, quantity: 0 };
      }
      
      stats[region].shipments += 1;
      stats[region].value += record.valueUSD || 0;
      
      if (record.weight && record.weight !== '-') {
        const match = record.weight.match(/[\d,]+/);
        if (match) stats[region].weight += parseFloat(match[0].replace(/,/g, ''));
      }
      
      if (record.quantity && record.quantity !== '-') {
        const match = record.quantity.match(/[\d,]+/);
        if (match) stats[region].quantity += parseFloat(match[0].replace(/,/g, ''));
      }
    });

    return Object.entries(stats)
      .map(([name, stat]) => ({ 
        name, 
        value: stat[metric],
        color: REGION_COLORS[name] || REGION_COLORS['기타']
      }))
      .filter(s => s.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data, metric]);

  const total = regionStats.reduce((sum, s) => sum + s.value, 0);

  const metricLabels: Record<MetricType, string> = {
    shipments: '배송',
    value: '가치',
    weight: '무게',
    quantity: '수량'
  };

  const formatValue = (value: number) => {
    if (metric === 'value') {
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
      return `$${value}`;
    }
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white border border-gray-200 rounded shadow-lg px-2 py-1 text-xs">
          <span className="font-medium">{data.name}</span>: {formatValue(data.value)} ({percentage}%)
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">지역별 분포</h3>
        <div className="flex gap-1">
          {(Object.keys(metricLabels) as MetricType[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                metric === m 
                  ? 'bg-blue-100 text-blue-700 font-medium' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {metricLabels[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        {/* Donut Chart */}
        <div className="w-[100px] h-[100px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={regionStats}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={45}
                paddingAngle={2}
                dataKey="value"
              >
                {regionStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1 overflow-y-auto max-h-[100px] scrollbar-thin">
          {regionStats.map((stat) => {
            const percentage = ((stat.value / total) * 100).toFixed(1);
            return (
              <div 
                key={stat.name} 
                className="flex items-center justify-between text-[11px] py-0.5"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div 
                    className="w-2 h-2 rounded-sm flex-shrink-0" 
                    style={{ backgroundColor: stat.color }}
                  />
                  <span className="text-gray-700">{stat.name}</span>
                </div>
                <span className="text-gray-500 flex-shrink-0">
                  {percentage}%
                </span>
              </div>
            );
          })}
          
          {regionStats.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">
              데이터 없음
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyRegionalBreakdown;