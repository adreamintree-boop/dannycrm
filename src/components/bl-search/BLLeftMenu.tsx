import React from 'react';
import { Database, Users, TrendingUp, Ship, BarChart3, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

const menuItems: MenuItem[] = [
  { id: 'trade', icon: Database, label: '거래 데이터', active: true },
  { id: 'potential', icon: Users, label: '잠재 고객 데이터' },
  { id: 'customs', icon: FileText, label: '세관 데이터' },
  { id: 'shipping', icon: Ship, label: '배송 데이터' },
  { id: 'insights', icon: TrendingUp, label: '시장 인사이트' },
];

const BLLeftMenu: React.FC = () => {
  return (
    <div className="w-16 bg-card border-r border-border flex flex-col items-center py-4 gap-1">
      {menuItems.map((item) => (
        <button
          key={item.id}
          className={cn(
            "w-12 h-12 flex flex-col items-center justify-center rounded-lg transition-colors group",
            item.active 
              ? "bg-primary/10 text-primary" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title={item.label}
        >
          <item.icon className="w-5 h-5" />
          <span className="text-[9px] mt-1 font-medium text-center leading-tight max-w-[48px] truncate">
            {item.label.split(' ')[0]}
          </span>
        </button>
      ))}
    </div>
  );
};

export default BLLeftMenu;
