import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { X, Mail, ArrowUpRight, ArrowDownLeft, ExternalLink, Reply, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { supabase } from '@/integrations/supabase/client';

interface EmailMessage {
  id: string;
  subject: string;
  body: string;
  from_email: string;
  from_name: string | null;
  to_emails: string[];
  cc_emails: string[];
  bcc_emails: string[];
  direction: 'inbound' | 'outbound';
  is_logged_to_crm: boolean;
  created_at: string;
}

interface EmailDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  emailMessageId: string | null;
  buyerName?: string;
  buyerStage?: string;
}

export default function EmailDetailDrawer({
  open,
  onClose,
  emailMessageId,
  buyerName,
  buyerStage,
}: EmailDetailDrawerProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEmail() {
      if (!open || !emailMessageId) {
        setEmail(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('email_messages')
          .select('*')
          .eq('id', emailMessageId)
          .single();

        if (fetchError || !data) {
          setError('이메일 원본을 불러올 수 없습니다.');
        } else {
          const toEmails = Array.isArray(data.to_emails) 
            ? (data.to_emails as unknown as string[]) 
            : [];
          const ccEmails = Array.isArray(data.cc_emails) 
            ? (data.cc_emails as unknown as string[]) 
            : [];
          const bccEmails = Array.isArray(data.bcc_emails) 
            ? (data.bcc_emails as unknown as string[]) 
            : [];

          setEmail({
            id: data.id,
            subject: data.subject,
            body: data.body,
            from_email: data.from_email,
            from_name: data.from_name,
            to_emails: toEmails,
            cc_emails: ccEmails,
            bcc_emails: bccEmails,
            direction: data.direction as 'inbound' | 'outbound',
            is_logged_to_crm: data.is_logged_to_crm,
            created_at: data.created_at,
          });
        }
      } catch {
        setError('이메일 원본을 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchEmail();
  }, [open, emailMessageId]);

  const handleOpenInEmail = () => {
    if (emailMessageId) {
      navigate(`/email/${emailMessageId}`);
      onClose();
    }
  };

  const handleReply = () => {
    if (emailMessageId) {
      navigate(`/email/compose?replyTo=${emailMessageId}`);
      onClose();
    }
  };

  const stageColors: Record<string, string> = {
    list: 'bg-status-list text-white',
    lead: 'bg-status-lead text-white',
    target: 'bg-status-target text-white',
    client: 'bg-status-client text-white',
  };

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              이메일 상세
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="w-4 h-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="p-6 overflow-auto max-h-[calc(90vh-180px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{error}</p>
            </div>
          )}

          {email && !loading && !error && (
            <div className="space-y-6">
              {/* Header */}
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-foreground">{email.subject}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={
                      email.direction === 'inbound'
                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                        : 'bg-green-100 text-green-700 border-green-200'
                    }
                  >
                    {email.direction === 'inbound' ? (
                      <ArrowDownLeft className="w-3 h-3 mr-1" />
                    ) : (
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                    )}
                    {email.direction === 'inbound' ? '수신' : '발신'}
                  </Badge>
                  {email.is_logged_to_crm && (
                    <Badge className="bg-green-600 text-white">
                      <Check className="w-3 h-3 mr-1" />
                      CRM
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(email.created_at), 'yyyy년 M월 d일 (EEEE) a h:mm', { locale: ko })}
                  </span>
                </div>
              </div>

              {/* Meta Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20">보낸사람:</span>
                  <span className="text-foreground">
                    {email.from_name ? `${email.from_name} <${email.from_email}>` : email.from_email}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20">받는사람:</span>
                  <span className="text-foreground">{email.to_emails.join(', ')}</span>
                </div>
                {email.cc_emails.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-20">참조:</span>
                    <span className="text-foreground">{email.cc_emails.join(', ')}</span>
                  </div>
                )}
                {email.bcc_emails.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-20">숨은참조:</span>
                    <span className="text-foreground">{email.bcc_emails.join(', ')}</span>
                  </div>
                )}
                {buyerName && (
                  <div className="flex gap-2 items-center pt-2 border-t border-border mt-2">
                    <span className="text-muted-foreground w-20">관련 바이어:</span>
                    <span className="text-foreground font-medium">{buyerName}</span>
                    {buyerStage && (
                      <Badge className={stageColors[buyerStage] || 'bg-muted text-foreground'}>
                        {buyerStage.charAt(0).toUpperCase() + buyerStage.slice(1)}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="border border-border rounded-lg p-4">
                <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                  {email.body}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {email && !loading && !error && (
          <div className="border-t border-border p-4 flex items-center gap-2">
            <Button onClick={handleOpenInEmail} variant="outline" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              이메일 화면에서 열기
            </Button>
            <Button onClick={handleReply} className="gap-2">
              <Reply className="w-4 h-4" />
              답장하기
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
