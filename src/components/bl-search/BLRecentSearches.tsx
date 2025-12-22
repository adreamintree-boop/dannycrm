import React from 'react';
import { format } from 'date-fns';
import { useBLSearchHistory, BLSearchHistoryItem } from '@/hooks/useBLSearchHistory';
import { Loader2 } from 'lucide-react';

interface BLRecentSearchesProps {
  onSelectHistory: (item: BLSearchHistoryItem) => void;
}

const BLRecentSearches: React.FC<BLRecentSearchesProps> = ({ onSelectHistory }) => {
  const { history, isLoading, getSearchTypeLabel } = useBLSearchHistory();

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="font-semibold text-foreground mb-3">최근 검색</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="font-semibold text-foreground mb-3">최근 검색</h3>
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">최근 검색 내역이 없습니다.</p>
        </div>
      </div>
    );
  }

  // Get filter summary for display
  const getFilterSummary = (item: BLSearchHistoryItem): string => {
    const parts: string[] = [];
    
    // Show active filters
    item.filters_json.forEach(f => {
      if (f.value) {
        const typeLabels: Record<string, string> = {
          productName: '제품명',
          hsCode: 'HS코드',
          importer: '수입자',
          exporter: '수출자',
        };
        parts.push(`${typeLabels[f.type] || f.type}: ${f.value}`);
      }
    });

    return parts.slice(0, 2).join(' / '); // Show max 2 filters
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="font-semibold text-foreground mb-3">최근 검색</h3>
      <div className="space-y-2">
        {history.map((item) => {
          const filterSummary = getFilterSummary(item);
          const timestamp = format(new Date(item.last_opened_at), 'yyyy-MM-dd HH:mm');

          return (
            <button
              key={item.id}
              onClick={() => onSelectHistory(item)}
              className="w-full text-left text-sm hover:bg-muted/50 rounded px-2 py-1.5 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-muted-foreground">검색 유형 : </span>
                  <span className="text-primary font-medium">{getSearchTypeLabel(item.search_type)}</span>
                  {item.keyword && (
                    <>
                      <span className="text-muted-foreground"> 키워드 : </span>
                      <span className="text-primary font-medium">{item.keyword}</span>
                    </>
                  )}
                  {filterSummary && (
                    <>
                      <span className="text-muted-foreground"> {filterSummary}</span>
                    </>
                  )}
                </div>
                <span className="text-muted-foreground text-xs whitespace-nowrap">{timestamp}</span>
              </div>
              {item.result_total_count > 0 && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  결과: {item.result_total_count.toLocaleString()}건
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BLRecentSearches;
