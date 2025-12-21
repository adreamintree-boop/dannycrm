import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmailMessage } from '@/context/EmailContext';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface EmailListProps {
  messages: EmailMessage[];
  mailbox: string;
  loading: boolean;
  onToggleStar: (id: string) => void;
  searchQuery: string;
}

const EmailList: React.FC<EmailListProps> = ({
  messages,
  mailbox,
  loading,
  onToggleStar,
  searchQuery,
}) => {
  const navigate = useNavigate();

  const filteredMessages = messages.filter((msg) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      msg.subject.toLowerCase().includes(query) ||
      msg.body.toLowerCase().includes(query) ||
      msg.from_email.toLowerCase().includes(query) ||
      msg.from_name?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (filteredMessages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>메일이 없습니다</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return format(date, 'a h:mm', { locale: ko });
    }
    return format(date, 'M월 d일', { locale: ko });
  };

  return (
    <div className="divide-y divide-border">
      {filteredMessages.map((msg) => {
        const displayName = mailbox === 'sent' || mailbox === 'draft'
          ? msg.to_emails[0] || '(수신자 없음)'
          : msg.from_name || msg.from_email;

        return (
          <div
            key={msg.id}
            onClick={() => navigate(`/email/${msg.id}`)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50',
              !msg.is_read && 'bg-primary/5 font-medium'
            )}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar(msg.id);
              }}
              className="text-muted-foreground hover:text-yellow-500 transition-colors"
            >
              <Star
                className={cn(
                  'w-4 h-4',
                  msg.is_starred && 'fill-yellow-500 text-yellow-500'
                )}
              />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-sm truncate',
                  !msg.is_read && 'font-semibold text-foreground'
                )}>
                  {displayName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-sm truncate',
                  !msg.is_read ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {msg.subject}
                </span>
                {msg.snippet && (
                  <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                    - {msg.snippet}
                  </span>
                )}
              </div>
            </div>

            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDate(msg.created_at)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EmailList;
