import React from 'react';
import { User, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TopHeader: React.FC = () => {
  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-50">
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">ts</span>
        </div>
        <span className="font-semibold text-foreground">taas</span>
      </div>

      {/* Center: Navigation */}
      <nav className="flex items-center gap-1">
        <span className="nav-pill nav-pill-active">TaaS CRM</span>
        <span className="nav-pill nav-pill-inactive cursor-pointer">Trade Tips</span>
        <span className="nav-pill nav-pill-inactive cursor-pointer">FAQ</span>
      </nav>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="w-4 h-4" />
          Strategy
        </Button>
        <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
          <User className="w-5 h-5 text-accent-foreground" />
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
