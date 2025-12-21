import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, Send, Save, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEmailContext, ComposeData } from '@/context/EmailContext';

export default function EmailCompose() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sendEmail, saveDraft, getMessage } = useEmailContext();

  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const replyTo = searchParams.get('replyTo');
    const forwardFrom = searchParams.get('forward');

    const loadOriginal = async (id: string, isForward: boolean) => {
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
    };

    if (replyTo) {
      loadOriginal(replyTo, false);
    } else if (forwardFrom) {
      loadOriginal(forwardFrom, true);
    }
  }, [searchParams, getMessage]);

  const handleSend = async () => {
    if (!to.trim()) {
      return;
    }
    setSending(true);
    const data: ComposeData = { to, cc, bcc, subject, body };
    const success = await sendEmail(data);
    setSending(false);
    if (success) {
      navigate('/email/sent');
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    const data: ComposeData = { to, cc, bcc, subject, body };
    const success = await saveDraft(data);
    setSaving(false);
    if (success) {
      navigate('/email/drafts');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="border-b border-border p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">새 메일 작성</h2>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="w-16 text-right text-muted-foreground">받는사람</Label>
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
              <Label className="w-16 text-right text-muted-foreground">참조</Label>
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
              <Label className="w-16 text-right text-muted-foreground">숨은참조</Label>
              <Input
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="이메일 주소 (쉼표로 구분)"
                className="flex-1"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Label className="w-16 text-right text-muted-foreground">제목</Label>
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
        <Button variant="outline" onClick={handleSaveDraft} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? '저장 중...' : '임시저장'}
        </Button>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          취소
        </Button>
      </div>
    </div>
  );
}
