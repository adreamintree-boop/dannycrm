import React from 'react';
import { useApp } from '@/context/AppContext';
import BuyerOverviewCard from '@/components/dashboard/BuyerOverviewCard';
import SalesActivityCard from '@/components/dashboard/SalesActivityCard';
import BehaviorIndexCard from '@/components/dashboard/BehaviorIndexCard';
import TopBuyersCard from '@/components/dashboard/TopBuyersCard';
import MapCard from '@/components/dashboard/MapCard';
import AlertLevelsCard from '@/components/dashboard/AlertLevelsCard';
import MonthlyActivityCard from '@/components/dashboard/MonthlyActivityCard';

const Dashboard: React.FC = () => {
  const { getProjectBuyers } = useApp();
  const buyers = getProjectBuyers();

  const statusCounts = {
    list: buyers.filter(b => b.status === 'list').length,
    lead: buyers.filter(b => b.status === 'lead').length,
    target: buyers.filter(b => b.status === 'target').length,
    client: buyers.filter(b => b.status === 'client').length,
  };
  const total = buyers.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top row - 3 cards: 2 narrow + 1 wide */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <BuyerOverviewCard statusCounts={statusCounts} total={total} />
        <SalesActivityCard />
        <div className="lg:col-span-2">
          <BehaviorIndexCard />
        </div>
      </div>

      {/* Middle row - 2 cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopBuyersCard buyers={buyers} />
        <MapCard buyers={buyers} />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertLevelsCard />
        <div /> {/* Placeholder for layout balance */}
      </div>

      {/* Monthly Activity - full width */}
      <MonthlyActivityCard />
    </div>
  );
};

export default Dashboard;
