import React from 'react';
import { Paperclip } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface EmailListItemProps {
  id: string;
  senderName: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
  isSelected: boolean;
  hasAttachment?: boolean;
  onClick: () => void;
  onSelect: (checked: boolean) => void;
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
  onClick,
  onSelect,
}) => {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return format(d, 'M월 d일', { locale: ko });
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border/50',
        'hover:bg-muted/50',
        isSelected && 'bg-primary/5',
        isUnread && 'bg-blue-50/50'
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

      {/* Sender name */}
      <div className="w-36 shrink-0">
        <span className={cn(
          'text-sm truncate block',
          isUnread ? 'font-semibold text-foreground' : 'text-foreground'
        )}>
          {senderName}
        </span>
      </div>

      {/* Subject and snippet */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {hasAttachment && (
          <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
        <span className={cn(
          'text-sm shrink-0',
          isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground'
        )}>
          {subject}
        </span>
        <span className="text-sm text-muted-foreground truncate">
          {snippet}
        </span>
      </div>

      {/* Date */}
      <div className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
        {formatDate(date)}
      </div>
    </div>
  );
};

export default EmailListItem;
