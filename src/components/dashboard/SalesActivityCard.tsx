import React from 'react';
import { TrendingUp, FileBarChart } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const SalesActivityCard: React.FC = () => {
  const { activities, getProjectBuyers } = useApp();
  const buyers = getProjectBuyers();
  
  // Calculate real activity data from context
  const preSales = activities.filter(a => a.type === 'pre-sales').length;
  const inquiry = activities.filter(a => a.type === 'inquiry').length;
  const rfq = activities.filter(a => a.type === 'rfq').length;
  const quotation = activities.filter(a => a.type === 'quotation').length;
  const total = activities.length;
  
  // Empty bar data if no activities
  const hasData = total > 0;
  const barData = hasData ? [25, 5, 10, 15, 20, 25] : [0, 0, 0, 0, 0, 0];

  if (!hasData) {
    return (
      <div className="dashboard-card">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <h3 className="font-semibold text-foreground">Sales Activity Overview</h3>
        </div>

        <div className="flex flex-col items-center justify-center py-12">
          <FileBarChart className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground text-center">
            아직 데이터가 없습니다.
          </p>
          <p className="text-xs text-muted-foreground/70 text-center mt-1">
            바이어를 추가하고 영업 활동을 기록해보세요.
          </p>
        </div>
      </div>
    );
  }

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
          <span className="text-4xl font-bold text-foreground">{total}</span>
        </div>
        <span className="text-sm text-muted-foreground">활동 기록</span>
      </div>

      {/* Mini bar chart */}
      <div className="flex items-end gap-2 h-20 mb-6">
        {barData.map((value, index) => (
          <div
            key={index}
            className="flex-1 bg-primary/20 rounded-t"
            style={{ height: `${(value / Math.max(...barData, 1)) * 100}%` }}
          >
            <div
              className="w-full bg-primary rounded-t transition-all"
              style={{ height: `${(value / Math.max(...barData, 1)) * 100}%` }}
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
          <div className="text-lg font-semibold text-foreground">{preSales}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Inquiry</div>
          <div className="text-lg font-semibold text-foreground">{inquiry}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">RFQ</div>
          <div className="text-lg font-semibold text-foreground">{rfq}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Quotation</div>
          <div className="text-lg font-semibold text-foreground">{quotation}</div>
        </div>
      </div>
    </div>
  );
};

export default SalesActivityCard;
