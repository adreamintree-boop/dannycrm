import React from 'react';
import { TrendingUp } from 'lucide-react';
import { salesActivitySummary } from '@/data/mockData';

const SalesActivityCard: React.FC = () => {
  const data = salesActivitySummary;

  return (
    <div className="dashboard-card">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-accent" />
        </div>
        <h3 className="font-semibold text-foreground">Sales Activity Overview</h3>
      </div>

      {/* Summary */}
      <div className="flex items-baseline gap-3 mb-6">
        <div className="flex items-center gap-1">
          <span className="text-xl text-muted-foreground">Σ</span>
          <span className="text-4xl font-bold text-foreground">{data.total}</span>
        </div>
        <span className="text-sm text-status-target">+{data.percentChange}% vs last month</span>
      </div>

      {/* Mini bar chart */}
      <div className="flex items-end gap-2 h-20 mb-6">
        {data.barData.map((value, index) => (
          <div
            key={index}
            className="flex-1 bg-primary/20 rounded-t"
            style={{ height: `${(value / Math.max(...data.barData)) * 100}%` }}
          >
            <div
              className="w-full bg-primary rounded-t transition-all"
              style={{ height: `${(value / Math.max(...data.barData)) * 100}%` }}
            />
          </div>
        ))}
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-muted-foreground mb-4">
        <span>1</span>
        <span>5</span>
        <span>10</span>
        <span>15</span>
        <span>20</span>
        <span>25</span>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-4 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Pre-sales</div>
          <div className="text-lg font-semibold text-foreground">{data.preSales}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Inquiry</div>
          <div className="text-lg font-semibold text-foreground">{data.inquiry}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">RFQ</div>
          <div className="text-lg font-semibold text-foreground">{data.rfq}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Quotation</div>
          <div className="text-lg font-semibold text-foreground">{data.quotation}</div>
        </div>
      </div>
    </div>
  );
};

export default SalesActivityCard;
