import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { BLRecord } from '@/data/blMockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';

interface CompanyTimeChartProps {
  data: BLRecord[];
}

const CompanyTimeChart: React.FC<CompanyTimeChartProps> = ({ data }) => {
  const [showShipments, setShowShipments] = useState(true);
  const [showValue, setShowValue] = useState(true);
  const [showWeight, setShowWeight] = useState(false);
  const [showQuantity, setShowQuantity] = useState(false);

  // Group data by month
  const chartData = useMemo(() => {
    const monthlyData: Record<string, { 
      month: string; 
      shipments: number; 
      value: number; 
      weight: number; 
      quantity: number;
    }> = {};

    data.forEach(record => {
      const monthKey = record.date.substring(0, 7); // YYYY-MM
      
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

      // Parse weight
      if (record.weight && record.weight !== '-') {
        const match = record.weight.match(/[\d,]+/);
        if (match) {
          monthlyData[monthKey].weight += parseFloat(match[0].replace(/,/g, ''));
        }
      }

      // Parse quantity
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
      return format(parseISO(monthStr + '-01'), 'yyyy-MM');
    } catch {
      return monthStr;
    }
  };

  return (
    <Card className="p-6 bg-card border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">월간 거래 인포그래픽</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="shipments" 
              checked={showShipments} 
              onCheckedChange={(checked) => setShowShipments(checked as boolean)}
            />
            <label htmlFor="shipments" className="text-sm text-muted-foreground cursor-pointer">배송</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="value" 
              checked={showValue} 
              onCheckedChange={(checked) => setShowValue(checked as boolean)}
            />
            <label htmlFor="value" className="text-sm text-muted-foreground cursor-pointer">가치</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="weight" 
              checked={showWeight} 
              onCheckedChange={(checked) => setShowWeight(checked as boolean)}
            />
            <label htmlFor="weight" className="text-sm text-muted-foreground cursor-pointer">무게</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="quantity" 
              checked={showQuantity} 
              onCheckedChange={(checked) => setShowQuantity(checked as boolean)}
            />
            <label htmlFor="quantity" className="text-sm text-muted-foreground cursor-pointer">수량</label>
          </div>
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              tickFormatter={formatMonth}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number, name: string) => [
                value.toLocaleString('en-US', { maximumFractionDigits: 2 }),
                name
              ]}
            />
            <Legend />
            {showValue && (
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="value" 
                name="가치 (US$)"
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2 }}
              />
            )}
            {showShipments && (
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="shipments" 
                name="배송"
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ fill: '#f59e0b', strokeWidth: 2 }}
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
                dot={{ fill: '#10b981', strokeWidth: 2 }}
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
                dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default CompanyTimeChart;
