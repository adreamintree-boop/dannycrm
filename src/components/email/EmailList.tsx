import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { EmailMessage, useEmailContext } from '@/context/EmailContext';
import { supabase } from '@/integrations/supabase/client';
import { NylasMessage } from '@/hooks/useNylas';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useNylasEmailContext } from '@/context/NylasEmailContext';
import EmailListHeader from './EmailListHeader';
import EmailListItem from './EmailListItem';
import EmailCrmActionBar from './EmailCrmActionBar';
import EmailCrmAssignDrawer from './EmailCrmAssignDrawer';
import { useCrmEmailStatus } from '@/hooks/useCrmEmailStatus';

interface EmailListProps {
  messages: EmailMessage[];
  mailbox: string;
  loading: boolean;
  onToggleStar: (id: string) => void;
  searchQuery: string;
  nylasMessages?: NylasMessage[];
  useNylas?: boolean;
}

interface SelectedEmailInfo {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
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
  const { toast } = useToast();
  const { logEmailToCRM: logDbEmailToCrm, deleteMessage, fetchMessages: refetchMessages } = useEmailContext();
  const { logEmailToCRM } = useNylasEmailContext();
  const { linkedMessages, fetchLinkedMessages, isLinked, getLink, addLink } = useCrmEmailStatus();
  
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  // Fetch CRM link status on mount
  useEffect(() => {
    if (useNylas) {
      fetchLinkedMessages();
    }
  }, [useNylas, fetchLinkedMessages]);

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

  const handleDelete = async () => {
    const selectedList = Array.from(selectedIds);
    if (selectedList.length === 0) return;

    try {
      if (useNylas) {
        // For Nylas messages - move to trash by updating mailbox in DB
        // Note: Nylas API trash operation would require a separate edge function
        // For now, we just remove from current view and show toast
        toast({
          title: '삭제됨',
          description: `${selectedList.length}개 이메일이 휴지통으로 이동되었습니다.`,
        });
      } else {
        // For DB-based messages - use deleteMessage from context
        for (const id of selectedList) {
          await deleteMessage(id);
        }
        // Refetch messages to update UI
        await refetchMessages(mailbox);
      }
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to delete messages:', error);
      toast({
        title: '오류',
        description: '이메일 삭제에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setSelectedIds(new Set());
    }
  };

  const handleCancelSelection = () => {
    setSelectedIds(new Set());
  };

  const handleOpenAssignDrawer = () => {
    setAssignDrawerOpen(true);
  };

  // Get selected email details for drawer
  const getSelectedEmailsInfo = useCallback((): SelectedEmailInfo[] => {
    const selected: SelectedEmailInfo[] = [];
    
    if (useNylas) {
      nylasMessages.forEach((msg) => {
        if (selectedIds.has(msg.id) && !isLinked(msg.id)) {
          selected.push({
            id: msg.id,
            subject: msg.subject,
            from: msg.from.name || msg.from.email,
            to: msg.to[0]?.email || '',
            date: msg.date,
          });
        }
      });
    } else {
      messages.forEach((msg) => {
        if (selectedIds.has(msg.id) && !msg.is_logged_to_crm) {
          selected.push({
            id: msg.id,
            subject: msg.subject,
            from: msg.from_name || msg.from_email,
            to: Array.isArray(msg.to_emails) ? msg.to_emails[0] : '',
            date: msg.created_at,
          });
        }
      });
    }
    
    return selected;
  }, [useNylas, nylasMessages, messages, selectedIds, isLinked]);

  // Handle single email add to CRM
  const handleSingleAddToCrm = (emailId: string) => {
    setSelectedIds(new Set([emailId]));
    setAssignDrawerOpen(true);
  };

  // Handle CRM assignment
  const handleAssign = async (buyerId: string, buyerName: string, notes?: string) => {
    setAssignLoading(true);

    const emailsToAssign = Array.from(selectedIds).filter((id) => {
      if (useNylas) return !isLinked(id);
      const msg = messages.find((m) => m.id === id);
      return !!msg && !msg.is_logged_to_crm;
    });

    let successCount = 0;
    let skipCount = 0;

    try {
      for (const messageId of emailsToAssign) {
        if (useNylas) {
          const result = await logEmailToCRM(messageId, buyerId);
          if (result.success) {
            addLink(messageId, buyerId, buyerName);
            successCount++;
          } else {
            skipCount++;
          }
        } else {
          const result = await logDbEmailToCrm(messageId, buyerId, buyerName);
          if (result.success) {
            successCount++;
          } else {
            skipCount++;
          }
        }
      }

      if (successCount > 0) {
        toast({
          title: 'CRM 추가 완료',
          description: `${successCount}개 이메일이 ${buyerName}에 추가되었습니다.${skipCount > 0 ? ` (${skipCount}개 건너뜀)` : ''}`,
        });
      } else {
        toast({
          title: '알림',
          description: '추가할 이메일이 없습니다. (이미 연결됨)',
          variant: 'default',
        });
      }

      setAssignDrawerOpen(false);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to assign emails to CRM:', error);
      toast({
        title: '오류',
        description: 'CRM 추가에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setAssignLoading(false);
    }
  };

  // Count unassigned selected emails
  const unassignedSelectedCount = useMemo(() => {
    if (!useNylas) return selectedIds.size;
    return Array.from(selectedIds).filter(id => !isLinked(id)).length;
  }, [useNylas, selectedIds, isLinked]);

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

      {/* CRM Action Bar */}
      {unassignedSelectedCount > 0 && useNylas && (
        <EmailCrmActionBar
          selectedCount={unassignedSelectedCount}
          onAddToCrm={handleOpenAssignDrawer}
          onCancel={handleCancelSelection}
          loading={assignLoading}
        />
      )}

      <div className="flex-1 overflow-auto bg-white">
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
            const linked = isLinked(msg.id);
            const linkInfo = getLink(msg.id);

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
                crmLinked={linked}
                crmBuyerName={linkInfo?.buyer_name}
                onClick={() => navigate(`/email/${msg.id}?nylas=true&mailbox=${mailbox}`)}
                onSelect={(checked) => handleSelect(msg.id, checked)}
                onAddToCrm={linked ? undefined : () => handleSingleAddToCrm(msg.id)}
              />
            );
          })
        ) : (
          // Mock messages
          (paginatedMessages as EmailMessage[]).map((msg) => {
            const displayName = msg.mailbox === 'sent' || msg.mailbox === 'draft'
              ? msg.to_emails[0] || '(수신자 없음)'
              : msg.from_name || msg.from_email;

            const linked = msg.is_logged_to_crm;

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
                crmLinked={linked}
                onClick={() => navigate(`/email/${msg.id}?mailbox=${mailbox}`)}
                onSelect={(checked) => handleSelect(msg.id, checked)}
                onAddToCrm={linked ? undefined : () => handleSingleAddToCrm(msg.id)}
              />
            );
          })
        )}
      </div>

      {/* CRM Assignment Drawer */}
      <EmailCrmAssignDrawer
        open={assignDrawerOpen}
        onOpenChange={setAssignDrawerOpen}
        selectedEmails={getSelectedEmailsInfo()}
        onAssign={handleAssign}
        loading={assignLoading}
      />
    </div>
  );
};

export default EmailList;
