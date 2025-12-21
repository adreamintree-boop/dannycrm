import React, { useEffect, useState, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import TopHeader from '@/components/layout/TopHeader';
import EmailSidebar from '@/components/email/EmailSidebar';
import EmailList from '@/components/email/EmailList';
import EmailDetail from '@/components/email/EmailDetail';
import EmailCompose from '@/components/email/EmailCompose';
import { useEmail } from '@/hooks/useEmail';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const EmailListView: React.FC<{ mailbox: string }> = ({ mailbox }) => {
  const { messages, loading, fetchMessages, toggleStar, seedSampleEmails } = useEmail();
  const [searchQuery, setSearchQuery] = useState('');
  const hasSeedRef = useRef(false);

  useEffect(() => {
    fetchMessages(mailbox);
  }, [mailbox, fetchMessages]);

  useEffect(() => {
    if (mailbox === 'inbox' && !hasSeedRef.current) {
      hasSeedRef.current = true;
      seedSampleEmails();
    }
  }, [mailbox, seedSampleEmails]);

  const mailboxLabels: Record<string, string> = {
    inbox: '받은편지함',
    sent: '보낸편지함',
    draft: '임시보관함',
    all: '전체메일',
    trash: '휴지통',
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">{mailboxLabels[mailbox] || mailbox}</h2>
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="메일 검색..."
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <EmailList
          messages={messages}
          mailbox={mailbox}
          loading={loading}
          onToggleStar={toggleStar}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
};

const EmailSettingsView: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
      <p className="text-lg">이메일 설정</p>
      <p className="text-sm mt-2">설정 기능은 준비 중입니다.</p>
    </div>
  );
};

const Email: React.FC = () => {
  const { unreadCount, fetchUnreadCount } = useEmail();
  const location = useLocation();

  useEffect(() => {
    fetchUnreadCount();
  }, [location.pathname, fetchUnreadCount]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopHeader />
      <div className="flex-1 flex overflow-hidden">
        <EmailSidebar unreadCount={unreadCount} />
        <Routes>
          <Route index element={<EmailListView mailbox="inbox" />} />
          <Route path="sent" element={<EmailListView mailbox="sent" />} />
          <Route path="drafts" element={<EmailListView mailbox="draft" />} />
          <Route path="all" element={<EmailListView mailbox="all" />} />
          <Route path="settings" element={<EmailSettingsView />} />
          <Route path="compose" element={<EmailCompose />} />
          <Route path=":id" element={<EmailDetail />} />
        </Routes>
      </div>
    </div>
  );
};

export default Email;
