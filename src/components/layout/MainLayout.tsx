import React from 'react';
import TopHeader from './TopHeader';
import Sidebar from './Sidebar';
import TabNav from './TabNav';
import { useApp } from '@/context/AppContext';
import Dashboard from '@/pages/Dashboard';
import CustomerFunnel from '@/pages/CustomerFunnel';
import MoveHistory from '@/pages/MoveHistory';
import DataBoard from '@/pages/DataBoard';

const MainContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <>
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'funnel' && <CustomerFunnel />}
      {activeTab === 'history' && <MoveHistory />}
      {activeTab === 'databoard' && <DataBoard />}
    </>
  );
};

const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopHeader />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TabNav />
          <main className="flex-1 overflow-auto p-6">
            <MainContent />
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
