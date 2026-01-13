import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface EmailScriptGeneratorProps {
  selectedBuyerId: string | null;
  onScriptGenerated: (subject: string, body: string) => void;
}

type EmailStage = 'initial' | 'follow_up' | 'reply';
type FollowUpGoal = 'nudge' | 'value_add' | 'clarification' | 'call_to_action' | 'exit_check';
type ToneStage = 'first_follow_up' | 'second_follow_up' | 'third_follow_up' | 'exit_email';
type ReplyStatus = 'no_reply' | 'positive' | 'neutral' | 'rejection';
type OpenStatus = 'opened' | 'unopened' | 'unknown';
type SilenceHypothesis = 'busy' | 'not_decision_maker' | 'low_priority' | 'unclear_value' | 'soft_reject';

const stageLabels: Record<EmailStage, string> = {
  initial: 'Initial (첫 컨택)',
  follow_up: 'Follow-up (후속)',
  reply: 'Reply (회신 응답)',
};

const followUpGoalLabels: Record<FollowUpGoal, string> = {
  nudge: 'Nudge (재촉)',
  value_add: 'Value Add (가치 추가)',
  clarification: 'Clarification (명확화)',
  call_to_action: 'Call to Action (행동 유도)',
  exit_check: 'Exit Check (종료 확인)',
};

const toneStageLabels: Record<ToneStage, string> = {
  first_follow_up: '1차 후속 (Polite + Light)',
  second_follow_up: '2차 후속 (Helpful + Value)',
  third_follow_up: '3차 후속 (Direct but Respectful)',
  exit_email: 'Exit Email (Graceful Exit)',
};

const replyStatusLabels: Record<ReplyStatus, string> = {
  no_reply: '무응답',
  positive: '긍정적',
  neutral: '중립적',
  rejection: '거절',
};

const openStatusLabels: Record<OpenStatus, string> = {
  opened: '열람함',
  unopened: '미열람',
  unknown: '알 수 없음',
};

const silenceHypothesisLabels: Record<SilenceHypothesis, string> = {
  busy: '바쁨',
  not_decision_maker: '의사결정권자 아님',
  low_priority: '우선순위 낮음',
  unclear_value: '가치 불명확',
  soft_reject: '완곡한 거절',
};

