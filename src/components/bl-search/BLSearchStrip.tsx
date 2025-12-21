import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EnhancedDatePicker } from '@/components/ui/enhanced-date-picker';
import { cn } from '@/lib/utils';

export type SearchCategory = 'product' | 'hscode' | 'importer' | 'exporter' | 'bl';

interface Tab {
  id: SearchCategory;
  label: string;
  placeholder: string;
}

const tabs: Tab[] = [
  { id: 'product', label: '제품', placeholder: '제품 이름 또는 설명을 입력하세요' },
  { id: 'hscode', label: 'HS 코드', placeholder: 'HS 코드를 입력하세요' },
  { id: 'importer', label: '수입자', placeholder: '수입자명을 입력하세요' },
  { id: 'exporter', label: '수출자', placeholder: '수출자명을 입력하세요' },
  { id: 'bl', label: 'B/L', placeholder: 'B/L 번호를 입력하세요' },
];

interface BLSearchStripProps {
  searchKeyword: string;
  onSearchKeywordChange: (value: string) => void;
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onSearch: () => void;
  onImport: () => void;
  isLoading: boolean;
  searchCategory: SearchCategory;
  onSearchCategoryChange: (category: SearchCategory) => void;
}

const BLSearchStrip: React.FC<BLSearchStripProps> = ({
  searchKeyword,
  onSearchKeywordChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onSearch,
  onImport,
  isLoading,
  searchCategory,
  onSearchCategoryChange
}) => {
  const currentPlaceholder = tabs.find(t => t.id === searchCategory)?.placeholder || '';

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="bg-card border-b border-border">
      {/* Title and World Badge */}
      <div className="px-6 pt-5 pb-3 flex items-center gap-4">
        <h1 className="text-xl font-bold text-foreground">다음에서 거래 데이터 검색</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background text-sm">
          <Globe className="w-4 h-4 text-primary" />
          <span>세계</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-primary font-medium">가져오기</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSearchCategoryChange(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative",
              searchCategory === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {searchCategory === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </button>
        ))}
      </div>

      {/* Search Strip */}
      <div className="px-6 py-4 flex items-center gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={currentPlaceholder}
            value={searchKeyword}
            onChange={(e) => onSearchKeywordChange(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 h-10 bg-background border-border"
          />
        </div>

        {/* Date Pickers with 3-year rolling restriction */}
        <EnhancedDatePicker
          date={startDate}
          onDateChange={onStartDateChange}
          placeholder="시작일"
          maxDate={endDate}
        />

        <EnhancedDatePicker
          date={endDate}
          onDateChange={onEndDateChange}
          placeholder="종료일"
          minDate={startDate}
        />

        {/* Action Buttons */}
        <Button variant="outline" size="icon" className="h-10 w-10">
          <SlidersHorizontal className="w-4 h-4" />
        </Button>

        <Button variant="secondary" onClick={onImport} className="h-10">
          가져오기
        </Button>

        <Button onClick={onSearch} disabled={isLoading} className="h-10 px-6">
          {isLoading ? '검색 중...' : '검색'}
        </Button>
      </div>
    </div>
  );
};

export default BLSearchStrip;
