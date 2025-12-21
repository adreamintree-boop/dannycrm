import React, { useState } from 'react';
import { Star, FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmailMessage, useEmailContext } from '@/context/EmailContext';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  const { logEmailToCRM } = useEmailContext();
  const [loggingIds, setLoggingIds] = useState<Set<string>>(new Set());

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

  const handleLogToCRM = async (e: React.MouseEvent, msgId: string) => {
    e.stopPropagation();
    setLoggingIds(prev => new Set(prev).add(msgId));
    await logEmailToCRM(msgId);
    setLoggingIds(prev => {
      const next = new Set(prev);
      next.delete(msgId);
      return next;
    });
  };

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

  // Only show CRM log button for inbox and sent mailboxes
  const showCRMButton = mailbox === 'inbox' || mailbox === 'sent' || mailbox === 'all';

  return (
    <div className="divide-y divide-border">
      {filteredMessages.map((msg) => {
        const displayName = msg.mailbox === 'sent' || msg.mailbox === 'draft'
          ? msg.to_emails[0] || '(수신자 없음)'
          : msg.from_name || msg.from_email;

        const isLogging = loggingIds.has(msg.id);

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
                {msg.is_logged_to_crm && (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                    <Check className="w-3 h-3" />
                    CRM
                  </span>
                )}
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

            <div className="flex items-center gap-2">
              {showCRMButton && (msg.mailbox === 'inbox' || msg.mailbox === 'sent') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleLogToCRM(e, msg.id)}
                      disabled={msg.is_logged_to_crm || isLogging}
                      className={cn(
                        'h-7 px-2 text-xs gap-1',
                        msg.is_logged_to_crm && 'opacity-50'
                      )}
                    >
                      {isLogging ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : msg.is_logged_to_crm ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                      <span className="hidden sm:inline">
                        {msg.is_logged_to_crm ? '기록됨' : 'CRM 기록'}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {msg.is_logged_to_crm ? '이미 CRM에 저장됨' : 'CRM에 영업활동으로 기록'}
                  </TooltipContent>
                </Tooltip>
              )}

              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(msg.created_at)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EmailList;
