import React from 'react';
import { FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import ProfileDropdown from './ProfileDropdown';

const TopHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || !location.pathname.startsWith('/bl-search');
    }
    return location.pathname.startsWith(path);
  };

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
        <span 
          className={`nav-pill cursor-pointer ${isActive('/') ? 'nav-pill-active' : 'nav-pill-inactive'}`}
          onClick={() => navigate('/')}
        >
          TaaS CRM
        </span>
        <span 
          className={`nav-pill cursor-pointer flex items-center gap-1.5 ${isActive('/bl-search') ? 'nav-pill-active' : 'nav-pill-inactive'}`}
          onClick={() => navigate('/bl-search')}
        >
          <Search className="w-3.5 h-3.5" />
          B/L Search
        </span>
        <span className="nav-pill nav-pill-inactive cursor-pointer">Trade Tips</span>
        <span className="nav-pill nav-pill-inactive cursor-pointer">FAQ</span>
      </nav>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/strategy')}>
          <FileText className="w-4 h-4" />
          Strategy
        </Button>
        <ProfileDropdown />
      </div>
    </header>
  );
};

export default TopHeader;
