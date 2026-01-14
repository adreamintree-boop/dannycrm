import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Reply, Forward, Trash2, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { useEmailContext, EmailMessage } from '@/context/EmailContext';
import { useNylasEmailContext } from '@/context/NylasEmailContext';
import { NylasMessageDetail } from '@/hooks/useNylas';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface LinkedBuyer {
  id: string;
  company_name: string;
  stage: string;
}

export default function EmailDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNylas = searchParams.get('nylas') === 'true';
  const mailbox = searchParams.get('mailbox') || 'inbox';
  
  // Regular email context
  const { getMessage, markAsRead, deleteMessage, logActivity } = useEmailContext();
  
  // Nylas context
  const { fetchMessage, isConnected } = useNylasEmailContext();
  
  const [message, setMessage] = useState<EmailMessage | null>(null);
  const [nylasMessage, setNylasMessage] = useState<NylasMessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkedBuyer, setLinkedBuyer] = useState<LinkedBuyer | null>(null);
  const [metadataExpanded, setMetadataExpanded] = useState(true);
  const hasLoggedRef = useRef(false);

  // Mailbox paths for navigation
  const mailboxPaths: Record<string, string> = {
    inbox: '/email',
    sent: '/email/sent',
    all: '/email/all',
    trash: '/email/trash',
    draft: '/email/drafts',
  };

  useEffect(() => {
    let isMounted = true;
    hasLoggedRef.current = false;

    const load = async () => {
      if (!id) {
        if (isMounted) setLoading(false);
        return;
      }

      setLoading(true);
      setMessage(null);
      setNylasMessage(null);
      setLinkedBuyer(null);

      try {
        if (isNylas) {
          if (!isConnected) return;
          const msg = await fetchMessage(id);
          if (!isMounted) return;

          if (msg) {
            setNylasMessage(msg);
            if (msg.is_logged_to_crm && msg.crm_buyer_id) {
              const { data: buyerData } = await supabase
                .from('crm_buyers')
                .select('id, company_name, stage')
                .eq('id', msg.crm_buyer_id)
                .maybeSingle();

              if (buyerData && isMounted) {
                setLinkedBuyer(buyerData);
              }
            }
          }
        } else {
          const msg = await getMessage(id);
          if (!isMounted) return;

          if (msg) {
            setMessage(msg);
            if (!msg.is_read) {
              markAsRead(id);
            }
            if (!hasLoggedRef.current) {
              hasLoggedRef.current = true;
              logActivity('open', id, msg.thread_id || undefined);
            }

            const { data: logData } = await supabase
              .from('sales_activity_logs')
              .select('buyer_id')
              .eq('email_message_id', id)
              .maybeSingle();

            if (logData?.buyer_id && isMounted) {
              const { data: buyerData } = await supabase
                .from('crm_buyers')
                .select('id, company_name, stage')
                .eq('id', logData.buyer_id)
                .maybeSingle();

              if (buyerData && isMounted) {
                setLinkedBuyer(buyerData);
              }
            }
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => { isMounted = false; };
  }, [id, isNylas, isConnected, fetchMessage, getMessage, markAsRead, logActivity]);

  const handleBack = () => {
    navigate(mailboxPaths[mailbox] || '/email');
  };

  const handleReply = () => {
    if (id) {
      const params = new URLSearchParams({ replyTo: id, mailbox });
      if (isNylas) params.set('nylas', 'true');
      if (linkedBuyer) {
        params.set('buyerId', linkedBuyer.id);
        params.set('buyerName', linkedBuyer.company_name);
        params.set('buyerStage', linkedBuyer.stage);
      }
      navigate(`/email/compose?${params.toString()}`);
    }
  };

  const handleForward = () => {
    if (id) {
      const params = new URLSearchParams({ forward: id, mailbox });
      if (isNylas) params.set('nylas', 'true');
      navigate(`/email/compose?${params.toString()}`);
    }
  };

  const handleDelete = async () => {
    if (id && !isNylas) {
      await deleteMessage(id);
      handleBack();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Get message data
  const msgData = isNylas ? nylasMessage : message;
  if (!msgData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-white">
        <p>메일을 찾을 수 없습니다</p>
        <Button variant="link" onClick={handleBack}>
          돌아가기
        </Button>
      </div>
    );
  }

  // Extract email data
  const subject = isNylas && nylasMessage ? nylasMessage.subject : message?.subject || '';
  const dateStr = isNylas && nylasMessage ? nylasMessage.date : message?.created_at || '';
  const fromName = isNylas && nylasMessage ? (nylasMessage.from.name || nylasMessage.from.email) : (message?.from_name || message?.from_email || '');
  const fromEmail = isNylas && nylasMessage ? nylasMessage.from.email : message?.from_email || '';
  const toEmails = isNylas && nylasMessage ? nylasMessage.to.map(t => `${t.name || ''} <${t.email}>`).join(', ') : message?.to_emails.join(', ') || '';
  const ccEmails = isNylas && nylasMessage ? nylasMessage.cc.map(t => t.email).join(', ') : message?.cc_emails?.join(', ') || '';
  const bodyHtml = isNylas && nylasMessage ? nylasMessage.body_html : null;
  const bodyText = isNylas && nylasMessage ? nylasMessage.body_text : message?.body || '';

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      {/* Top navigation bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>목록으로</span>
        </button>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>164개 중 16</span>
          <div className="flex items-center">
            <button className="p-1 hover:bg-muted rounded disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="p-1 hover:bg-muted rounded disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 py-4">
          {/* Subject */}
          <h1 className="text-lg font-semibold text-foreground mb-1">{subject}</h1>
          <div className="text-sm text-muted-foreground mb-4">
            {format(new Date(dateStr), 'yyyy. MM. dd a h:mm', { locale: ko })}
          </div>

          {/* Metadata block */}
          <div className="border-t border-border pt-4 mb-6">
            <button 
              onClick={() => setMetadataExpanded(!metadataExpanded)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-3"
            >
              <ChevronUp className={cn('w-4 h-4 transition-transform', !metadataExpanded && 'rotate-180')} />
            </button>
            
            {metadataExpanded && (
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="w-20 text-muted-foreground shrink-0">보낸 사람</span>
                  <span className="text-foreground font-medium">
                    {fromName} <span className="text-muted-foreground font-normal">&lt;{fromEmail}&gt;</span>
                  </span>
                </div>
                <div className="flex">
                  <span className="w-20 text-muted-foreground shrink-0">받는 사람</span>
                  <span className="text-foreground break-all">{toEmails}</span>
                </div>
                {ccEmails && (
                  <div className="flex">
                    <span className="w-20 text-muted-foreground shrink-0">참조</span>
                    <span className="text-muted-foreground break-all">{ccEmails}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email body */}
          <div className="border-t border-border pt-6">
            {bodyHtml ? (
              <div 
                className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            ) : (
              <div className="whitespace-pre-wrap text-foreground leading-relaxed text-sm">
                {bodyText}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-white">
        <div className="flex items-center gap-2">
          <Button onClick={handleReply} size="sm" className="gap-2">
            <Reply className="w-4 h-4" />
            답장
          </Button>
          <Button variant="outline" onClick={handleForward} size="sm" className="gap-2">
            <Forward className="w-4 h-4" />
            전달
          </Button>
        </div>
        
        <Button variant="ghost" size="sm" onClick={handleDelete} className="gap-2 text-muted-foreground hover:text-destructive">
          <Trash2 className="w-4 h-4" />
          삭제
        </Button>
      </div>
    </div>
  );
}
