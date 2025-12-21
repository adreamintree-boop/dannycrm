import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { BLRecord, SearchFilter, highlightMatch } from '@/data/blMockData';

interface ResultsTableProps {
  results: BLRecord[];
  paginatedResults: BLRecord[];
  filters: SearchFilter[];
  isLoading: boolean;
  hasSearched: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortOrder: 'asc' | 'desc';
  onToggleSortOrder: () => void;
}

const ResultsTable: React.FC<ResultsTableProps> = ({
  results,
  paginatedResults,
  filters,
  isLoading,
  hasSearched,
  currentPage,
  totalPages,
  onPageChange,
  sortOrder,
  onToggleSortOrder
}) => {
  // Get search terms for highlighting from productName filters
  const searchTerms = filters
    .filter(f => f.type === 'productName' && f.value.trim())
    .map(f => f.value.trim());

  // Render highlighted text
  const renderHighlightedText = (text: string) => {
    const segments = highlightMatch(text, searchTerms);
    return (
      <span>
        {segments.map((segment, index) => (
          segment.highlighted ? (
            <mark key={index} className="bg-yellow-300 text-foreground px-0.5 rounded">
              {segment.text}
            </mark>
          ) : (
            <span key={index}>{segment.text}</span>
          )
        ))}
      </span>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground">검색 중...</p>
      </div>
    );
  }

  // Initial state (no search yet)
  if (!hasSearched) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 flex flex-col items-center justify-center text-center">
        <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">B/L 데이터 검색</h3>
        <p className="text-muted-foreground max-w-md">
          오른쪽 필터 패널에서 검색 조건을 입력하고 검색 버튼을 클릭하세요.
        </p>
      </div>
    );
  }

  // Empty results
  if (results.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 flex flex-col items-center justify-center text-center">
        <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">검색 결과 없음</h3>
        <p className="text-muted-foreground">
          조건에 맞는 데이터가 없습니다. 필터를 조정해 보세요.
        </p>
      </div>
    );
  }

  // Generate page numbers
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  return (
    <div className="space-y-4">
      {/* Results header */}
      <div className="flex items-center justify-between">
        <div className="text-primary font-medium">
          {results.length.toLocaleString()} 발견된 레코드
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">정렬 기준</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleSortOrder}
            className="gap-2"
          >
            날짜
            {sortOrder === 'desc' ? (
              <ArrowDown className="w-4 h-4" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Results table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="min-w-[100px]">날짜</TableHead>
                <TableHead className="min-w-[100px]">출처 국가</TableHead>
                <TableHead className="min-w-[160px]">임포터</TableHead>
                <TableHead className="min-w-[160px]">내보내기</TableHead>
                <TableHead className="min-w-[100px]">HS 코드</TableHead>
                <TableHead className="min-w-[200px]">제품 설명</TableHead>
                <TableHead className="min-w-[80px] text-right">수량</TableHead>
                <TableHead className="min-w-[80px] text-right">무게</TableHead>
                <TableHead className="min-w-[100px] text-right">가치 (US$)</TableHead>
                <TableHead className="min-w-[100px]">원산지 국가</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedResults.map((record, index) => (
                <TableRow key={record.id} className="hover:bg-muted/30">
                  <TableCell className="text-center text-muted-foreground">
                    {(currentPage - 1) * 10 + index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{record.date}</TableCell>
                  <TableCell>{record.destinationCountry}</TableCell>
                  <TableCell className="text-primary font-medium truncate max-w-[200px]" title={record.importer}>
                    {record.importer}
                  </TableCell>
                  <TableCell className="text-primary font-medium truncate max-w-[200px]" title={record.exporter}>
                    {record.exporter}
                  </TableCell>
                  <TableCell>{record.hsCode}</TableCell>
                  <TableCell className="max-w-[250px]">
                    <div className="truncate" title={record.productName}>
                      {renderHighlightedText(record.productName)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{record.quantity}</TableCell>
                  <TableCell className="text-right">{record.weight}</TableCell>
                  <TableCell className="text-right font-medium">
                    {record.valueUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>{record.originCountry}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            
            {getPageNumbers().map(page => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => onPageChange(page)}
                  isActive={page === currentPage}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            
            <PaginationItem>
              <PaginationNext
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default ResultsTable;
