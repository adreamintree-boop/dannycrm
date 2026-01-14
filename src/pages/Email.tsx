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
import { AlertCircle } from 'lucide-react';
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
    emailAccount,
    messages: nylasMessages, 
    messagesLoading, 
    fetchMessages: fetchNylasMessages 
  } = useNylasEmailContext();
  const [searchQuery] = useState('');
  const lastFetchKey = React.useRef<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    if (accountLoading) return;
    
    const fetchKey = `${mailbox}-${isConnected}`;
    if (lastFetchKey.current === fetchKey) return;
    lastFetchKey.current = fetchKey;
    
    if (isConnected) {
      fetchNylasMessages(mailbox);
    } else {
      fetchMessages(mailbox);
      if (mailbox === 'inbox') {
        seedSampleEmails();
      }
    }
  }, [mailbox, accountLoading, isConnected, fetchMessages, seedSampleEmails, fetchNylasMessages]);

  if (accountLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const connectionChecked = emailAccount !== null;
  const isLoading = isConnected ? messagesLoading : loading;

  return (
    <div className="flex-1 flex flex-col">
      {!isConnected && connectionChecked && <ConnectionBanner />}
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
  );
}

function EmailSettingsView() {
  return <EmailSettings />;
}

function EmailContent() {
  const { unreadCount: mockUnreadCount, fetchUnreadCount } = useEmailContext();
  const { isConnected, messages: nylasMessages, accountLoading } = useNylasEmailContext();
  const location = useLocation();

  useEffect(() => {
    if (!isConnected) {
      fetchUnreadCount();
    }
  }, [location.pathname, fetchUnreadCount, isConnected]);

  const unreadCount = React.useMemo(() => {
    if (accountLoading) return 0;
    if (isConnected) {
      return nylasMessages.filter(msg => msg.unread).length;
    }
    return mockUnreadCount;
  }, [isConnected, nylasMessages, mockUnreadCount, accountLoading]);

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
            <Route path="trash" element={<EmailListView mailbox="trash" />} />
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
