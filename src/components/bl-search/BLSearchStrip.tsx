import React, { useState } from 'react';
import { Search, SlidersHorizontal, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type TabType = 'product' | 'hscode' | 'company' | 'importer' | 'exporter' | 'bl';

interface Tab {
  id: TabType;
  label: string;
  placeholder: string;
}

const tabs: Tab[] = [
  { id: 'product', label: '제품', placeholder: '제품 이름 또는 설명을 입력하세요' },
  { id: 'hscode', label: 'HS 코드', placeholder: 'HS 코드를 입력하세요' },
  { id: 'company', label: '회사', placeholder: '회사명을 입력하세요' },
  { id: 'importer', label: '임포터', placeholder: '수입자명을 입력하세요' },
  { id: 'exporter', label: '내보내기', placeholder: '수출자명을 입력하세요' },
  { id: 'bl', label: 'B/L', placeholder: '제품 이름 또는 설명을 입력하세요' },
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
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('bl');

  const currentPlaceholder = tabs.find(t => t.id === activeTab)?.placeholder || '';

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
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors relative",
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
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

        {/* Date Pickers */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 w-[130px] justify-start font-normal">
              {startDate ? format(startDate, 'yyyy-MM-dd') : '시작일'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={onStartDateChange}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 w-[130px] justify-start font-normal">
              {endDate ? format(endDate, 'yyyy-MM-dd') : '종료일'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={onEndDateChange}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

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
