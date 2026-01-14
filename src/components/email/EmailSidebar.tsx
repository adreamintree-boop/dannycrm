import React from 'react';
import { Inbox, Send, Mail, Trash2, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNylasEmailContext } from '@/context/NylasEmailContext';

interface EmailSidebarProps {
  unreadCount: number;
}

const menuItems = [
  { id: 'inbox', label: 'Inbox', icon: Inbox, path: '/email' },
  { id: 'sent', label: 'Sent', icon: Send, path: '/email/sent' },
  { id: 'all', label: 'All', icon: Mail, path: '/email/all' },
  { id: 'trash', label: 'Trash', icon: Trash2, path: '/email/trash' },
];

const EmailSidebar: React.FC<EmailSidebarProps> = ({ unreadCount }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { emailAccount, isConnected } = useNylasEmailContext();

  const isActive = (path: string, itemId: string) => {
    // Check if we're on a detail page with mailbox param
    const searchParams = new URLSearchParams(location.search);
    const mailboxParam = searchParams.get('mailbox');
    
    // If on detail page, use mailbox param
    if (location.pathname.match(/^\/email\/[^/]+$/) && !location.pathname.includes('compose') && !location.pathname.includes('settings')) {
      if (mailboxParam) {
        return mailboxParam === itemId;
      }
      // Default to inbox if no mailbox param
      return itemId === 'inbox';
    }
    
    // Normal path matching
    if (path === '/email') {
      return location.pathname === '/email' || location.pathname === '/email/';
    }
    return location.pathname.startsWith(path);
  };

  const displayEmail = isConnected && emailAccount?.email_address 
    ? emailAccount.email_address 
    : '이메일 미연동';

  return (
    <div className="w-52 border-r border-border bg-white flex flex-col h-full">
      {/* Email account selector */}
      <div className="p-3 border-b border-border">
        <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors">
          <span className="truncate text-left">{displayEmail}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
        </button>
      </div>

      {/* Compose button */}
      <div className="p-3">
        <Button 
          className="w-full font-medium" 
          onClick={() => navigate('/email/compose')}
        >
          Compose
        </Button>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 px-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path, item.id);
          const showBadge = item.id === 'inbox' && unreadCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-0.5',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className={cn('w-4 h-4', active && 'text-primary')} />
              <span className="flex-1 text-left">{item.label}</span>
              {showBadge && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="px-3 pb-4">
        <button
          onClick={() => navigate('/email/settings')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
            location.pathname === '/email/settings'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Settings className={cn('w-4 h-4', location.pathname === '/email/settings' && 'text-primary')} />
          <span className="flex-1 text-left">Setting</span>
        </button>
      </div>
    </div>
  );
};

export default EmailSidebar;
