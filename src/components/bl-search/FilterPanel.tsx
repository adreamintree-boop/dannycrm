import React from 'react';
import { Plus, X, RotateCcw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchFilter, FilterType } from '@/data/blMockData';

interface FilterPanelProps {
  filters: SearchFilter[];
  onAddFilter: () => void;
  onRemoveFilter: (id: string) => void;
  onUpdateFilter: (id: string, type: FilterType, value: string) => void;
  onReset: () => void;
  onSearch: () => void;
  validationError: string | null;
  isLoading: boolean;
}

const filterTypeLabels: Record<FilterType, string> = {
  productName: '제품명 (Product Name)',
  hsCode: 'HS 코드 (HS Code)',
  importer: '임포터 (Importer)',
  exporter: '내보내기 (Exporter)'
};

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onAddFilter,
  onRemoveFilter,
  onUpdateFilter,
  onReset,
  onSearch,
  validationError,
  isLoading
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Filter className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">필터링 기준</h3>
      </div>

      {/* Filter Rows */}
      <div className="p-4 space-y-3">
        {filters.map((filter, index) => (
          <div key={filter.id} className="space-y-2">
            {/* Filter Type Select */}
            <Select
              value={filter.type}
              onValueChange={(value) => onUpdateFilter(filter.id, value as FilterType, filter.value)}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="필터 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(filterTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Value Input with Remove Button */}
            <div className="flex gap-2">
              <Input
                placeholder={`${filterTypeLabels[filter.type].split(' (')[0]} 입력...`}
                value={filter.value}
                onChange={(e) => onUpdateFilter(filter.id, filter.type, e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 bg-background"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveFilter(filter.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                disabled={filters.length === 1 && !filter.value}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Separator */}
            {index < filters.length - 1 && (
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">AND</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
          </div>
        ))}

        {/* Validation Error */}
        {validationError && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {validationError}
          </div>
        )}

        {/* Add Filter Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onAddFilter}
          className="w-full gap-2"
        >
          <Plus className="w-4 h-4" />
          필터 추가
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4 space-y-2">
        <Button
          onClick={onSearch}
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? '검색 중...' : '검색'}
        </Button>
        <Button
          variant="outline"
          onClick={onReset}
          className="w-full gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          필터 초기화
        </Button>
      </div>
    </div>
  );
};

export default FilterPanel;
