import React from 'react';

interface RecentSearch {
  id: string;
  type: string;
  keyword: string;
  origin?: string;
  timestamp: string;
}

const mockRecentSearches: RecentSearch[] = [
  { id: '1', type: '제품', keyword: 'INSTANT RAMEN', timestamp: '2025-12-21 17:44' },
  { id: '2', type: '제품', keyword: 'INSTANT RAMENT', timestamp: '2025-12-21 17:44' },
  { id: '3', type: '제품', keyword: 'INSTANT RAMEN', timestamp: '2025-12-21 17:43' },
  { id: '4', type: '제품', keyword: 'INSTANT NOODLE', origin: 'SOUTH KOREA', timestamp: '2025-12-21 14:44' },
  { id: '5', type: '제품', keyword: 'INSTANT NOODLE', origin: 'SOUTH KOREA', timestamp: '2025-12-21 14:43' },
  { id: '6', type: '제품', keyword: 'INSTANT NOODLE', origin: 'SOUTH KOREA', timestamp: '2025-12-21 14:43' },
  { id: '7', type: '제품', keyword: 'INSTANT NOODLE', origin: 'SOUTH KOREA', timestamp: '2025-12-21 14:43' },
  { id: '8', type: '제품', keyword: 'INSTANT NOODLE', origin: 'SOUTH KOREA', timestamp: '2025-12-21 14:42' },
];

const BLRecentSearches: React.FC = () => {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="font-semibold text-foreground mb-3">최근 검색</h3>
      <div className="space-y-2">
        {mockRecentSearches.map((search) => (
          <button
            key={search.id}
            className="w-full text-left text-sm hover:bg-muted/50 rounded px-2 py-1.5 transition-colors"
          >
            <span className="text-muted-foreground">검색 유형 : </span>
            <span className="text-primary font-medium">{search.type}</span>
            <span className="text-muted-foreground"> 키워드 : </span>
            <span className="text-primary font-medium">{search.keyword}</span>
            {search.origin && (
              <>
                <span className="text-muted-foreground"> 원산지 국가 : </span>
                <span className="text-primary font-medium">{search.origin}</span>
              </>
            )}
            <span className="text-muted-foreground ml-2 float-right">{search.timestamp}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BLRecentSearches;
