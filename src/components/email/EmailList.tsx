import React, { useState } from 'react';
import { Star, FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmailMessage, useEmailContext } from '@/context/EmailContext';
import { useNylasEmailContext } from '@/context/NylasEmailContext';
import { NylasMessage } from '@/hooks/useNylas';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import BuyerSelectModal from './BuyerSelectModal';

interface EmailListProps {
  messages: EmailMessage[];
  mailbox: string;
  loading: boolean;
  onToggleStar: (id: string) => void;
  searchQuery: string;
  // Nylas-specific props
  nylasMessages?: NylasMessage[];
  useNylas?: boolean;
}

const EmailList: React.FC<EmailListProps> = ({
  messages,
  mailbox,
  loading,
  onToggleStar,
  searchQuery,
  nylasMessages = [],
  useNylas = false,
}) => {
  const navigate = useNavigate();
  const { logEmailToCRM } = useEmailContext();
  const { logEmailToCRM: nylasLogToCRM } = useNylasEmailContext();
  const [loggingIds, setLoggingIds] = useState<Set<string>>(new Set());
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  // Filter messages based on search query
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

  const filteredNylasMessages = nylasMessages.filter((msg) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      msg.subject.toLowerCase().includes(query) ||
      msg.snippet.toLowerCase().includes(query) ||
      msg.from.email.toLowerCase().includes(query) ||
      msg.from.name?.toLowerCase().includes(query)
    );
  });

  const handleOpenBuyerModal = (e: React.MouseEvent, msgId: string) => {
    e.stopPropagation();
    setSelectedMessageId(msgId);
    setModalOpen(true);
  };

  const handleBuyerSelect = async (buyerId: string, companyName: string) => {
    if (!selectedMessageId) return;
    
    setLoggingIds(prev => new Set(prev).add(selectedMessageId));
    setModalOpen(false);
    
    if (useNylas) {
      const result = await nylasLogToCRM(selectedMessageId, buyerId);
      if (result.success) {
        setLoggedIds(prev => new Set(prev).add(selectedMessageId));
      }
    } else {
      await logEmailToCRM(selectedMessageId, buyerId, companyName);
    }
    
    setLoggingIds(prev => {
      const next = new Set(prev);
      next.delete(selectedMessageId);
      return next;
    });
    setSelectedMessageId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const displayMessages = useNylas ? filteredNylasMessages : filteredMessages;

  if (displayMessages.length === 0) {
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

  // Render Nylas messages
  if (useNylas) {
    return (
      <>
        <div className="divide-y divide-border">
          {filteredNylasMessages.map((msg) => {
            const isInbox = msg.folder.toLowerCase().includes('inbox');
            const displayName = isInbox
              ? msg.from.name || msg.from.email
              : msg.to[0]?.email || '(수신자 없음)';

            const isLogging = loggingIds.has(msg.id);
            const isLogged = loggedIds.has(msg.id);
            const canLogToCRM = showCRMButton;

            return (
              <div
                key={msg.id}
                onClick={() => navigate(`/email/${msg.id}?nylas=true`)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50',
                  msg.unread && 'bg-primary/5 font-medium'
                )}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Nylas star toggle would go here
                  }}
                  className="text-muted-foreground hover:text-yellow-500 transition-colors"
                >
                  <Star
                    className={cn(
                      'w-4 h-4',
                      msg.starred && 'fill-yellow-500 text-yellow-500'
                    )}
                  />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-sm truncate',
                      msg.unread && 'font-semibold text-foreground'
                    )}>
                      {displayName}
                    </span>
                    {isLogged && (
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                        <Check className="w-3 h-3" />
                        CRM
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-sm truncate',
                      msg.unread ? 'text-foreground' : 'text-muted-foreground'
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
                  {canLogToCRM && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleOpenBuyerModal(e, msg.id)}
                          disabled={isLogged || isLogging}
                          className={cn(
                            'h-7 px-2 text-xs gap-1',
                            isLogged && 'opacity-50'
                          )}
                        >
                          {isLogging ? (
                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : isLogged ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <FileText className="w-3 h-3" />
                          )}
                          <span className="hidden sm:inline">
                            {isLogged ? '기록됨' : 'CRM 기록'}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isLogged ? '이미 CRM에 저장됨' : '바이어 선택 후 CRM에 기록'}
                      </TooltipContent>
                    </Tooltip>
                  )}

                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(msg.date)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <BuyerSelectModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSelect={handleBuyerSelect}
          loading={loggingIds.size > 0}
        />
      </>
    );
  }

  // Render regular messages (mock data)
  return (
    <>
      <div className="divide-y divide-border">
        {filteredMessages.map((msg) => {
          const displayName = msg.mailbox === 'sent' || msg.mailbox === 'draft'
            ? msg.to_emails[0] || '(수신자 없음)'
            : msg.from_name || msg.from_email;

          const isLogging = loggingIds.has(msg.id);
          const canLogToCRM = showCRMButton && (msg.mailbox === 'inbox' || msg.mailbox === 'sent');

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
                {canLogToCRM && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleOpenBuyerModal(e, msg.id)}
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
                      {msg.is_logged_to_crm ? '이미 CRM에 저장됨' : '바이어 선택 후 CRM에 기록'}
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

      <BuyerSelectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSelect={handleBuyerSelect}
        loading={loggingIds.size > 0}
      />
    </>
  );
};

export default EmailList;
