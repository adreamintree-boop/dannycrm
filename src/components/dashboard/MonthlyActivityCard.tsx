import React, { useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { monthlyActivityData } from '@/data/mockData';

const monthIcons = ['❄️', '❄️', '🌸', '🌷', '🌻', '🌿', '🍉', '☀️', '🍂', '🎃', '🍁', '🎄'];

const MonthlyActivityCard: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState(12);

  const months = [
    { num: 1, label: '1월', labelEn: 'January' },
    { num: 2, label: '2월', labelEn: 'February' },
    { num: 3, label: '3월', labelEn: 'March' },
    { num: 4, label: '4월', labelEn: 'April' },
    { num: 5, label: '5월', labelEn: 'May' },
    { num: 6, label: '6월', labelEn: 'June' },
    { num: 7, label: '7월', labelEn: 'July' },
    { num: 8, label: '8월', labelEn: 'August' },
    { num: 9, label: '9월', labelEn: 'September' },
    { num: 10, label: '10월', labelEn: 'October' },
    { num: 11, label: '11월', labelEn: 'November' },
    { num: 12, label: '12월', labelEn: 'December' },
  ];

  // Chart dimensions
  const width = 700;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...monthlyActivityData.map(d => Math.max(d.buyerRegistrations, d.activityLogs)));
  const yScale = (val: number) => chartHeight - (val / maxValue) * chartHeight + padding.top;
  const xScale = (index: number) => (index / (monthlyActivityData.length - 1)) * chartWidth + padding.left;

  // Create smooth curve path
  const createPath = (data: number[]) => {
    return data
      .map((val, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(val)}`)
      .join(' ');
  };

  const buyerPath = createPath(monthlyActivityData.map(d => d.buyerRegistrations));
  const activityPath = createPath(monthlyActivityData.map(d => d.activityLogs));

  // Create area fill path
  const createAreaPath = (data: number[]) => {
    const linePath = createPath(data);
    return `${linePath} L ${xScale(data.length - 1)} ${yScale(0)} L ${xScale(0)} ${yScale(0)} Z`;
  };

  const totalBuyers = monthlyActivityData.reduce((sum, d) => sum + d.buyerRegistrations, 0);
  const totalActivities = monthlyActivityData.reduce((sum, d) => sum + d.activityLogs, 0);

  return (
    <div className="dashboard-card">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-7 h-7 rounded-full bg-chart-2/20 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-chart-2" />
        </div>
        <h3 className="font-semibold text-foreground">Monthly Activity Status</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Month selector */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setSelectedYear(selectedYear - 1)} className="p-1 hover:bg-muted rounded">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-lg font-semibold">{selectedYear}</span>
            <button onClick={() => setSelectedYear(selectedYear + 1)} className="p-1 hover:bg-muted rounded">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {months.map((month) => (
              <button
                key={month.num}
                onClick={() => setSelectedMonth(month.num)}
                className={`p-3 rounded-lg border transition-all text-left ${
                  selectedMonth === month.num
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{month.label}</div>
                    <div className="text-xs text-muted-foreground">{month.labelEn}</div>
                  </div>
                  <span className="text-lg">{monthIcons[month.num - 1]}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Area chart */}
        <div>
          {/* Legend */}
          <div className="flex items-center justify-end gap-6 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-primary"></span>
              <span className="text-muted-foreground">바이어 기업 등록 : {totalBuyers}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-chart-2"></span>
              <span className="text-muted-foreground">영업활동일지 등록 : {totalActivities}</span>
            </div>
          </div>

          {/* Chart */}
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48">
            {/* Y-axis labels */}
            {[0, 20, 40, 60, 80, 100, 120].map((val) => (
              <g key={val}>
                <text
                  x={padding.left - 10}
                  y={yScale(val)}
                  className="text-[10px] fill-muted-foreground"
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {val}
                </text>
                <line
                  x1={padding.left}
                  y1={yScale(val)}
                  x2={width - padding.right}
                  y2={yScale(val)}
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                  opacity="0.5"
                />
              </g>
            ))}

            {/* Area fills */}
            <path
              d={createAreaPath(monthlyActivityData.map(d => d.activityLogs))}
              fill="hsl(var(--chart-2))"
              opacity="0.2"
            />
            <path
              d={createAreaPath(monthlyActivityData.map(d => d.buyerRegistrations))}
              fill="hsl(var(--primary))"
              opacity="0.2"
            />

            {/* Lines */}
            <path d={activityPath} fill="none" stroke="hsl(var(--chart-2))" strokeWidth="2" />
            <path d={buyerPath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />

            {/* X-axis labels */}
            {monthlyActivityData.map((d, i) => (
              <text
                key={i}
                x={xScale(i)}
                y={height - 10}
                className="text-[10px] fill-muted-foreground"
                textAnchor="middle"
              >
                {d.month}
              </text>
            ))}
          </svg>

          {/* Data table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-t border-border">
                  <td className="py-2 pr-4">
                    <span className="w-2 h-2 rounded bg-primary inline-block mr-2"></span>
                  </td>
                  {monthlyActivityData.map((d, i) => (
                    <td key={i} className="py-2 px-1 text-center text-muted-foreground">
                      {d.buyerRegistrations}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="py-2 pr-4">
                    <span className="w-2 h-2 rounded bg-chart-2 inline-block mr-2"></span>
                  </td>
                  {monthlyActivityData.map((d, i) => (
                    <td key={i} className="py-2 px-1 text-center text-muted-foreground">
                      {d.activityLogs}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyActivityCard;
