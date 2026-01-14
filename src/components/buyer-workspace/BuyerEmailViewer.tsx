import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Mail } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { SalesActivityLog } from '@/hooks/useSalesActivityLogs';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface BuyerEmailViewerProps {
  log: SalesActivityLog | null;
  buyerName: string;
}

interface EmailDetails {
  from_email: string | null;
  to_emails: string[] | null;
  cc_emails: string[] | null;
  body_html: string | null;
  body_text: string | null;
  snippet: string | null;
}

const BuyerEmailViewer: React.FC<BuyerEmailViewerProps> = ({ log, buyerName }) => {
  const [emailDetails, setEmailDetails] = useState<EmailDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!log) {
      setEmailDetails(null);
      return;
    }

    const fetchEmailDetails = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('sales_activity_logs')
          .select('from_email, to_emails, cc_emails, body_html, body_text, snippet')
          .eq('id', log.id)
          .single();

        if (error) throw error;
        
        setEmailDetails({
          from_email: data.from_email,
          to_emails: data.to_emails as string[] | null,
          cc_emails: data.cc_emails as string[] | null,
          body_html: data.body_html,
          body_text: data.body_text,
          snippet: data.snippet
        });
      } catch (error) {
        console.error('Failed to fetch email details:', error);
        setEmailDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEmailDetails();
  }, [log]);

  if (!log) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select an email to view its contents</p>
        </div>
      </div>
    );
  }

  const isInbound = log.direction === 'inbound';
  const displayBody = emailDetails?.body_html || emailDetails?.body_text || log.content || emailDetails?.snippet || '';

  const formatEmails = (emails: string[] | null): string => {
    if (!emails || emails.length === 0) return '-';
    return emails.join(', ');
  };

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-6">
        {/* Email Header */}
        <div className="space-y-4">
          {/* Subject + Badge */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className={isInbound ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}
              >
                {isInbound ? '받은메일' : '보낸메일'}
              </Badge>
              <h2 className="text-lg font-semibold text-foreground">
                {log.title || '(No subject)'}
              </h2>
            </div>
            <span className="text-sm text-muted-foreground shrink-0">
              {format(new Date(log.occurred_at), 'yyyy. MM. dd a h:mm')}
            </span>
          </div>

          {/* Email metadata */}
          <div className="space-y-2 text-sm">
            <div className="flex">
              <span className="w-20 text-muted-foreground shrink-0">보낸 사람</span>
              <span className="text-foreground font-medium">
                {emailDetails?.from_email || '-'}
              </span>
            </div>
            <div className="flex">
              <span className="w-20 text-muted-foreground shrink-0">받는 사람</span>
              <span className="text-foreground">
                {formatEmails(emailDetails?.to_emails)}
              </span>
            </div>
            {emailDetails?.cc_emails && emailDetails.cc_emails.length > 0 && (
              <div className="flex">
                <span className="w-20 text-muted-foreground shrink-0">참조</span>
                <span className="text-foreground text-xs">
                  {formatEmails(emailDetails.cc_emails)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Email Body */}
        <div className="prose prose-sm max-w-none">
          {displayBody ? (
            emailDetails?.body_html ? (
              <div 
                dangerouslySetInnerHTML={{ __html: displayBody }}
                className="text-foreground"
              />
            ) : (
              <div className="whitespace-pre-wrap text-foreground">
                {displayBody}
              </div>
            )
          ) : (
            <p className="text-muted-foreground italic">
              이메일 원본을 불러올 수 없습니다.
            </p>
          )}
        </div>
      </div>
    </ScrollArea>
  );
};

export default BuyerEmailViewer;
