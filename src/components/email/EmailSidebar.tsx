import React from 'react';
import { Inbox, Send, FileEdit, Mail, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';

interface EmailSidebarProps {
  unreadCount: number;
}

const menuItems = [
  { id: 'inbox', label: '받은편지함', icon: Inbox, path: '/email' },
  { id: 'sent', label: '보낸편지함', icon: Send, path: '/email/sent' },
  { id: 'draft', label: '임시보관함', icon: FileEdit, path: '/email/drafts' },
  { id: 'all', label: '전체메일', icon: Mail, path: '/email/all' },
  { id: 'settings', label: '설정', icon: Settings, path: '/email/settings' },
];

const EmailSidebar: React.FC<EmailSidebarProps> = ({ unreadCount }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/email') {
      return location.pathname === '/email' || location.pathname === '/email/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="w-56 border-r border-border bg-card flex flex-col h-full">
      <div className="p-4">
        <Button 
          className="w-full gap-2" 
          onClick={() => navigate('/email/compose')}
        >
          <Plus className="w-4 h-4" />
          편지쓰기
        </Button>
      </div>

      <nav className="flex-1 px-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const showBadge = item.id === 'inbox' && unreadCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {showBadge && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default EmailSidebar;
