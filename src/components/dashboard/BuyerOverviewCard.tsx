import React from 'react';
import { Users } from 'lucide-react';

interface BuyerOverviewCardProps {
  statusCounts: {
    list: number;
    lead: number;
    target: number;
    client: number;
  };
  total: number;
}

const BuyerOverviewCard: React.FC<BuyerOverviewCardProps> = ({ statusCounts, total }) => {
  const percentages = {
    list: total > 0 ? ((statusCounts.list / total) * 100).toFixed(1) : '0',
    lead: total > 0 ? ((statusCounts.lead / total) * 100).toFixed(1) : '0',
    target: total > 0 ? ((statusCounts.target / total) * 100).toFixed(1) : '0',
    client: total > 0 ? ((statusCounts.client / total) * 100).toFixed(1) : '0',
  };

  // Calculate gauge value (example: based on client ratio or total score)
  const gaugeValue = total > 0 ? Math.round((statusCounts.client / total) * 100 + (statusCounts.target / total) * 50 + (statusCounts.lead / total) * 25 + (statusCounts.list / total) * 10) : 0;

  return (
    <div className="dashboard-card bg-gradient-to-br from-primary to-blue-600 text-primary-foreground">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
          <Users className="w-4 h-4" />
        </div>
        <h3 className="font-semibold">Buyer Company Overview</h3>
      </div>

      {/* Gauge visualization */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-32 h-32">
          {/* Outer ring */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="8"
              strokeDasharray={`${gaugeValue * 2.51} 251`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold">{total}</span>
          </div>
        </div>
        <span className="text-sm opacity-80 mt-2">0% vs last month</span>
      </div>

      {/* Status legend */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-list"></span>
            <span>List</span>
          </div>
          <div className="flex gap-4">
            <span className="w-12 text-right">{statusCounts.list}</span>
            <span className="w-16 text-right opacity-80">{percentages.list}%</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span>Lead</span>
          </div>
          <div className="flex gap-4">
            <span className="w-12 text-right">{statusCounts.lead}</span>
            <span className="w-16 text-right opacity-80">{percentages.lead}%</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-target"></span>
            <span>Target</span>
          </div>
          <div className="flex gap-4">
            <span className="w-12 text-right">{statusCounts.target}</span>
            <span className="w-16 text-right opacity-80">{percentages.target}%</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-client"></span>
            <span>Client</span>
          </div>
          <div className="flex gap-4">
            <span className="w-12 text-right">{statusCounts.client}</span>
            <span className="w-16 text-right opacity-80">{percentages.client}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyerOverviewCard;
