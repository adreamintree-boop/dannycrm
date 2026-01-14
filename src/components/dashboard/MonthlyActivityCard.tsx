import React from 'react';
import { BarChart3, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useMonthlyActivity } from '@/hooks/useMonthlyActivity';
import { Skeleton } from '@/components/ui/skeleton';

const monthIcons = ['❄️', '❄️', '🌸', '🌷', '🌻', '🌿', '🍉', '☀️', '🍂', '🎃', '🍁', '🎄'];

const MonthlyActivityCard: React.FC = () => {
  const {
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
  } = useMonthlyActivity();

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

  const maxValue = Math.max(
    ...monthlyData.map(d => Math.max(d.buyerRegistrations, d.salesLogs, d.emailSent, d.emailReceived)),
    1
  );
  const yScale = (val: number) => chartHeight - (val / maxValue) * chartHeight + padding.top;
  const xScale = (index: number) => (index / (monthlyData.length - 1)) * chartWidth + padding.left;

  // Create smooth curve path
  const createPath = (data: number[]) => {
    return data
      .map((val, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(val)}`)
      .join(' ');
  };

  const buyerPath = createPath(monthlyData.map(d => d.buyerRegistrations));
  const salesLogPath = createPath(monthlyData.map(d => d.salesLogs));
  const emailSentPath = createPath(monthlyData.map(d => d.emailSent));
  const emailReceivedPath = createPath(monthlyData.map(d => d.emailReceived));

  // Create area fill path
  const createAreaPath = (data: number[]) => {
    const linePath = createPath(data);
    return `${linePath} L ${xScale(data.length - 1)} ${yScale(0)} L ${xScale(0)} ${yScale(0)} Z`;
  };

  // Generate Y-axis labels dynamically
  const yAxisLabels = (() => {
    const step = Math.ceil(maxValue / 5);
    const labels = [];
    for (let i = 0; i <= maxValue; i += step) {
      labels.push(i);
    }
    if (labels[labels.length - 1] < maxValue) {
      labels.push(Math.ceil(maxValue));
    }
    return labels;
  })();

  if (loading) {
    return (
      <div className="dashboard-card">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="w-7 h-7 rounded-full" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

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
            <button onClick={goToPreviousYear} className="p-1 hover:bg-muted rounded">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-lg font-semibold">{year}</span>
            <button 
              onClick={goToNextYear} 
              className={`p-1 rounded ${canGoNext ? 'hover:bg-muted' : 'opacity-40 cursor-not-allowed'}`}
              disabled={!canGoNext}
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {months.map((m) => (
              <button
                key={m.num}
                onClick={() => setMonth(m.num)}
                className={`p-3 rounded-lg border transition-all text-left ${
                  month === m.num
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{m.label}</div>
                    <div className="text-xs text-muted-foreground">{m.labelEn}</div>
                  </div>
                  <span className="text-lg">{monthIcons[m.num - 1]}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Area chart or empty state */}
        <div>
          {!hasData ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <Calendar className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground text-center">
                아직 데이터가 없습니다.
              </p>
              <p className="text-xs text-muted-foreground/70 text-center mt-1">
                바이어 등록 및 영업 활동이 기록되면 차트가 표시됩니다.
              </p>
            </div>
          ) : (
            <>
              {/* Legend */}
              <div className="flex flex-wrap items-center justify-end gap-4 mb-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-primary"></span>
                  <span className="text-muted-foreground">바이어 등록: {totals.buyerRegistrations}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-chart-2"></span>
                  <span className="text-muted-foreground">영업활동일지: {totals.salesLogs}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-chart-3"></span>
                  <span className="text-muted-foreground">이메일 발신: {totals.emailSent}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-chart-4"></span>
                  <span className="text-muted-foreground">이메일 수신: {totals.emailReceived}</span>
                </div>
              </div>

              {/* Chart */}
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48">
                {/* Y-axis labels */}
                {yAxisLabels.map((val) => (
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
                  d={createAreaPath(monthlyData.map(d => d.salesLogs))}
                  fill="hsl(var(--chart-2))"
                  opacity="0.15"
                />
                <path
                  d={createAreaPath(monthlyData.map(d => d.buyerRegistrations))}
                  fill="hsl(var(--primary))"
                  opacity="0.15"
                />

                {/* Lines */}
                <path d={salesLogPath} fill="none" stroke="hsl(var(--chart-2))" strokeWidth="2" />
                <path d={buyerPath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
                <path d={emailSentPath} fill="none" stroke="hsl(var(--chart-3))" strokeWidth="2" />
                <path d={emailReceivedPath} fill="none" stroke="hsl(var(--chart-4))" strokeWidth="2" />

                {/* X-axis labels */}
                {monthlyData.map((d, i) => (
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
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-t border-border">
                      <td className="py-1.5 pr-2">
                        <span className="w-2 h-2 rounded bg-primary inline-block"></span>
                      </td>
                      {monthlyData.map((d, i) => (
                        <td key={i} className="py-1.5 px-0.5 text-center text-muted-foreground">
                          {d.buyerRegistrations}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-border">
                      <td className="py-1.5 pr-2">
                        <span className="w-2 h-2 rounded bg-chart-2 inline-block"></span>
                      </td>
                      {monthlyData.map((d, i) => (
                        <td key={i} className="py-1.5 px-0.5 text-center text-muted-foreground">
                          {d.salesLogs}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-border">
                      <td className="py-1.5 pr-2">
                        <span className="w-2 h-2 rounded bg-chart-3 inline-block"></span>
                      </td>
                      {monthlyData.map((d, i) => (
                        <td key={i} className="py-1.5 px-0.5 text-center text-muted-foreground">
                          {d.emailSent}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-border">
                      <td className="py-1.5 pr-2">
                        <span className="w-2 h-2 rounded bg-chart-4 inline-block"></span>
                      </td>
                      {monthlyData.map((d, i) => (
                        <td key={i} className="py-1.5 px-0.5 text-center text-muted-foreground">
                          {d.emailReceived}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyActivityCard;
