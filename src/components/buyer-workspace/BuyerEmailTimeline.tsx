import React from 'react';
import { Mail, ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SalesActivityLog } from '@/hooks/useSalesActivityLogs';
import { format } from 'date-fns';

interface BuyerEmailTimelineProps {
  logs: SalesActivityLog[];
  loading: boolean;
  selectedId: string | null;
  onSelectEmail: (log: SalesActivityLog) => void;
}

const BuyerEmailTimeline: React.FC<BuyerEmailTimelineProps> = ({
  logs,
  loading,
  selectedId,
  onSelectEmail
}) => {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No emails found for this buyer</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y divide-border">
        {logs.map((log) => {
          const isSelected = log.id === selectedId;
          const isInbound = log.direction === 'inbound';
          
          return (
            <div
              key={log.id}
              onClick={() => onSelectEmail(log)}
              className={`p-3 cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-primary/10 border-l-2 border-l-primary'
                  : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Direction icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isInbound ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                }`}>
                  {isInbound ? (
                    <ArrowDownLeft className="w-4 h-4" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Subject */}
                  <p className="text-sm font-medium text-foreground truncate">
                    {log.title || '(No subject)'}
                  </p>
                  
                  {/* Date */}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(log.occurred_at), 'yyyy. MM. dd a h:mm', { locale: undefined })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default BuyerEmailTimeline;
