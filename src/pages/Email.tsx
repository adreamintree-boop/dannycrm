import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import TopHeader from '@/components/layout/TopHeader';
import EmailSidebar from '@/components/email/EmailSidebar';
import EmailList from '@/components/email/EmailList';
import EmailDetail from '@/components/email/EmailDetail';
import EmailCompose from '@/components/email/EmailCompose';
import { EmailProvider, useEmailContext } from '@/context/EmailContext';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

function EmailListView({ mailbox }: { mailbox: string }) {
  const { messages, loading, fetchMessages, toggleStar, seedSampleEmails } = useEmailContext();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMessages(mailbox);
    if (mailbox === 'inbox') {
      seedSampleEmails();
    }
  }, [mailbox, fetchMessages, seedSampleEmails]);

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
}

function EmailSettingsView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
      <p className="text-lg">이메일 설정</p>
      <p className="text-sm mt-2">설정 기능은 준비 중입니다.</p>
    </div>
  );
}

function EmailContent() {
  const { unreadCount, fetchUnreadCount } = useEmailContext();
  const location = useLocation();

  useEffect(() => {
    fetchUnreadCount();
  }, [location.pathname, fetchUnreadCount]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopHeader />
      <div className="flex-1 flex min-h-0">
        <EmailSidebar unreadCount={unreadCount} />
        <main className="flex-1 flex flex-col min-h-0 overflow-auto bg-background">
          <Routes>
            <Route index element={<EmailListView mailbox="inbox" />} />
            <Route path="sent" element={<EmailListView mailbox="sent" />} />
            <Route path="drafts" element={<EmailListView mailbox="draft" />} />
            <Route path="all" element={<EmailListView mailbox="all" />} />
            <Route path="settings" element={<EmailSettingsView />} />
            <Route path="compose" element={<EmailCompose />} />
            <Route path=":id" element={<EmailDetail />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function Email() {
  return (
    <EmailProvider>
      <EmailContent />
    </EmailProvider>
  );
}
