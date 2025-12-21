import React from 'react';
import { Award, Users } from 'lucide-react';
import { Buyer } from '@/data/mockData';

interface TopBuyersCardProps {
  buyers: Buyer[];
}

const TopBuyersCard: React.FC<TopBuyersCardProps> = ({ buyers }) => {
  // Sort by activity count and take top 10
  const topBuyers = [...buyers]
    .sort((a, b) => b.activityCount - a.activityCount)
    .slice(0, 10);

  const maxActivity = topBuyers.length > 0 ? topBuyers[0].activityCount : 1;

  const getStatusBadge = (status: Buyer['status']) => {
    const styles = {
      list: 'bg-status-list-bg text-status-list',
      lead: 'bg-status-lead-bg text-status-lead',
      target: 'bg-status-target-bg text-status-target',
      client: 'bg-status-client-bg text-status-client',
    };
    const labels = {
      list: 'List',
      lead: 'Lead',
      target: 'Target',
      client: 'Client',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="dashboard-card">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
          <Award className="w-4 h-4 text-accent" />
        </div>
        <h3 className="font-semibold text-foreground">Top 10 Buyer by Sales Activity</h3>
      </div>

      <div className="space-y-3">
        {topBuyers.map((buyer, index) => (
          <div key={buyer.id} className="flex items-center gap-3">
            {getStatusBadge(buyer.status)}
            <span className="text-sm text-foreground flex-1 truncate" title={buyer.name}>
              {buyer.name}
            </span>
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(buyer.activityCount / maxActivity) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-foreground w-8 text-right">
                {buyer.activityCount}
              </span>
            </div>
          </div>
        ))}

        {topBuyers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground text-center">
              아직 데이터가 없습니다.
            </p>
            <p className="text-xs text-muted-foreground/70 text-center mt-1">
              B/L Search를 통해 잠재 바이어를 추가해보세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopBuyersCard;
