import React from 'react';
import { X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmailCrmActionBarProps {
  selectedCount: number;
  onAddToCrm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const EmailCrmActionBar: React.FC<EmailCrmActionBarProps> = ({
  selectedCount,
  onAddToCrm,
  onCancel,
  loading = false,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-4 py-2.5 bg-primary/10 border-b border-primary/20">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">
          {selectedCount}개 선택됨
        </span>
        <Button
          size="sm"
          onClick={onAddToCrm}
          disabled={loading}
          className="gap-1.5"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          CRM에 추가
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="gap-1 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
        선택 취소
      </Button>
    </div>
  );
};

export default EmailCrmActionBar;
