import React from 'react';
import { FileText, Search, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import ProfileDropdown from './ProfileDropdown';
import taasHeaderLogo from '@/assets/taas-header-logo.png';

const TopHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || 
        (!location.pathname.startsWith('/bl-search') && 
         !location.pathname.startsWith('/email'));
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-50">
      {/* Left: Logo */}
      <img 
        src={taasHeaderLogo} 
        alt="TaaS Logo" 
        className="h-[50px] w-auto"
      />

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
        <span 
          className={`nav-pill cursor-pointer flex items-center gap-1.5 ${isActive('/email') ? 'nav-pill-active' : 'nav-pill-inactive'}`}
          onClick={() => navigate('/email')}
        >
          <Mail className="w-3.5 h-3.5" />
          Email
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
