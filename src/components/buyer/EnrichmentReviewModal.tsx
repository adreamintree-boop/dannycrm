import React, { useState } from 'react';
import { X, Check, AlertCircle, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EnrichedData {
  country?: string;
  address?: string;
  website?: string;
  phone?: string;
  email?: string;
  facebook_url?: string;
  linkedin_url?: string;
  youtube_url?: string;
  notes?: string;
  confidence?: {
    address?: number;
    website?: number;
    phone?: number;
    email?: number;
  };
}

interface CurrentData {
  country?: string;
  address?: string;
  website?: string;
  phone?: string;
  email?: string;
  facebook_url?: string;
  linkedin_url?: string;
  youtube_url?: string;
}

interface EnrichmentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrichedData: EnrichedData;
  currentData: CurrentData;
  onApply: (selectedFields: string[]) => void;
}

const fieldLabels: Record<string, string> = {
  country: '국가',
  address: '주소',
  website: '웹사이트',
  phone: '전화번호',
  email: '이메일',
  facebook_url: '페이스북',
  linkedin_url: '링크드인',
  youtube_url: '유튜브',
};

const EnrichmentReviewModal: React.FC<EnrichmentReviewModalProps> = ({
  isOpen,
  onClose,
  enrichedData,
  currentData,
  onApply,
}) => {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const fields = ['country', 'address', 'website', 'phone', 'email', 'facebook_url', 'linkedin_url', 'youtube_url'];

  const getConfidenceColor = (confidence: number | undefined) => {
    if (confidence === undefined) return 'bg-muted text-muted-foreground';
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  const getConfidence = (field: string): number | undefined => {
    if (field === 'country') return 0.9; // Country is usually reliable
    return enrichedData.confidence?.[field as keyof typeof enrichedData.confidence];
  };

  const hasNewValue = (field: string) => {
    const newValue = enrichedData[field as keyof EnrichedData];
    const currentValue = currentData[field as keyof CurrentData];
    return newValue && newValue !== currentValue;
  };

  const toggleField = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const selectAll = () => {
    const newFields = fields.filter(f => hasNewValue(f) && !currentData[f as keyof CurrentData]);
    setSelectedFields(newFields);
  };

  const handleApply = () => {
    onApply(selectedFields);
    onClose();
  };

  const renderValue = (value: string | undefined, isUrl = false) => {
    if (!value) return <span className="text-muted-foreground italic">없음</span>;
    if (isUrl) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline flex items-center gap-1 text-sm truncate max-w-[200px]"
        >
          {value}
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      );
    }
    return <span className="text-sm truncate max-w-[200px]">{value}</span>;
  };

  const fieldsWithChanges = fields.filter(f => hasNewValue(f));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            AI 추천 정보 검토
          </DialogTitle>
          <DialogDescription className="sr-only">
            AI가 찾은 회사 정보 후보를 검토하고 적용할 필드를 선택합니다.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          {fieldsWithChanges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>새로운 정보를 찾지 못했습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fieldsWithChanges.map(field => {
                const currentValue = currentData[field as keyof CurrentData];
                const newValue = enrichedData[field as keyof EnrichedData] as string;
                const confidence = getConfidence(field);
                const isUrl = field.includes('url') || field === 'website';
                const hasExisting = Boolean(currentValue);

                return (
                  <div
                    key={field}
                    className={`p-4 rounded-lg border ${
                      selectedFields.includes(field) ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={field}
                        checked={selectedFields.includes(field)}
                        onCheckedChange={() => toggleField(field)}
                        disabled={hasExisting}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <label
                            htmlFor={field}
                            className="font-medium text-foreground cursor-pointer"
                          >
                            {fieldLabels[field]}
                          </label>
                          {confidence !== undefined && (
                            <Badge className={getConfidenceColor(confidence)}>
                              신뢰도 {Math.round(confidence * 100)}%
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">현재 값</div>
                            {renderValue(currentValue, isUrl)}
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">AI 추천</div>
                            {renderValue(newValue, isUrl)}
                          </div>
                        </div>
                        {hasExisting && (
                          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            이미 값이 있어 덮어쓸 수 없습니다
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {enrichedData.notes && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-xs font-medium text-muted-foreground mb-1">AI 분석 노트</div>
            <p className="text-sm text-foreground">{enrichedData.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            빈 필드 전체 선택
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button
              onClick={handleApply}
              disabled={selectedFields.length === 0}
            >
              선택 적용 ({selectedFields.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnrichmentReviewModal;
