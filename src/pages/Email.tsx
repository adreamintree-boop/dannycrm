import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import TopHeader from '@/components/layout/TopHeader';
import EmailSidebar from '@/components/email/EmailSidebar';
import EmailList from '@/components/email/EmailList';
import EmailDetail from '@/components/email/EmailDetail';
import EmailCompose from '@/components/email/EmailCompose';
import EmailSettings from '@/components/email/EmailSettings';
import { EmailProvider, useEmailContext } from '@/context/EmailContext';
import { NylasEmailProvider, useNylasEmailContext } from '@/context/NylasEmailContext';
import { Input } from '@/components/ui/input';
import { Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

function ConnectionBanner() {
  const navigate = useNavigate();
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
          이메일이 아직 연동되지 않았습니다. 설정에서 연동을 완료해주세요.
        </p>
        <Button size="sm" variant="outline" onClick={() => navigate('/email/settings')}>
          설정으로 이동
        </Button>
      </div>
    </div>
  );
}

function EmailListView({ mailbox }: { mailbox: string }) {
  const { messages, loading, fetchMessages, toggleStar, seedSampleEmails } = useEmailContext();
  const { 
    isConnected, 
    checkConnection, 
    accountLoading, 
    messages: nylasMessages, 
    messagesLoading, 
    fetchMessages: fetchNylasMessages 
  } = useNylasEmailContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [hasCheckedConnection, setHasCheckedConnection] = useState(false);

  useEffect(() => {
    if (!hasCheckedConnection) {
      checkConnection().then(() => setHasCheckedConnection(true));
    }
  }, [checkConnection, hasCheckedConnection]);

  useEffect(() => {
    if (hasCheckedConnection) {
      if (isConnected) {
        // Fetch from Nylas
        fetchNylasMessages(mailbox);
      } else {
        // Use mock data
        fetchMessages(mailbox);
        if (mailbox === 'inbox') {
          seedSampleEmails();
        }
      }
    }
  }, [mailbox, hasCheckedConnection, isConnected, fetchMessages, seedSampleEmails, fetchNylasMessages]);

  const mailboxLabels: Record<string, string> = {
    inbox: '받은편지함',
    sent: '보낸편지함',
    draft: '임시보관함',
    all: '전체메일',
    trash: '휴지통',
  };

  if (accountLoading || !hasCheckedConnection) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isLoading = isConnected ? messagesLoading : loading;

  return (
    <div className="flex-1 flex flex-col">
      {!isConnected && hasCheckedConnection && <ConnectionBanner />}
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
          loading={isLoading}
          onToggleStar={toggleStar}
          searchQuery={searchQuery}
          nylasMessages={nylasMessages}
          useNylas={isConnected}
        />
      </div>
    </div>
  );
}

function EmailSettingsView() {
  return <EmailSettings />;
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
      <NylasEmailProvider>
        <EmailContent />
      </NylasEmailProvider>
    </EmailProvider>
  );
}
