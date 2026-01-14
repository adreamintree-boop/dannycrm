import React from 'react';
import { Users, UserPlus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface BuyerOverviewCardProps {
  statusCounts: {
    list: number;
    lead: number;
    target: number;
    client: number;
  };
  total: number;
  isLoading?: boolean;
}

// Stage colors matching the reference design
const STAGE_COLORS = {
  list: '#F5A623',    // Yellow/Orange
  lead: '#4A90D9',    // Blue
  target: '#7ED321',  // Green
  client: '#D0021B',  // Red
};

const STAGE_LABELS = {
  list: 'List',
  lead: 'Lead',
  target: 'Target',
  client: 'Client',
};

const BuyerOverviewCard: React.FC<BuyerOverviewCardProps> = ({ 
  statusCounts, 
  total,
  isLoading = false 
}) => {
  const percentages = {
    list: total > 0 ? ((statusCounts.list / total) * 100).toFixed(1) : '0.0',
    lead: total > 0 ? ((statusCounts.lead / total) * 100).toFixed(1) : '0.0',
    target: total > 0 ? ((statusCounts.target / total) * 100).toFixed(1) : '0.0',
    client: total > 0 ? ((statusCounts.client / total) * 100).toFixed(1) : '0.0',
  };

  const hasData = total > 0;

  // Prepare data for the half-donut chart (order: list, lead, target, client)
  const chartData = [
    { name: 'list', value: statusCounts.list, color: STAGE_COLORS.list },
    { name: 'lead', value: statusCounts.lead, color: STAGE_COLORS.lead },
    { name: 'target', value: statusCounts.target, color: STAGE_COLORS.target },
    { name: 'client', value: statusCounts.client, color: STAGE_COLORS.client },
  ].filter(item => item.value > 0);

  // Empty state data for the grey arc
  const emptyChartData = [{ name: 'empty', value: 1, color: 'rgba(255,255,255,0.2)' }];

  if (isLoading) {
    return (
      <div className="rounded-xl p-5 bg-gradient-to-br from-[#2563EB] to-[#1E40AF]">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="w-7 h-7 rounded-full bg-white/20" />
          <Skeleton className="h-5 w-40 bg-white/20" />
        </div>
        <div className="flex flex-col items-center mb-6">
          <Skeleton className="w-40 h-20 rounded-lg bg-white/20" />
          <Skeleton className="h-4 w-24 mt-4 bg-white/20" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-5 w-full bg-white/20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5 bg-gradient-to-br from-[#2563EB] to-[#1E40AF] text-white">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
          <Users className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-white">Buyer Company Overview</h3>
      </div>

      {/* Half-donut chart */}
      <div className="flex flex-col items-center mb-2">
        <div className="relative w-full h-28">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={hasData ? chartData : emptyChartData}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius="55%"
                outerRadius="95%"
                paddingAngle={hasData && chartData.length > 1 ? 2 : 0}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {(hasData ? chartData : emptyChartData).map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    stroke="none"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center pb-1">
            <span className="text-4xl font-bold text-white">{total}</span>
          </div>
        </div>
        {/* vs last month text */}
        <div className="flex items-center gap-1 mt-1">
          <span className="text-emerald-300 text-sm font-medium">0%</span>
          <span className="text-white/70 text-sm">vs last month</span>
        </div>
      </div>

      {/* Legend / Status list */}
      <div className="space-y-2 mt-4">
        {(['list', 'lead', 'target', 'client'] as const).map((stage) => (
          <div key={stage} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: STAGE_COLORS[stage] }}
              />
              <span className="text-white font-medium">{STAGE_LABELS[stage]}</span>
            </div>
            <div className="flex gap-6">
              <span className="w-8 text-right font-medium text-white">
                {statusCounts[stage]}
              </span>
              <span className="w-12 text-right text-white/70">
                {percentages[stage]}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state message */}
      {!hasData && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="flex items-center gap-2 text-sm text-white/80">
            <UserPlus className="w-4 h-4" />
            <span>아직 등록된 바이어가 없습니다. B/L Search에서 바이어를 추가해보세요.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerOverviewCard;
