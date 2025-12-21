import React from 'react';
import { LayoutDashboard, BarChart3, Clock, FileText } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const tabs = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'funnel' as const, label: 'Customer Funnel', icon: BarChart3 },
  { id: 'history' as const, label: 'Move History', icon: Clock },
  { id: 'databoard' as const, label: 'Data Board', icon: FileText },
];

const TabNav: React.FC = () => {
  const { activeTab, setActiveTab, projects, activeProjectId } = useApp();
  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-6 py-0">
      <nav className="flex items-center gap-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
      
      {activeProject && (
        <div className="text-right">
          <span className="text-lg font-semibold text-foreground">{activeProject.name}</span>
        </div>
      )}
    </div>
  );
};

export default TabNav;
