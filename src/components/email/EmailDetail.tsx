import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Reply, Forward, Trash2, Star } from 'lucide-react';
import { useEmail, EmailMessage } from '@/hooks/useEmail';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const EmailDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getMessage, markAsRead, toggleStar, deleteMessage, logActivity } = useEmail();
  const [message, setMessage] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const msg = await getMessage(id);
      if (msg) {
        setMessage(msg);
        if (!msg.is_read) {
          markAsRead(id);
        }
        logActivity('open', id, msg.thread_id || undefined);
      }
      setLoading(false);
    };
    load();
  }, [id, getMessage, markAsRead, logActivity]);

  const handleReply = () => {
    if (id) {
      navigate(`/email/compose?replyTo=${id}`);
    }
  };

  const handleForward = () => {
    if (id) {
      navigate(`/email/compose?forward=${id}`);
    }
  };

  const handleDelete = async () => {
    if (id) {
      await deleteMessage(id);
      navigate('/email');
    }
  };

  const handleToggleStar = async () => {
    if (id && message) {
      await toggleStar(id);
      setMessage({ ...message, is_starred: !message.is_starred });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
};

export default EmailDetail;
