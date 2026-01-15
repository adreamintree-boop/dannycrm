import React from 'react';
import { Paperclip, UserPlus, Link2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EmailListItemProps {
  id: string;
  senderName: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
  isSelected: boolean;
  hasAttachment?: boolean;
  crmLinked?: boolean;
  crmBuyerName?: string | null;
  onClick: () => void;
  onSelect: (checked: boolean) => void;
  onAddToCrm?: () => void;
}

const EmailListItem: React.FC<EmailListItemProps> = ({
  id,
  senderName,
  subject,
  snippet,
  date,
  isUnread,
  isSelected,
  hasAttachment = false,
  crmLinked = false,
  crmBuyerName = null,
  onClick,
  onSelect,
  onAddToCrm,
}) => {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return format(d, 'M월 d일', { locale: ko });
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleAddToCrmClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCrm?.();
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border/50 bg-white group',
        'hover:bg-gray-50',
        isSelected && 'bg-blue-50'
      )}
    >
      {/* Checkbox */}
      <div onClick={handleCheckboxClick}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(checked as boolean)}
          className="data-[state=checked]:bg-primary"
        />
      </div>

      {/* Sender name - always bold */}
      <div className="w-36 shrink-0">
        <span className="text-sm font-semibold text-foreground truncate block">
          {senderName}
        </span>
      </div>

      {/* Subject and snippet */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {hasAttachment && (
          <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
        {/* Subject - bold only when unread */}
        <span className={cn(
          'text-sm shrink-0',
          isUnread ? 'font-semibold text-foreground' : 'font-normal text-foreground'
        )}>
          {subject}
        </span>
        {/* Snippet - always normal weight */}
        <span className="text-sm font-normal text-muted-foreground truncate">
          {snippet}
        </span>
      </div>

      {/* CRM Status Badge */}
      <div className="shrink-0 flex items-center gap-2">
        {crmLinked ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-xs gap-1 bg-green-100 text-green-700 hover:bg-green-100">
                  <Link2 className="w-3 h-3" />
                  Linked
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{crmBuyerName || 'CRM에 연결됨'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <>
            <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
              Unassigned
            </Badge>
            {onAddToCrm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddToCrmClick}
                className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                CRM
              </Button>
            )}
          </>
        )}
      </div>

      {/* Date */}
      <div className="text-sm font-normal text-muted-foreground whitespace-nowrap shrink-0">
        {formatDate(date)}
      </div>
    </div>
  );
};

export default EmailListItem;
