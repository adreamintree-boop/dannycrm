import React from 'react';
import { Plus, X, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchFilter, FilterType } from '@/data/blMockData';
import { cn } from '@/lib/utils';

interface BLFilterPanelProps {
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
  productName: '제품 설명',
  hsCode: 'HS 코드',
  importer: '수입자',
  exporter: '수출자'
};

const BLFilterPanel: React.FC<BLFilterPanelProps> = ({
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
    <div className="bg-card rounded-lg border border-border h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-primary">→</span>
          <h3 className="font-semibold text-foreground">필터링 기준</h3>
        </div>
        <Search className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Filter Fields */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Preset filter fields like TradeInt */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">원산지 국가</Label>
            <Select>
              <SelectTrigger className="mt-1 bg-background">
                <SelectValue placeholder="원산지 국가" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kr">South Korea</SelectItem>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="jp">Japan</SelectItem>
                <SelectItem value="cn">China</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">경유 국가</Label>
            <Select>
              <SelectTrigger className="mt-1 bg-background">
                <SelectValue placeholder="경유 국가" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sg">Singapore</SelectItem>
                <SelectItem value="hk">Hong Kong</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">목적지 국가</Label>
            <Select>
              <SelectTrigger className="mt-1 bg-background">
                <SelectValue placeholder="목적지 국가" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="de">Germany</SelectItem>
                <SelectItem value="jp">Japan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border pt-4">
          <div className="text-xs text-muted-foreground mb-3">동적 필터</div>
        </div>

        {/* Dynamic Filter Rows */}
        {filters.map((filter, index) => (
          <div key={filter.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Select
                value={filter.type}
                onValueChange={(value) => onUpdateFilter(filter.id, value as FilterType, filter.value)}
              >
                <SelectTrigger className="flex-1 bg-background text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(filterTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveFilter(filter.id)}
                className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                disabled={filters.length === 1 && !filter.value}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Input
              placeholder={`${filterTypeLabels[filter.type]} 입력...`}
              value={filter.value}
              onChange={(e) => onUpdateFilter(filter.id, filter.type, e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-background text-sm"
            />
            {index < filters.length - 1 && (
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground font-medium px-2 py-0.5 bg-muted rounded">AND</span>
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
          className="w-full gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          필터 추가
        </Button>

        {/* Additional preset filters */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div>
            <Label className="text-xs text-muted-foreground">인코텀즈</Label>
            <Select>
              <SelectTrigger className="mt-1 bg-background">
                <SelectValue placeholder="인코텀즈" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fob">FOB</SelectItem>
                <SelectItem value="cif">CIF</SelectItem>
                <SelectItem value="exw">EXW</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">가치</Label>
            <div className="flex gap-2 mt-1">
              <Input placeholder="Min." className="bg-background text-sm" />
              <span className="text-muted-foreground self-center">-</span>
              <Input placeholder="Max." className="bg-background text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">무게</Label>
            <div className="flex gap-2 mt-1">
              <Input placeholder="Min." className="bg-background text-sm" />
              <span className="text-muted-foreground self-center">-</span>
              <Input placeholder="Max." className="bg-background text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">수량</Label>
            <div className="flex gap-2 mt-1">
              <Input placeholder="Min." className="bg-background text-sm" />
              <span className="text-muted-foreground self-center">-</span>
              <Input placeholder="Max." className="bg-background text-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-border space-y-2">
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

export default BLFilterPanel;
