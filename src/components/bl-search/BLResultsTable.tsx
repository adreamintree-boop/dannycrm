import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { BLRecord, SearchFilter, highlightMatch } from '@/data/blMockData';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface BLResultsTableProps {
  results: BLRecord[];
  paginatedResults: BLRecord[];
  filters: SearchFilter[];
  mainKeyword?: string;
  startDate?: Date;
  endDate?: Date;
  isLoading: boolean;
  hasSearched: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortOrder: 'asc' | 'desc';
  onToggleSortOrder: () => void;
}

const BLResultsTable: React.FC<BLResultsTableProps> = ({
  results,
  paginatedResults,
  filters,
  mainKeyword = '',
  startDate,
  endDate,
  isLoading,
  hasSearched,
  currentPage,
  totalPages,
  onPageChange,
  sortOrder,
  onToggleSortOrder
}) => {
  const navigate = useNavigate();

  // Handle click on importer/exporter name
  const handleCompanyClick = (companyName: string, type: 'importer' | 'exporter') => {
    const searchContext = {
      companyName,
      companyType: type,
      mainKeyword,
      startDate: startDate?.toISOString().split('T')[0] || '',
      endDate: endDate?.toISOString().split('T')[0] || '',
      filters: filters.map(f => ({ type: f.type, value: f.value }))
    };
    
    navigate('/company-aggregation', { state: searchContext });
  };
  // Collect search terms for highlighting from filters AND mainKeyword
  const searchTerms = [
    ...filters
      .filter(f => (f.type === 'productName' || f.type === 'hsCode') && f.value.trim())
      .map(f => f.value.trim()),
    ...(mainKeyword.trim() ? [mainKeyword.trim()] : [])
  ];

  // Render highlighted text
  const renderHighlightedText = (text: string) => {
    if (!text || text === '-') return <span>-</span>;
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

  // Format value with fallback for missing data
  const formatValue = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null || value === '') return '-';
    return String(value);
  };

  // Format USD value with thousands separator
  const formatUSD = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '-';
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calculate row number based on pagination
  const getRowNumber = (index: number): number => {
    return (currentPage - 1) * 10 + index + 1;
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
    return null;
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
        <div className="text-foreground">
          <span className="font-semibold text-primary">{results.length.toLocaleString()}</span>
          <span className="text-muted-foreground ml-1">발견된 레코드</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">정렬 기준</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleSortOrder}
            className="gap-1"
          >
            날짜
            {sortOrder === 'desc' ? (
              <ArrowDown className="w-3 h-3" />
            ) : (
              <ArrowUp className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Results table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[50px] text-xs font-semibold sticky left-0 bg-muted/30">No.</TableHead>
                <TableHead className="min-w-[100px] text-xs font-semibold">날짜</TableHead>
                <TableHead className="min-w-[100px] text-xs font-semibold">출처 국가</TableHead>
                <TableHead className="min-w-[160px] text-xs font-semibold">수입자</TableHead>
                <TableHead className="min-w-[160px] text-xs font-semibold">수출자</TableHead>
                <TableHead className="min-w-[100px] text-xs font-semibold">HS 코드</TableHead>
                <TableHead className="min-w-[220px] text-xs font-semibold">제품 설명</TableHead>
                <TableHead className="min-w-[100px] text-xs font-semibold">수량</TableHead>
                <TableHead className="min-w-[90px] text-xs font-semibold">무게</TableHead>
                <TableHead className="min-w-[100px] text-xs font-semibold text-right">가치 (US$)</TableHead>
                <TableHead className="min-w-[100px] text-xs font-semibold">원산지 국가</TableHead>
                <TableHead className="min-w-[100px] text-xs font-semibold">목적지 국가</TableHead>
                <TableHead className="min-w-[90px] text-xs font-semibold text-center">세부 정보</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedResults.map((record, index) => (
                <TableRow key={record.id} className="hover:bg-muted/20">
                  {/* No. */}
                  <TableCell className="text-sm font-medium text-muted-foreground sticky left-0 bg-card">
                    {getRowNumber(index)}
                  </TableCell>
                  {/* 날짜 */}
                  <TableCell className="text-sm">{formatValue(record.date)}</TableCell>
                  {/* 출처 국가 */}
                  <TableCell className="text-sm">{formatValue(record.originCountry)}</TableCell>
                  {/* 수입자 */}
                  <TableCell className="text-sm">
                    <span 
                      className="text-primary hover:underline cursor-pointer font-medium"
                      onClick={() => handleCompanyClick(record.importer, 'importer')}
                    >
                      {formatValue(record.importer)}
                    </span>
                  </TableCell>
                  {/* 수출자 */}
                  <TableCell className="text-sm">
                    <span 
                      className="text-primary hover:underline cursor-pointer font-medium"
                      onClick={() => handleCompanyClick(record.exporter, 'exporter')}
                    >
                      {formatValue(record.exporter)}
                    </span>
                  </TableCell>
                  {/* HS 코드 */}
                  <TableCell className="text-sm">{formatValue(record.hsCode)}</TableCell>
                  {/* 제품 설명 */}
                  <TableCell className="text-sm max-w-[300px]">
                    <div className="whitespace-normal break-words">
                      {renderHighlightedText(record.productName)}
                    </div>
                  </TableCell>
                  {/* 수량 */}
                  <TableCell className="text-sm">{formatValue(record.quantity)}</TableCell>
                  {/* 무게 */}
                  <TableCell className="text-sm">{formatValue(record.weight)}</TableCell>
                  {/* 가치 (US$) */}
                  <TableCell className="text-sm text-right font-medium">
                    {record.valueUSD ? formatUSD(record.valueUSD) : '-'}
                  </TableCell>
                  {/* 원산지 국가 */}
                  <TableCell className="text-sm">{formatValue(record.originCountry)}</TableCell>
                  {/* 목적지 국가 */}
                  <TableCell className="text-sm">{formatValue(record.destinationCountry)}</TableCell>
                  {/* 세부 정보 */}
                  <TableCell className="text-center">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-primary gap-1">
                          세부 정보
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-[500px] sm:max-w-[500px]">
                        <SheetHeader>
                          <SheetTitle>B/L 상세 정보</SheetTitle>
                        </SheetHeader>
                        <div className="mt-6 space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">날짜</span>
                              <p className="font-medium">{formatValue(record.date)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">HS 코드</span>
                              <p className="font-medium">{formatValue(record.hsCode)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">수입자</span>
                              <p className="font-medium">{formatValue(record.importer)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">수출자</span>
                              <p className="font-medium">{formatValue(record.exporter)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">수량</span>
                              <p className="font-medium">{formatValue(record.quantity)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">무게</span>
                              <p className="font-medium">{formatValue(record.weight)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">가치 (USD)</span>
                              <p className="font-medium">${record.valueUSD ? formatUSD(record.valueUSD) : '-'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">원산지 국가</span>
                              <p className="font-medium">{formatValue(record.originCountry)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">목적지 국가</span>
                              <p className="font-medium">{formatValue(record.destinationCountry)}</p>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-sm">제품 설명</span>
                            <p className="font-medium mt-1">{formatValue(record.productName)}</p>
                          </div>
                          <div className="pt-4 border-t border-border">
                            <span className="text-xs text-muted-foreground">Raw JSON</span>
                            <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-[200px]">
                              {JSON.stringify(record, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </TableCell>
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

export default BLResultsTable;
