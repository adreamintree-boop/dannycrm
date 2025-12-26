import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Reply, Forward, Trash2, Star, FileText, Check } from 'lucide-react';
import { useEmailContext, EmailMessage } from '@/context/EmailContext';
import { useNylasEmailContext } from '@/context/NylasEmailContext';
import { NylasMessageDetail } from '@/hooks/useNylas';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import BuyerSelectModal from './BuyerSelectModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  
  // Regular email context
  const { getMessage, markAsRead, toggleStar, deleteMessage, logActivity } = useEmailContext();
  
  // Nylas context
  const { fetchMessage, isConnected, logEmailToCRM: nylasLogToCRM } = useNylasEmailContext();
  
  const [message, setMessage] = useState<EmailMessage | null>(null);
  const [nylasMessage, setNylasMessage] = useState<NylasMessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkedBuyer, setLinkedBuyer] = useState<LinkedBuyer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loggingToCRM, setLoggingToCRM] = useState(false);
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    hasLoggedRef.current = false;
    
    const load = async () => {
      if (!id) return;
      setLoading(true);
      
      if (isNylas && isConnected) {
        // Load Nylas message
        const msg = await fetchMessage(id);
        if (!isMounted) return;
        
        if (msg) {
          setNylasMessage(msg);
          
          // Check if already logged to CRM
          if (msg.is_logged_to_crm && msg.crm_buyer_id) {
            const { data: buyerData } = await supabase
              .from('crm_buyers')
              .select('id, company_name, stage')
              .eq('id', msg.crm_buyer_id)
              .single();
            
            if (buyerData && isMounted) {
              setLinkedBuyer(buyerData);
            }
          }
        }
      } else {
        // Load regular message
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
          
          // Check if email is linked to a buyer via sales_activity_logs
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
              .single();
            
            if (buyerData && isMounted) {
              setLinkedBuyer(buyerData);
            }
          }
        }
      }
      setLoading(false);
    };
    
    load();
    
    return () => {
      isMounted = false;
    };
  }, [id, isNylas, isConnected, getMessage, markAsRead, logActivity, fetchMessage]);

  const handleReply = () => {
    if (id) {
      const params = new URLSearchParams({ replyTo: id });
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
      const params = new URLSearchParams({ forward: id });
      if (isNylas) params.set('nylas', 'true');
      navigate(`/email/compose?${params.toString()}`);
    }
  };

  const handleDelete = async () => {
    if (id && !isNylas) {
      await deleteMessage(id);
      navigate('/email');
    }
  };

  const handleToggleStar = async () => {
    if (id && message && !isNylas) {
      await toggleStar(id);
      setMessage({ ...message, is_starred: !message.is_starred });
    }
  };

  const handleLogToCRM = async (buyerId: string, buyerName: string) => {
    if (!id) return;
    
    setLoggingToCRM(true);
    setModalOpen(false);
    
    if (isNylas) {
      const result = await nylasLogToCRM(id, buyerId);
      if (result.success) {
        setLinkedBuyer({ id: buyerId, company_name: buyerName, stage: 'list' });
        if (nylasMessage) {
          setNylasMessage({ ...nylasMessage, is_logged_to_crm: true, crm_buyer_id: buyerId });
        }
      }
    }
    
    setLoggingToCRM(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Render Nylas message
  if (isNylas && nylasMessage) {
    const isLogged = nylasMessage.is_logged_to_crm;
    
    return (
      <div className="flex-1 flex flex-col bg-background">
        <div className="border-b border-border p-4 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/email')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setModalOpen(true)}
                disabled={isLogged || loggingToCRM}
                className={cn('gap-1', isLogged && 'text-green-600')}
              >
                {loggingToCRM ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isLogged ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                {isLogged ? '기록됨' : 'CRM 기록'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isLogged ? `${linkedBuyer?.company_name || '바이어'}에 저장됨` : '바이어 선택 후 CRM에 기록'}
            </TooltipContent>
          </Tooltip>
          <Button variant="ghost" size="icon" onClick={() => {}}>
            <Star className={cn('w-4 h-4', nylasMessage.starred && 'fill-yellow-500 text-yellow-500')} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleReply}>
            <Reply className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleForward}>
            <Forward className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-semibold mb-4">{nylasMessage.subject}</h1>
            
            <div className="flex items-start gap-4 mb-6 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {(nylasMessage.from.name || nylasMessage.from.email)[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{nylasMessage.from.name || nylasMessage.from.email}</span>
                  <span className="text-muted-foreground text-sm">&lt;{nylasMessage.from.email}&gt;</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  받는사람: {nylasMessage.to.map(t => t.email).join(', ')}
                </div>
                {nylasMessage.cc.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    참조: {nylasMessage.cc.map(t => t.email).join(', ')}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {format(new Date(nylasMessage.date), 'yyyy년 M월 d일 (EEEE) a h:mm', { locale: ko })}
                </div>
              </div>
            </div>

            {nylasMessage.body_html ? (
              <div 
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: nylasMessage.body_html }}
              />
            ) : (
              <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                {nylasMessage.body_text}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border p-4 flex items-center gap-2">
          <Button onClick={handleReply} className="gap-2">
            <Reply className="w-4 h-4" />
            답장
          </Button>
          <Button variant="outline" onClick={handleForward} className="gap-2">
            <Forward className="w-4 h-4" />
            전달
          </Button>
        </div>

        <BuyerSelectModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSelect={handleLogToCRM}
          loading={loggingToCRM}
        />
      </div>
    );
  }

  // Render regular message
  if (!message) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <p>메일을 찾을 수 없습니다</p>
        <Button variant="link" onClick={() => navigate('/email')}>
          돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="border-b border-border p-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/email')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" onClick={handleToggleStar}>
          <Star className={cn(
            'w-4 h-4',
            message.is_starred && 'fill-yellow-500 text-yellow-500'
          )} />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleReply}>
          <Reply className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleForward}>
          <Forward className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleDelete}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold mb-4">{message.subject}</h1>
          
          <div className="flex items-start gap-4 mb-6 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold">
                {(message.from_name || message.from_email)[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{message.from_name || message.from_email}</span>
                <span className="text-muted-foreground text-sm">&lt;{message.from_email}&gt;</span>
              </div>
              <div className="text-sm text-muted-foreground">
                받는사람: {message.to_emails.join(', ')}
              </div>
              {message.cc_emails.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  참조: {message.cc_emails.join(', ')}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {format(new Date(message.created_at), 'yyyy년 M월 d일 (EEEE) a h:mm', { locale: ko })}
              </div>
            </div>
          </div>

          <div className="whitespace-pre-wrap text-foreground leading-relaxed">
            {message.body}
          </div>
        </div>
      </div>

      <div className="border-t border-border p-4 flex items-center gap-2">
        <Button onClick={handleReply} className="gap-2">
          <Reply className="w-4 h-4" />
          답장
        </Button>
        <Button variant="outline" onClick={handleForward} className="gap-2">
          <Forward className="w-4 h-4" />
          전달
        </Button>
      </div>
    </div>
  );
}
