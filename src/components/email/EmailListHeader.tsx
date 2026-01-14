import React from 'react';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface EmailListHeaderProps {
  title: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onDelete?: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
}

const EmailListHeader: React.FC<EmailListHeaderProps> = ({
  title,
  searchQuery,
  onSearchChange,
  selectedCount,
  totalCount,
  allSelected,
  onSelectAll,
  onDelete,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
}) => {
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <div className="border-b border-border">
      {/* Title and Search row */}
      <div className="flex items-center gap-4 px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="메일 검색"
              className="pl-9 pr-10 h-9 bg-muted/50 border-border rounded-lg text-sm"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected && totalCount > 0}
              onCheckedChange={onSelectAll}
              className="data-[state=checked]:bg-primary"
            />
            <span className="text-sm text-muted-foreground">전체선택</span>
          </div>
          {selectedCount > 0 && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-sm text-muted-foreground hover:text-destructive h-7 px-2"
            >
              삭제
            </Button>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {totalCount > 0 ? `${totalCount}개 중 ${startItem}-${endItem}` : '0개'}
          </span>
          <div className="flex items-center">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 hover:bg-muted rounded disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1 hover:bg-muted rounded disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailListHeader;
