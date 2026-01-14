import React, { useState, useMemo } from 'react';
import { EmailMessage } from '@/context/EmailContext';
import { NylasMessage } from '@/hooks/useNylas';
import { useNavigate } from 'react-router-dom';
import EmailListHeader from './EmailListHeader';
import EmailListItem from './EmailListItem';

interface EmailListProps {
  messages: EmailMessage[];
  mailbox: string;
  loading: boolean;
  onToggleStar: (id: string) => void;
  searchQuery: string;
  nylasMessages?: NylasMessage[];
  useNylas?: boolean;
}

const ITEMS_PER_PAGE = 20;

const EmailList: React.FC<EmailListProps> = ({
  messages,
  mailbox,
  loading,
  onToggleStar,
  searchQuery: externalSearchQuery,
  nylasMessages = [],
  useNylas = false,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const mailboxLabels: Record<string, string> = {
    inbox: 'Inbox',
    sent: 'Sent',
    draft: 'Drafts',
    all: 'All',
    trash: 'Trash',
  };

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (useNylas) {
      return nylasMessages.filter((msg) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          msg.subject.toLowerCase().includes(query) ||
          msg.snippet.toLowerCase().includes(query) ||
          msg.from.email.toLowerCase().includes(query) ||
          msg.from.name?.toLowerCase().includes(query)
        );
      });
    }
    return messages.filter((msg) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        msg.subject.toLowerCase().includes(query) ||
        msg.body.toLowerCase().includes(query) ||
        msg.from_email.toLowerCase().includes(query) ||
        msg.from_name?.toLowerCase().includes(query)
      );
    });
  }, [useNylas, nylasMessages, messages, searchQuery]);

  // Pagination
  const totalCount = filteredMessages.length;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const paginatedMessages = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMessages.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMessages, currentPage]);

  const allSelected = paginatedMessages.length > 0 && 
    paginatedMessages.every(msg => selectedIds.has(useNylas ? (msg as NylasMessage).id : (msg as EmailMessage).id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      const ids = paginatedMessages.map(msg => useNylas ? (msg as NylasMessage).id : (msg as EmailMessage).id);
      setSelectedIds(new Set(ids));
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleDelete = () => {
    // TODO: Implement delete functionality
    console.log('Delete selected:', Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setSelectedIds(new Set());
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <EmailListHeader
          title={mailboxLabels[mailbox] || mailbox}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCount={0}
          totalCount={0}
          allSelected={false}
          onSelectAll={() => {}}
          currentPage={1}
          totalPages={1}
          onPageChange={() => {}}
          itemsPerPage={ITEMS_PER_PAGE}
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <EmailListHeader
        title={mailboxLabels[mailbox] || mailbox}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCount={selectedIds.size}
        totalCount={totalCount}
        allSelected={allSelected}
        onSelectAll={handleSelectAll}
        onDelete={selectedIds.size > 0 ? handleDelete : undefined}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={ITEMS_PER_PAGE}
      />

      <div className="flex-1 overflow-auto bg-background">
        {paginatedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p>메일이 없습니다</p>
          </div>
        ) : useNylas ? (
          // Nylas messages
          (paginatedMessages as NylasMessage[]).map((msg) => {
            const isInboxView = mailbox === 'inbox' || (mailbox === 'all' && msg.folder.toLowerCase().includes('inbox'));
            const displayName = isInboxView
              ? msg.from.name || msg.from.email
              : msg.to[0]?.email || '(수신자 없음)';

            return (
              <EmailListItem
                key={msg.id}
                id={msg.id}
                senderName={displayName}
                subject={msg.subject}
                snippet={msg.snippet}
                date={msg.date}
                isUnread={msg.unread}
                isSelected={selectedIds.has(msg.id)}
                hasAttachment={false}
                onClick={() => navigate(`/email/${msg.id}?nylas=true`)}
                onSelect={(checked) => handleSelect(msg.id, checked)}
              />
            );
          })
        ) : (
          // Mock messages
          (paginatedMessages as EmailMessage[]).map((msg) => {
            const displayName = msg.mailbox === 'sent' || msg.mailbox === 'draft'
              ? msg.to_emails[0] || '(수신자 없음)'
              : msg.from_name || msg.from_email;

            return (
              <EmailListItem
                key={msg.id}
                id={msg.id}
                senderName={displayName}
                subject={msg.subject}
                snippet={msg.snippet || ''}
                date={msg.created_at}
                isUnread={!msg.is_read}
                isSelected={selectedIds.has(msg.id)}
                hasAttachment={false}
                onClick={() => navigate(`/email/${msg.id}`)}
                onSelect={(checked) => handleSelect(msg.id, checked)}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default EmailList;
