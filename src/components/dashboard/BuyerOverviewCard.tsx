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

// Stage colors from CSS variables (HSL values)
const STAGE_COLORS = {
  list: 'hsl(45 93% 47%)',    // --status-list
  lead: 'hsl(214 89% 52%)',   // --status-lead
  target: 'hsl(142 71% 45%)', // --status-target
  client: 'hsl(0 84% 60%)',   // --status-client
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

  // Prepare data for the half-donut chart
  const chartData = [
    { name: 'list', value: statusCounts.list, color: STAGE_COLORS.list },
    { name: 'lead', value: statusCounts.lead, color: STAGE_COLORS.lead },
    { name: 'target', value: statusCounts.target, color: STAGE_COLORS.target },
    { name: 'client', value: statusCounts.client, color: STAGE_COLORS.client },
  ].filter(item => item.value > 0);

  // Empty state data for the grey arc
  const emptyChartData = [{ name: 'empty', value: 1, color: 'hsl(220 13% 91%)' }];

  if (isLoading) {
    return (
      <div className="dashboard-card">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="w-7 h-7 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex flex-col items-center mb-6">
          <Skeleton className="w-48 h-24 rounded-lg" />
          <Skeleton className="h-4 w-24 mt-4" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground">Buyer Company Overview</h3>
      </div>

      {/* Half-donut chart */}
      <div className="flex flex-col items-center mb-4">
        <div className="relative w-full h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={hasData ? chartData : emptyChartData}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius="60%"
                outerRadius="100%"
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
            <span className="text-3xl font-bold text-foreground">{total}</span>
            <span className="block text-xs text-muted-foreground">Total Buyers</span>
          </div>
        </div>
      </div>

      {/* Legend / Status list */}
      <div className="space-y-2 pt-2 border-t border-border">
        {(['list', 'lead', 'target', 'client'] as const).map((stage) => (
          <div key={stage} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: STAGE_COLORS[stage] }}
              />
              <span className="text-foreground font-medium">{STAGE_LABELS[stage]}</span>
            </div>
            <div className="flex gap-4">
              <span className="w-10 text-right font-medium text-foreground">
                {statusCounts[stage]}
              </span>
              <span className="w-14 text-right text-muted-foreground">
                {percentages[stage]}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state message */}
      {!hasData && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserPlus className="w-4 h-4" />
            <span>아직 등록된 바이어가 없습니다. B/L Search에서 바이어를 추가해보세요.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerOverviewCard;