export default function EmailScriptGenerator({
  selectedBuyerId,
  onScriptGenerated,
}: EmailScriptGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Stage selection
  const [emailStage, setEmailStage] = useState<EmailStage>('initial');
  
  // Follow-up specific fields
  const [followUpGoal, setFollowUpGoal] = useState<FollowUpGoal>('nudge');
  const [toneStage, setToneStage] = useState<ToneStage>('first_follow_up');
  const [silenceHypothesis, setSilenceHypothesis] = useState<SilenceHypothesis[]>([]);
  const [sentEmails, setSentEmails] = useState(0);
  const [daysSinceLastEmail, setDaysSinceLastEmail] = useState(0);
  const [replyStatus, setReplyStatus] = useState<ReplyStatus>('no_reply');
  const [openStatus, setOpenStatus] = useState<OpenStatus>('unknown');
  
  // Reply specific fields
  const [lastBuyerEmail, setLastBuyerEmail] = useState('');

  const toggleSilenceHypothesis = (value: SilenceHypothesis) => {
    setSilenceHypothesis(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleGenerate = async () => {
    if (!selectedBuyerId) {
      toast({
        variant: 'destructive',
        title: '바이어를 선택해주세요',
        description: '이메일 스크립트를 생성하려면 먼저 바이어를 선택해야 합니다.',
      });
      return;
    }

    setGenerating(true);

    try {
      const payload: any = {
        buyer_id: selectedBuyerId,
        email_stage: emailStage,
      };

      if (emailStage === 'follow_up') {
        payload.follow_up_goal = followUpGoal;
        payload.tone_stage = toneStage;
        payload.silence_hypothesis = silenceHypothesis;
        payload.contact_status = {
          sent_emails: sentEmails,
          days_since_last_email: daysSinceLastEmail,
          reply_status: replyStatus,
          open_status: openStatus,
        };
        payload.tone_constraints = {
          no_pressure: true,
          no_salesy_language: true,
          max_length: 120,
        };
      }

      if (emailStage === 'reply' && lastBuyerEmail.trim()) {
        payload.last_buyer_email = lastBuyerEmail;
      }

      const { data, error } = await supabase.functions.invoke('ep06-email-script', {
        body: payload,
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate email script');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate email script');
      }

      // Extract subject and body from response
      const subject = data.subject_lines?.[0] || '';
      const body = data.body || '';

      onScriptGenerated(subject, body);

      toast({
        title: '이메일 스크립트 생성 완료',
        description: '제목과 본문이 자동으로 입력되었습니다.',
      });

    } catch (error) {
      console.error('Email script generation error:', error);
      toast({
        variant: 'destructive',
        title: '스크립트 생성 실패',
        description: error instanceof Error ? error.message : '다시 시도해주세요.',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border rounded-lg bg-muted/30">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-4 h-auto"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-medium">AI Email Script (EP-06)</span>
              <Badge variant="secondary" className="text-xs">Beta</Badge>
            </div>
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4">
            {/* Stage Selection */}
            <div className="space-y-2">
              <Label>이메일 단계</Label>
              <Select value={emailStage} onValueChange={(v) => setEmailStage(v as EmailStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(stageLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Follow-up specific fields */}
            {emailStage === 'follow_up' && (
              <div className="space-y-4 p-4 border border-border rounded-md bg-background">
                <h4 className="font-medium text-sm">Follow-up 설정</h4>
                
                {/* Follow-up Goal */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">목적 (Goal)</Label>
                    <Select value={followUpGoal} onValueChange={(v) => setFollowUpGoal(v as FollowUpGoal)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(followUpGoalLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tone Stage */}
                  <div className="space-y-2">
                    <Label className="text-sm">톤 단계</Label>
                    <Select value={toneStage} onValueChange={(v) => setToneStage(v as ToneStage)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(toneStageLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Contact Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">발송한 이메일 수</Label>
                    <Input
                      type="number"
                      min={0}
                      value={sentEmails}
                      onChange={(e) => setSentEmails(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">마지막 이메일 후 일수</Label>
                    <Input
                      type="number"
                      min={0}
                      value={daysSinceLastEmail}
                      onChange={(e) => setDaysSinceLastEmail(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">응답 상태</Label>
                    <Select value={replyStatus} onValueChange={(v) => setReplyStatus(v as ReplyStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(replyStatusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">열람 상태</Label>
                    <Select value={openStatus} onValueChange={(v) => setOpenStatus(v as OpenStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(openStatusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Silence Hypothesis */}
                <div className="space-y-2">
                  <Label className="text-sm">침묵 가설 (복수 선택)</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(silenceHypothesisLabels).map(([value, label]) => (
                      <div
                        key={value}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          id={`sh-${value}`}
                          checked={silenceHypothesis.includes(value as SilenceHypothesis)}
                          onCheckedChange={() => toggleSilenceHypothesis(value as SilenceHypothesis)}
                        />
                        <Label htmlFor={`sh-${value}`} className="text-sm font-normal cursor-pointer">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Reply specific fields */}
            {emailStage === 'reply' && (
              <div className="space-y-2">
                <Label>바이어 마지막 이메일 내용 (선택)</Label>
                <Textarea
                  placeholder="바이어가 보낸 마지막 이메일 내용을 붙여넣으세요..."
                  value={lastBuyerEmail}
                  onChange={(e) => setLastBuyerEmail(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedBuyerId}
              className="w-full gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  이메일 스크립트 생성
                </>
              )}
            </Button>

            {!selectedBuyerId && (
              <p className="text-sm text-muted-foreground text-center">
                먼저 위에서 바이어를 선택해주세요
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
