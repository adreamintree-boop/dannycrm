import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EnhancedDatePicker } from '@/components/ui/enhanced-date-picker';
import { cn } from '@/lib/utils';

export type SearchCategory = 'importer' | 'exporter' | 'product' | 'hscode';

interface Tab {
  id: SearchCategory;
  label: string;
}

const tabs: Tab[] = [
  { id: 'importer', label: 'Importers' },
  { id: 'exporter', label: 'Exporters' },
  { id: 'product', label: 'Commodities' },
  { id: 'hscode', label: 'HS CODE' },
];

interface BLSearchHeaderProps {
  searchKeyword: string;
  onSearchKeywordChange: (value: string) => void;
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onSearch: () => void;
  isLoading: boolean;
  searchCategory: SearchCategory;
  onSearchCategoryChange: (category: SearchCategory) => void;
  onViewSummary?: () => void;
  showViewSummary?: boolean;
}

const BLSearchHeader: React.FC<BLSearchHeaderProps> = ({
  searchKeyword,
  onSearchKeywordChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onSearch,
  isLoading,
  searchCategory,
  onSearchCategoryChange,
  onViewSummary,
  showViewSummary = false
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="bg-white border-b border-border">
      {/* Search Row */}
      <div className="px-6 py-4 flex items-center gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSearchCategoryChange(tab.id)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors rounded-md",
                searchCategory === tab.id
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex-1 relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Separate multiple searches with ';' (min. 2 characters)"
            value={searchKeyword}
            onChange={(e) => onSearchKeywordChange(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 h-10 bg-white border-border"
          />
        </div>

        {/* Search Button */}
        <Button 
          onClick={onSearch} 
          disabled={isLoading} 
          className="h-10 px-6"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Date Range */}
        <div className="flex items-center gap-2 shrink-0">
          <EnhancedDatePicker
            date={startDate}
            onDateChange={onStartDateChange}
            placeholder="From"
            maxDate={endDate}
          />
          <span className="text-muted-foreground">~</span>
          <EnhancedDatePicker
            date={endDate}
            onDateChange={onEndDateChange}
            placeholder="To"
            minDate={startDate}
          />
        </div>

        {/* View Summary Button */}
        {showViewSummary && (
          <Button
            variant="outline"
            onClick={onViewSummary}
            className="h-10 shrink-0"
          >
            View Summary
          </Button>
        )}
      </div>
    </div>
  );
};

export default BLSearchHeader;
