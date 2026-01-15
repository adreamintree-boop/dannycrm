import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Globe, MapPin, DollarSign, Link2, Package, Mail, Phone, Loader2 } from 'lucide-react';
import { EnrichedData } from '@/hooks/useBuyerEnrichment';

interface FieldSuggestion {
  key: string;
  label: string;
  icon: React.ReactNode;
  current: string;
  suggested: string;
  selected: boolean;
  confidence?: number;
}

interface AIRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  enrichedData: EnrichedData | null;
  currentFormData: {
    country: string;
    address: string;
    revenue: string;
    revenueCurrency: string;
    websiteUrl: string;
    mainProducts: string;
    email: string;
    phone: string;
    facebookUrl: string;
    linkedinUrl: string;
    youtubeUrl: string;
  };
  onApply: (selectedFields: Record<string, string>) => void;
}

const fieldConfig: {
  key: string;
  label: string;
  icon: React.ReactNode;
  enrichedKey: keyof EnrichedData;
  formKey: string;
}[] = [
  { key: 'country', label: 'Country', icon: <Globe className="w-5 h-5" />, enrichedKey: 'country', formKey: 'country' },
  { key: 'address', label: 'Address', icon: <MapPin className="w-5 h-5" />, enrichedKey: 'address', formKey: 'address' },
  { key: 'website', label: 'Website', icon: <Link2 className="w-5 h-5" />, enrichedKey: 'website', formKey: 'websiteUrl' },
  { key: 'email', label: 'Primary Email', icon: <Mail className="w-5 h-5" />, enrichedKey: 'email', formKey: 'email' },
  { key: 'phone', label: 'Phone', icon: <Phone className="w-5 h-5" />, enrichedKey: 'phone', formKey: 'phone' },
];

const AIRecommendationModal: React.FC<AIRecommendationModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  enrichedData,
  currentFormData,
  onApply,
}) => {
  const [suggestions, setSuggestions] = useState<FieldSuggestion[]>([]);

  // Calculate average confidence
  const averageConfidence = useMemo(() => {
    if (!enrichedData?.confidence) return null;
    const values = Object.values(enrichedData.confidence).filter((v): v is number => typeof v === 'number');
    if (values.length === 0) return null;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100);
  }, [enrichedData]);

  // Initialize suggestions when enrichedData changes
  useEffect(() => {
    if (!enrichedData) {
      setSuggestions([]);
      return;
    }

    const newSuggestions: FieldSuggestion[] = fieldConfig
      .map(field => {
        const suggested = enrichedData[field.enrichedKey] as string | undefined;
        const current = currentFormData[field.formKey as keyof typeof currentFormData] || '';
        const confidence = enrichedData.confidence?.[field.enrichedKey as keyof typeof enrichedData.confidence];

        return {
          key: field.key,
          label: field.label,
          icon: field.icon,
          current: current || '',
          suggested: suggested || '',
          // Auto-select if suggested value exists and is different from current
          selected: Boolean(suggested && suggested !== current),
          confidence: typeof confidence === 'number' ? confidence : undefined,
        };
      })
      .filter(s => s.suggested); // Only show fields with suggestions

    setSuggestions(newSuggestions);
  }, [enrichedData, currentFormData]);

  const toggleField = (key: string) => {
    setSuggestions(prev =>
      prev.map(s => (s.key === key ? { ...s, selected: !s.selected } : s))
    );
  };

  const selectAllEmpty = () => {
    setSuggestions(prev =>
      prev.map(s => ({
        ...s,
        selected: s.suggested && (!s.current || s.current.trim() === ''),
      }))
    );
  };

  const handleApply = () => {
    const selectedFields: Record<string, string> = {};
    
    suggestions.forEach(s => {
      if (s.selected && s.suggested) {
        // Map back to form field key
        const config = fieldConfig.find(f => f.key === s.key);
        if (config) {
          selectedFields[config.formKey] = s.suggested;
        }
      }
    });

    onApply(selectedFields);
  };

  const selectedCount = suggestions.filter(s => s.selected).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="w-5 h-5 text-primary" />
            AI 추천 정보
          </DialogTitle>
          {averageConfidence !== null && (
            <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5">
              신뢰도 {averageConfidence}%
            </Badge>
          )}
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[55vh]">
          <div className="p-6 space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">AI가 정보를 검색하고 있습니다...</p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">추천할 새로운 정보를 찾지 못했습니다.</p>
              </div>
            ) : (
              suggestions.map(suggestion => (
                <div
                  key={suggestion.key}
                  onClick={() => toggleField(suggestion.key)}
                  className={`
                    relative p-4 rounded-xl border-2 cursor-pointer transition-all
                    ${suggestion.selected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-muted-foreground/30'
                    }
                  `}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center shrink-0
                      ${suggestion.selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
                    `}>
                      {suggestion.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground mb-2">
                        {suggestion.label}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-baseline gap-2">
                          <span className="text-muted-foreground shrink-0 w-14">현재 값</span>
                          <span className={`truncate ${suggestion.current ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                            {suggestion.current || '-'}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-muted-foreground shrink-0 w-14">AI 추천</span>
                          <span className="text-primary font-medium truncate">
                            {suggestion.suggested}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Checkbox */}
                    <div className="shrink-0 pt-1">
                      <Checkbox
                        checked={suggestion.selected}
                        onCheckedChange={() => toggleField(suggestion.key)}
                        className="w-5 h-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {!isLoading && suggestions.length > 0 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card">
            <label
              className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={selectAllEmpty}
            >
              <Checkbox
                checked={suggestions.filter(s => !s.current || s.current.trim() === '').every(s => s.selected)}
                onCheckedChange={selectAllEmpty}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              빈 필드 전체 선택
            </label>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button
                onClick={handleApply}
                disabled={selectedCount === 0}
                className="min-w-[100px]"
              >
                선택적용
              </Button>
            </div>
          </div>
        )}

        {/* Loading or empty state footer */}
        {(isLoading || suggestions.length === 0) && (
          <div className="px-6 py-4 border-t border-border flex justify-end bg-card">
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AIRecommendationModal;
