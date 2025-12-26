import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, Send, Save, X, Building2, Lock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEmailContext, ComposeData } from '@/context/EmailContext';
import { useNylasEmailContext } from '@/context/NylasEmailContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Buyer {
  id: string;
  company_name: string;
  stage: string;
  country: string | null;
}

const stageBadgeColors: Record<string, string> = {
  list: 'bg-muted text-muted-foreground',
  lead: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  target: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  client: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

const stageLabels: Record<string, string> = {
  list: 'List',
  lead: 'Lead',
  target: 'Target',
  client: 'Client',
};

export default function EmailCompose() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sendEmail: sendMockEmail, saveDraft, getMessage } = useEmailContext();
  const { isConnected, sendEmail: sendNylasEmail, fetchMessage: fetchNylasMessage } = useNylasEmailContext();
  const { user } = useAuthContext();

  const isNylasReply = searchParams.get('nylas') === 'true';
  const useNylas = isConnected && isNylasReply;

  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);

  // Buyer selection state
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [buyerOpen, setBuyerOpen] = useState(false);
  const [buyerSearch, setBuyerSearch] = useState('');
  const [buyerLocked, setBuyerLocked] = useState(false);

  // Fetch buyers
  useEffect(() => {
    const fetchBuyers = async () => {
      if (!user) return;

      const { data: projectData } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!projectData) return;

      const { data, error } = await supabase
        .from('crm_buyers')
        .select('id, company_name, stage, country')
        .eq('project_id', projectData.id)
        .order('company_name', { ascending: true });

      if (!error && data) {
        setBuyers(data);
      }
    };

    fetchBuyers();
  }, [user]);

  useEffect(() => {
    const replyTo = searchParams.get('replyTo');
    const forwardFrom = searchParams.get('forward');
    
    // Check for buyer context from URL params
    const buyerIdParam = searchParams.get('buyerId');
    const buyerNameParam = searchParams.get('buyerName');
    const buyerStageParam = searchParams.get('buyerStage');
    
    if (buyerIdParam && buyerNameParam) {
      setSelectedBuyer({
        id: buyerIdParam,
        company_name: buyerNameParam,
        stage: buyerStageParam || 'list',
        country: null,
      });
      setBuyerLocked(true);
    }

    const loadOriginal = async (id: string, isForward: boolean) => {
      if (useNylas) {
        // Load Nylas message
        const msg = await fetchNylasMessage(id);
        if (msg) {
          if (isForward) {
            setSubject(`Fwd: ${msg.subject}`);
            setBody(`\n\n---------- 전달된 메시지 ----------\n보낸사람: ${msg.from.name || msg.from.email}\n받는사람: ${msg.to.map(t => t.email).join(', ')}\n제목: ${msg.subject}\n\n${msg.body_text || msg.body_html?.replace(/<[^>]*>/g, '') || ''}`);
          } else {
            setTo(msg.from.email);
            setSubject(`Re: ${msg.subject.replace(/^Re: /, '')}`);
            setBody(`\n\n${msg.date}에 ${msg.from.name || msg.from.email}님이 작성:\n> ${(msg.body_text || '').split('\n').join('\n> ')}`);
            setReplyToMessageId(id);
          }
        }
      } else {
        // Load mock message
        const msg = await getMessage(id);
        if (msg) {
          if (isForward) {
            setSubject(`Fwd: ${msg.subject}`);
            setBody(`\n\n---------- 전달된 메시지 ----------\n보낸사람: ${msg.from_name || msg.from_email}\n받는사람: ${msg.to_emails.join(', ')}\n제목: ${msg.subject}\n\n${msg.body}`);
          } else {
            setTo(msg.from_email);
            setSubject(`Re: ${msg.subject.replace(/^Re: /, '')}`);
            setBody(`\n\n${msg.created_at}에 ${msg.from_name || msg.from_email}님이 작성:\n> ${msg.body.split('\n').join('\n> ')}`);
          }
        }
      }
    };

    if (replyTo) {
      loadOriginal(replyTo, false);
    } else if (forwardFrom) {
      loadOriginal(forwardFrom, true);
    }
  }, [searchParams, getMessage, fetchNylasMessage, useNylas]);

  const handleSend = async () => {
    if (!to.trim()) {
      return;
    }
    setSending(true);

    const toEmails = to.split(',').map(e => e.trim()).filter(Boolean);
    const ccEmails = cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : [];
    const bccEmails = bcc ? bcc.split(',').map(e => e.trim()).filter(Boolean) : [];

    if (isConnected) {
      // Send via Nylas
      const success = await sendNylasEmail({
        to: toEmails,
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        bcc: bccEmails.length > 0 ? bccEmails : undefined,
        subject,
        body_html: body.replace(/\n/g, '<br>'),
        buyer_id: selectedBuyer?.id,
        reply_to_message_id: replyToMessageId || undefined,
      });
      setSending(false);
      if (success) {
        navigate('/email/sent');
      }
    } else {
      // Send via mock system
      const data: ComposeData = {
        to,
        cc,
        bcc,
        subject,
        body,
        buyerId: selectedBuyer?.id,
        buyerName: selectedBuyer?.company_name,
      };
      const success = await sendMockEmail(data);
      setSending(false);
      if (success) {
        navigate('/email/sent');
      }
    }
  };

  const handleSaveDraft = async () => {
    if (!isConnected) {
      setSaving(true);
      const data: ComposeData = { to, cc, bcc, subject, body };
      const success = await saveDraft(data);
      setSaving(false);
      if (success) {
        navigate('/email/drafts');
      }
    }
  };

  const filteredBuyers = buyers.filter((buyer) =>
    buyer.company_name.toLowerCase().includes(buyerSearch.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="border-b border-border p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">새 메일 작성</h2>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Buyer Selection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="w-20 text-right text-muted-foreground shrink-0">바이어 선택</Label>
            {buyerLocked ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/50 cursor-not-allowed">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedBuyer?.company_name}</span>
                      {selectedBuyer && (
                        <Badge variant="secondary" className={stageBadgeColors[selectedBuyer.stage]}>
                          {stageLabels[selectedBuyer.stage]}
                        </Badge>
                      )}
                      <Lock className="w-3 h-3 ml-auto text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>이 이메일과 연결된 바이어입니다</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Popover open={buyerOpen} onOpenChange={setBuyerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={buyerOpen}
                    className="flex-1 justify-between font-normal"
                  >
                    {selectedBuyer ? (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedBuyer.company_name}</span>
                        <Badge variant="secondary" className={stageBadgeColors[selectedBuyer.stage]}>
                          {stageLabels[selectedBuyer.stage]}
                        </Badge>
                        {selectedBuyer.country && (
                          <span className="text-muted-foreground text-sm">{selectedBuyer.country}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">CRM에 기록할 바이어를 선택하세요 (선택)</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 z-50 bg-popover" align="start">
                  <Command>
                    <CommandInput
                      placeholder="회사명 검색..."
                      value={buyerSearch}
                      onValueChange={setBuyerSearch}
                    />
                    <CommandList>
                      <CommandEmpty>바이어를 찾을 수 없습니다.</CommandEmpty>
                      <CommandGroup>
                        {filteredBuyers.map((buyer) => (
                          <CommandItem
                            key={buyer.id}
                            value={buyer.company_name}
                            onSelect={() => {
                              setSelectedBuyer(buyer);
                              setBuyerOpen(false);
                              setBuyerSearch('');
                            }}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="flex-1">{buyer.company_name}</span>
                            <Badge variant="secondary" className={stageBadgeColors[buyer.stage]}>
                              {stageLabels[buyer.stage]}
                            </Badge>
                            {buyer.country && (
                              <span className="text-muted-foreground text-sm">{buyer.country}</span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            {selectedBuyer && !buyerLocked && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedBuyer(null)}
                className="shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          {selectedBuyer && (
            <div className="ml-24 text-sm text-primary flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-primary" />
              이 메일은 발신 후 CRM 영업활동일지에 자동 기록됩니다
            </div>
          )}
          {!selectedBuyer && searchParams.get('replyTo') && !buyerLocked && (
            <div className="ml-24 text-sm text-amber-600 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              이 이메일은 아직 바이어와 연결되지 않았습니다
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="w-20 text-right text-muted-foreground shrink-0">받는사람</Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="이메일 주소 (쉼표로 구분)"
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCc(!showCc)}
              className="text-muted-foreground"
            >
              참조 {showCc ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBcc(!showBcc)}
              className="text-muted-foreground"
            >
              숨은참조 {showBcc ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </Button>
          </div>

          {showCc && (
            <div className="flex items-center gap-2">
              <Label className="w-20 text-right text-muted-foreground shrink-0">참조</Label>
              <Input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="이메일 주소 (쉼표로 구분)"
                className="flex-1"
              />
            </div>
          )}

          {showBcc && (
            <div className="flex items-center gap-2">
              <Label className="w-20 text-right text-muted-foreground shrink-0">숨은참조</Label>
              <Input
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="이메일 주소 (쉼표로 구분)"
                className="flex-1"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Label className="w-20 text-right text-muted-foreground shrink-0">제목</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="제목을 입력하세요"
              className="flex-1"
            />
          </div>
        </div>

        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="내용을 입력하세요..."
          className="min-h-[300px] resize-none"
        />
      </div>

      <div className="border-t border-border p-4 flex items-center gap-2">
        <Button onClick={handleSend} disabled={sending || !to.trim()} className="gap-2">
          <Send className="w-4 h-4" />
          {sending ? '전송 중...' : '보내기'}
        </Button>
        {!isConnected && (
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? '저장 중...' : '임시저장'}
          </Button>
        )}
        <Button variant="ghost" onClick={() => navigate(-1)}>
          취소
        </Button>
      </div>
    </div>
  );
}
