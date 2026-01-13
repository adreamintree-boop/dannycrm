import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, ChevronDown, ChevronUp, Mail, MessageSquare, Reply } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

interface EmailScriptGeneratorProps {
  selectedBuyerId: string | null;
  onScriptGenerated: (subject: string, body: string) => void;
}

type EmailStage = 'initial' | 'follow_up' | 'reply';

const stageConfig: Record<EmailStage, { label: string; icon: React.ReactNode; description: string }> = {
  initial: {
    label: 'Initial (첫 컨택)',
    icon: <Mail className="w-4 h-4" />,
    description: '바이어와의 첫 연락 이메일을 작성합니다.',
  },
  follow_up: {
    label: 'Follow-up (후속)',
    icon: <MessageSquare className="w-4 h-4" />,
    description: 'AI가 이메일 히스토리를 분석하여 적절한 후속 이메일을 작성합니다.',
  },
  reply: {
    label: 'Reply (회신 응답)',
    icon: <Reply className="w-4 h-4" />,
    description: 'AI가 바이어의 마지막 이메일에 대한 회신을 작성합니다.',
  },
};

export default function EmailScriptGenerator({
  selectedBuyerId,
  onScriptGenerated,
}: EmailScriptGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [emailStage, setEmailStage] = useState<EmailStage>('initial');

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
      const payload = {
        buyer_id: selectedBuyerId,
        email_stage: emailStage,
        auto_analyze: true, // Flag to tell edge function to auto-analyze email history
      };

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

      // Show analysis summary if available
      const analysisInfo = data.email_history_analysis;
      if (analysisInfo && (emailStage === 'follow_up' || emailStage === 'reply')) {
        toast({
          title: '이메일 스크립트 생성 완료',
          description: `${analysisInfo.total_emails || 0}개의 이메일 히스토리를 분석하여 작성되었습니다.`,
        });
      } else {
        toast({
          title: '이메일 스크립트 생성 완료',
          description: '제목과 본문이 자동으로 입력되었습니다.',
        });
      }

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

  const selectedStageConfig = stageConfig[emailStage];

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
                  {Object.entries(stageConfig).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        {config.icon}
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage Description */}
            <div className="p-3 bg-background border border-border rounded-md">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-md text-primary">
                  {selectedStageConfig.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{selectedStageConfig.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedStageConfig.description}
                  </p>
                  
                  {emailStage === 'follow_up' && (
                    <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
                      <p className="font-medium mb-1">AI가 자동으로 분석하는 항목:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>발송한 이메일 수 및 마지막 이메일 후 경과 일수</li>
                        <li>바이어 응답 상태 (무응답/긍정적/중립적/거절)</li>
                        <li>적절한 후속 목적 및 톤 선택</li>
                        <li>침묵 가설 기반 접근 방향 결정</li>
                      </ul>
                    </div>
                  )}
                  
                  {emailStage === 'reply' && (
                    <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
                      <p className="font-medium mb-1">AI가 자동으로 분석하는 항목:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>바이어의 마지막 인바운드 이메일 내용</li>
                        <li>이전 대화 맥락 및 히스토리</li>
                        <li>바이어의 질문/요청사항에 대한 적절한 응답</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedBuyerId}
              className="w-full gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  이메일 히스토리 분석 및 생성 중...
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
