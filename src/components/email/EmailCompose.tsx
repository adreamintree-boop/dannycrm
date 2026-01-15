import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RichTextEditor from './RichTextEditor';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, Send, Save, X, Building2, Lock } from 'lucide-react';
import EmailScriptGenerator from './EmailScriptGenerator';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEmailContext, ComposeData } from '@/context/EmailContext';
import { useNylasEmailContext } from '@/context/NylasEmailContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
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

  // Handle buyerId and to query params for prefilling
  // Note: Only set 'to' field from query param when NOT in reply mode
  // (reply mode sets 'to' from the original message's sender)
  useEffect(() => {
    const buyerIdParam = searchParams.get('buyerId');
    const toParam = searchParams.get('to');
    const replyTo = searchParams.get('replyTo');

    // If buyerId is provided, find the buyer in the list and select them
    if (buyerIdParam && buyers.length > 0) {
      const foundBuyer = buyers.find(b => b.id === buyerIdParam);
      if (foundBuyer) {
        setSelectedBuyer(foundBuyer);
        setBuyerLocked(true);
        
        // Only set 'to' from query param if NOT in reply mode
        // In reply mode, 'to' is set from the original message's sender
        if (toParam && !replyTo) {
          // Simple email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (emailRegex.test(toParam)) {
            setTo(toParam);
          } else {
            toast({
              variant: 'destructive',
              title: '잘못된 이메일 형식',
              description: '이메일 주소 형식이 올바르지 않습니다.',
            });
          }
        }
      } else {
        // Buyer not found in the list
        toast({
          variant: 'destructive',
          title: 'Buyer not found',
          description: '해당 바이어를 찾을 수 없습니다.',
        });
      }
    }
  }, [buyers, searchParams]);

  // Handle legacy buyerName/buyerStage params (for backward compatibility)
  useEffect(() => {
    const buyerIdParam = searchParams.get('buyerId');
    const buyerNameParam = searchParams.get('buyerName');
    const buyerStageParam = searchParams.get('buyerStage');
    
    // Only use legacy params if buyers list hasn't loaded the buyer
    if (buyerIdParam && buyerNameParam && !selectedBuyer) {
      setSelectedBuyer({
        id: buyerIdParam,
        company_name: buyerNameParam,
        stage: buyerStageParam || 'list',
        country: null,
      });
      setBuyerLocked(true);
    }
  }, [searchParams, selectedBuyer]);

  useEffect(() => {
    const replyTo = searchParams.get('replyTo');
    const forwardFrom = searchParams.get('forward');

    const loadOriginal = async (id: string, isForward: boolean) => {
      if (useNylas) {
        // Load Nylas message
        const msg = await fetchNylasMessage(id);
        if (msg) {
          if (isForward) {
            setSubject(`Fwd: ${msg.subject}`);
            const fwdContent = `<br><br><hr><p><strong>---------- 전달된 메시지 ----------</strong></p><p>보낸사람: ${msg.from.name || msg.from.email}</p><p>받는사람: ${msg.to.map(t => t.email).join(', ')}</p><p>제목: ${msg.subject}</p><br><div>${msg.body_html || msg.body_text?.replace(/\n/g, '<br>') || ''}</div>`;
            setBody(fwdContent);
          } else {
            // Format: "Name <email>" or just "email" if no name
            const fromDisplay = msg.from.name 
              ? `${msg.from.name} <${msg.from.email}>`
              : msg.from.email;
            setTo(fromDisplay);
            setSubject(`Re: ${msg.subject.replace(/^Re: /, '')}`);
            const quoteContent = `<br><br><p>${msg.date}에 ${msg.from.name || msg.from.email}님이 작성:</p><blockquote style="border-left: 2px solid #ccc; padding-left: 1rem; margin-left: 0; color: #666;">${msg.body_html || msg.body_text?.replace(/\n/g, '<br>') || ''}</blockquote>`;
            setBody(quoteContent);
            setReplyToMessageId(id);
          }
        }
      } else {
        // Load mock message
        const msg = await getMessage(id);
        if (msg) {
          if (isForward) {
            setSubject(`Fwd: ${msg.subject}`);
            const fwdContent = `<br><br><hr><p><strong>---------- 전달된 메시지 ----------</strong></p><p>보낸사람: ${msg.from_name || msg.from_email}</p><p>받는사람: ${msg.to_emails.join(', ')}</p><p>제목: ${msg.subject}</p><br><div>${msg.body.replace(/\n/g, '<br>')}</div>`;
            setBody(fwdContent);
          } else {
            // Format: "Name <email>" or just "email" if no name
            const fromDisplay = msg.from_name 
              ? `${msg.from_name} <${msg.from_email}>`
              : msg.from_email;
            setTo(fromDisplay);
            setSubject(`Re: ${msg.subject.replace(/^Re: /, '')}`);
            const quoteContent = `<br><br><p>${msg.created_at}에 ${msg.from_name || msg.from_email}님이 작성:</p><blockquote style="border-left: 2px solid #ccc; padding-left: 1rem; margin-left: 0; color: #666;">${msg.body.replace(/\n/g, '<br>')}</blockquote>`;
            setBody(quoteContent);
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
      // Send via Nylas - body is already HTML from rich text editor
      const success = await sendNylasEmail({
        to: toEmails,
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        bcc: bccEmails.length > 0 ? bccEmails : undefined,
        subject,
        body_html: body,
        buyer_id: selectedBuyer?.id,
        reply_to_message_id: replyToMessageId || undefined,
      });
      setSending(false);
      if (success) {
        navigate('/email/sent');
      }
    } else {
      // Send via mock system - body is already HTML from rich text editor
      const data: ComposeData = {
        to,
        cc,
        bcc,
        subject,
        body, // HTML body
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

        {/* AI Email Script Generator */}
        <EmailScriptGenerator
          selectedBuyerId={selectedBuyer?.id || null}
          onScriptGenerated={(generatedSubject, generatedBody) => {
            if (generatedSubject) {
              setSubject(generatedSubject);
            }
            if (generatedBody) {
              // Convert newlines to HTML paragraphs with spacing for proper formatting in rich text editor
              const htmlBody = generatedBody
                .split(/\n\n+/)
                .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
                .join('<br>'); // Add extra line break between paragraphs for better visual separation
              // Prepend to existing body
              setBody(prev => prev ? `${htmlBody}<br><br>${prev}` : htmlBody);
            }
          }}
        />

        <RichTextEditor
          content={body}
          onChange={setBody}
          placeholder="내용을 입력하세요..."
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
