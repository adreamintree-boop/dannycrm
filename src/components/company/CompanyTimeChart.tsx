import React, { useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { BLRecord } from '@/data/blMockData';
import { 
  ComposedChart, 
  Line, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface CompanyTimeChartProps {
  data: BLRecord[];
}

const CompanyTimeChart: React.FC<CompanyTimeChartProps> = ({ data }) => {
  const [showShipments, setShowShipments] = useState(true);
  const [showValue, setShowValue] = useState(true);
  const [showWeight, setShowWeight] = useState(false);
  const [showQuantity, setShowQuantity] = useState(false);

  const chartData = useMemo(() => {
    const monthlyData: Record<string, { 
      month: string; 
      shipments: number; 
      value: number; 
      weight: number; 
      quantity: number;
    }> = {};

    data.forEach(record => {
      const monthKey = record.date.substring(0, 7);
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          shipments: 0,
          value: 0,
          weight: 0,
          quantity: 0
        };
      }

      monthlyData[monthKey].shipments += 1;
      monthlyData[monthKey].value += record.valueUSD || 0;

      if (record.weight && record.weight !== '-') {
        const match = record.weight.match(/[\d,]+/);
        if (match) {
          monthlyData[monthKey].weight += parseFloat(match[0].replace(/,/g, ''));
        }
      }

      if (record.quantity && record.quantity !== '-') {
        const match = record.quantity.match(/[\d,]+/);
        if (match) {
          monthlyData[monthKey].quantity += parseFloat(match[0].replace(/,/g, ''));
        }
      }
    });

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  }, [data]);

  const formatMonth = (monthStr: string) => {
    try {
      return format(parseISO(monthStr + '-01'), 'yy.MM');
    } catch {
      return monthStr;
    }
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded shadow-lg p-3 text-xs">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name}</span>
              <span className="font-medium text-gray-700">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">월간 거래 추이</h3>
        <div className="flex items-center gap-5">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox 
              checked={showShipments} 
              onCheckedChange={(checked) => setShowShipments(checked as boolean)}
              className="h-3.5 w-3.5"
            />
            <span className="text-[11px] text-gray-600">배송</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox 
              checked={showValue} 
              onCheckedChange={(checked) => setShowValue(checked as boolean)}
              className="h-3.5 w-3.5"
            />
            <span className="text-[11px] text-gray-600">가치</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox 
              checked={showWeight} 
              onCheckedChange={(checked) => setShowWeight(checked as boolean)}
              className="h-3.5 w-3.5"
            />
            <span className="text-[11px] text-gray-600">무게</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox 
              checked={showQuantity} 
              onCheckedChange={(checked) => setShowQuantity(checked as boolean)}
              className="h-3.5 w-3.5"
            />
            <span className="text-[11px] text-gray-600">수량</span>
          </label>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis 
              dataKey="month" 
              tickFormatter={formatMonth}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickFormatter={formatValue}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="circle"
              iconSize={8}
            />
            {showValue && (
              <>
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="value" 
                  name="가치 (US$)"
                  fill="url(#valueGradient)"
                  stroke="#3b82f6" 
                  strokeWidth={2}
                />
              </>
            )}
            {showShipments && (
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="shipments" 
                name="배송"
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ fill: '#f59e0b', strokeWidth: 0, r: 3 }}
              />
            )}
            {showWeight && (
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="weight" 
                name="무게 (KG)"
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 0, r: 3 }}
              />
            )}
            {showQuantity && (
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="quantity" 
                name="수량"
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 3 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CompanyTimeChart;