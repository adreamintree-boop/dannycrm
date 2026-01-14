import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BLRecord, SearchFilter, highlightMatch } from '@/data/blMockData';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface BLCompactResultsTableProps {
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
  onLoadMore: () => void;
  hasMore: boolean;
}

const BLCompactResultsTable: React.FC<BLCompactResultsTableProps> = ({
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
  onLoadMore,
  hasMore
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

  // Collect search terms for highlighting
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

  // Format value with fallback
  const formatValue = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null || value === '') return '-';
    return String(value);
  };

  // Truncate text with ellipsis
  const truncateText = (text: string, maxLength: number = 30): string => {
    if (!text || text === '-') return '-';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  // Format USD value
  const formatUSD = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '-';
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calculate row number
  const getRowNumber = (index: number): number => {
    return results.length - ((currentPage - 1) * 10 + index);
  };

  // Loading state
  if (isLoading && !hasSearched) {
    return (
      <div className="bg-white rounded-lg border border-border p-12 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground">검색 중...</p>
      </div>
    );
  }

  // Empty results
  if (hasSearched && results.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-border p-12 flex flex-col items-center justify-center text-center">
        <p className="text-lg font-medium text-foreground mb-2">검색 결과 없음</p>
        <p className="text-muted-foreground text-sm">
          선택한 검색 조건에 맞는 데이터가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Table */}
      <div className="bg-white rounded-lg border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-14 text-xs font-semibold">NO.</TableHead>
                <TableHead className="w-28 text-xs font-semibold">Trade Date</TableHead>
                <TableHead className="min-w-[180px] text-xs font-semibold">Importers</TableHead>
                <TableHead className="min-w-[180px] text-xs font-semibold">Exporters</TableHead>
                <TableHead className="min-w-[140px] text-xs font-semibold">HS Code</TableHead>
                <TableHead className="min-w-[240px] text-xs font-semibold">Commodities</TableHead>
                <TableHead className="w-20 text-xs font-semibold text-center">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedResults.map((record, index) => (
                <TableRow key={record.id} className="hover:bg-muted/20">
                  {/* NO. */}
                  <TableCell className="text-sm font-medium text-muted-foreground">
                    {getRowNumber(index)}
                  </TableCell>
                  {/* Trade Date */}
                  <TableCell className="text-sm">{formatValue(record.date)}</TableCell>
                  {/* Importers */}
                  <TableCell className="text-sm">
                    <span 
                      className="text-primary hover:underline cursor-pointer font-medium block truncate max-w-[180px]"
                      onClick={() => handleCompanyClick(record.importer, 'importer')}
                      title={record.importer}
                    >
                      {truncateText(formatValue(record.importer), 30)}
                    </span>
                  </TableCell>
                  {/* Exporters */}
                  <TableCell className="text-sm">
                    <span 
                      className="text-primary hover:underline cursor-pointer font-medium block truncate max-w-[180px]"
                      onClick={() => handleCompanyClick(record.exporter, 'exporter')}
                      title={record.exporter}
                    >
                      {truncateText(formatValue(record.exporter), 30)}
                    </span>
                  </TableCell>
                  {/* HS Code */}
                  <TableCell className="text-sm">
                    <span className="block truncate max-w-[140px]" title={record.hsCode}>
                      {truncateText(formatValue(record.hsCode), 25)}
                    </span>
                  </TableCell>
                  {/* Commodities */}
                  <TableCell className="text-sm">
                    <div className="truncate max-w-[240px]" title={record.productName}>
                      {searchTerms.length > 0 
                        ? renderHighlightedText(truncateText(record.productName, 50))
                        : truncateText(record.productName, 50)
                      }
                    </div>
                  </TableCell>
                  {/* Detail Button */}
                  <TableCell className="text-center">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 px-3 text-xs">
                          Detail
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-[500px] sm:max-w-[500px]">
                        <SheetHeader>
                          <SheetTitle>B/L 상세 정보</SheetTitle>
                        </SheetHeader>
                        <div className="mt-6 space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Trade Date</span>
                              <p className="font-medium">{formatValue(record.date)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">HS Code</span>
                              <p className="font-medium">{formatValue(record.hsCode)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Importer</span>
                              <p className="font-medium">{formatValue(record.importer)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Exporter</span>
                              <p className="font-medium">{formatValue(record.exporter)}</p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Importer Address</span>
                              <p className="font-medium">{formatValue(record.importerAddress)}</p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Exporter Address</span>
                              <p className="font-medium">{formatValue(record.exporterAddress)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Quantity</span>
                              <p className="font-medium">{formatValue(record.quantity)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Weight</span>
                              <p className="font-medium">{formatValue(record.weight)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Value (USD)</span>
                              <p className="font-medium">${record.valueUSD ? formatUSD(record.valueUSD) : '-'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Origin Country</span>
                              <p className="font-medium">{formatValue(record.originCountry)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Destination Country</span>
                              <p className="font-medium">{formatValue(record.destinationCountry)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Transit Country</span>
                              <p className="font-medium">{formatValue(record.transitCountry)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Port of Loading</span>
                              <p className="font-medium">{formatValue(record.portOfLoading)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Port of Discharge</span>
                              <p className="font-medium">{formatValue(record.portOfDischarge)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Incoterms</span>
                              <p className="font-medium">{formatValue(record.incoterms)}</p>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-sm">Product Description</span>
                            <p className="font-medium mt-1">{formatValue(record.productName)}</p>
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

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center">
          <Button 
            onClick={onLoadMore} 
            disabled={isLoading}
            className="gap-2 px-8"
          >
            <Download className="w-4 h-4" />
            {isLoading ? 'Loading...' : 'Load More Results'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default BLCompactResultsTable;
