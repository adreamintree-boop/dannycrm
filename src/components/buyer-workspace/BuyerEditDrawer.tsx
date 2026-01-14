import React, { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CountrySelect } from '@/components/ui/country-select';
import { Sparkles, Loader2, ChevronDown, ExternalLink, MapPin } from 'lucide-react';
import { Buyer } from '@/data/mockData';
import { useApp } from '@/context/AppContext';
import { useBuyerEnrichment, EnrichedData, BuyerHints, ExistingFields } from '@/hooks/useBuyerEnrichment';
import { toast } from '@/hooks/use-toast';
import { getCountries, Country, findCountry } from '@/data/countryData';

interface BuyerEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  buyer: Buyer;
  onSaved?: () => void;
}

interface FormData {
  name: string;
  country: string;
  address: string;
  websiteUrl: string;
  revenue: string;
  revenueCurrency: string;
  mainProducts: string;
  email: string;
  phone: string;
  facebookUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
}

interface AIEvidence {
  field: string;
  sources: string[];
}

const BuyerEditDrawer: React.FC<BuyerEditDrawerProps> = ({
  isOpen,
  onClose,
  buyer,
  onSaved,
}) => {
  const { updateBuyer } = useApp();
  const { enrichBuyer, isLoading: isEnriching, canEnrich, creditCost } = useBuyerEnrichment();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    country: '',
    address: '',
    websiteUrl: '',
    revenue: '',
    revenueCurrency: 'USD',
    mainProducts: '',
    email: '',
    phone: '',
    facebookUrl: '',
    linkedinUrl: '',
    youtubeUrl: '',
  });
  
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [aiEvidence, setAIEvidence] = useState<AIEvidence[]>([]);
  const [aiUpdatedFields, setAIUpdatedFields] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  
  // Initialize form data when buyer changes or drawer opens
  useEffect(() => {
    if (isOpen && buyer) {
      setFormData({
        name: buyer.name || '',
        country: buyer.country || '',
        address: buyer.address || '',
        websiteUrl: buyer.websiteUrl || '',
        revenue: buyer.revenue || '',
        revenueCurrency: buyer.revenueCurrency || 'USD',
        mainProducts: buyer.mainProducts || '',
        email: buyer.email || '',
        phone: buyer.phone || '',
        facebookUrl: buyer.facebookUrl || '',
        linkedinUrl: buyer.linkedinUrl || '',
        youtubeUrl: buyer.youtubeUrl || '',
      });
      setAIEvidence([]);
      setAIUpdatedFields(new Set());
      setOverwriteExisting(false);
    }
  }, [isOpen, buyer]);
  
  // Get countries for selector
  const countries = getCountries();

  const handleChange = useCallback((field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  }, []);
  
  const handleCountryChange = useCallback((country: Country | null) => {
    setFormData(prev => ({ ...prev, country: country?.nameKo || '' }));
  }, []);
  
  const handleAIAutoFill = async () => {
    if (!buyer.id) return;
    
    // Prepare hints from current form state + buyer metadata
    const hints: BuyerHints = {
      website: formData.websiteUrl || undefined,
      hs_code: buyer.blHsCode || undefined,
      product_desc: buyer.blProductDesc || undefined,
      sourceCountryFromBL: !!buyer.blDestinationCountry,
    };
    
    // Prepare existing fields from current form
    const existingFields: ExistingFields = {
      address: formData.address || undefined,
      website: formData.websiteUrl || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
    };
    
    const result = await enrichBuyer(
      buyer.id,
      formData.name || buyer.name,
      formData.country || buyer.country,
      existingFields,
      hints
    );
    
    if (result.success && result.enrichedData) {
      applyEnrichedData(result.enrichedData);
      toast({
        title: 'AI 자동 채우기 완료',
        description: 'AI가 찾은 정보를 폼에 적용했습니다.',
      });
    }
  };
  
  const applyEnrichedData = (enrichedData: EnrichedData) => {
    const updatedFields = new Set<string>();
    const evidence: AIEvidence[] = [];
    
    const applyField = (
      formField: keyof FormData,
      enrichedValue: string | undefined,
      confidenceScore?: number
    ) => {
      if (!enrichedValue) return;
      
      const currentValue = formData[formField];
      const isEmpty = !currentValue || currentValue.trim() === '';
      
      // Apply if field is empty OR overwrite is enabled
      if (isEmpty || overwriteExisting) {
        setFormData(prev => ({ ...prev, [formField]: enrichedValue }));
        updatedFields.add(formField);
        
        // Add evidence if confidence exists
        if (confidenceScore !== undefined) {
          evidence.push({
            field: formField,
            sources: [`신뢰도: ${Math.round(confidenceScore * 100)}%`],
          });
        }
      }
    };
    
    // Map enriched data to form fields
    if (enrichedData.country) {
      applyField('country', enrichedData.country, enrichedData.confidence?.country);
    }
    if (enrichedData.address) {
      applyField('address', enrichedData.address, enrichedData.confidence?.address);
    }
    if (enrichedData.website) {
      applyField('websiteUrl', enrichedData.website, enrichedData.confidence?.website);
    }
    if (enrichedData.phone) {
      applyField('phone', enrichedData.phone, enrichedData.confidence?.phone);
    }
    if (enrichedData.email) {
      applyField('email', enrichedData.email, enrichedData.confidence?.email);
    }
    if (enrichedData.facebook_url) {
      applyField('facebookUrl', enrichedData.facebook_url, enrichedData.confidence?.facebook_url);
    }
    if (enrichedData.linkedin_url) {
      applyField('linkedinUrl', enrichedData.linkedin_url, enrichedData.confidence?.linkedin_url);
    }
    if (enrichedData.youtube_url) {
      applyField('youtubeUrl', enrichedData.youtube_url, enrichedData.confidence?.youtube_url);
    }
    
    setAIUpdatedFields(updatedFields);
    setAIEvidence(evidence);
    
    if (evidence.length > 0) {
      setIsEvidenceOpen(true);
    }
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateBuyer(buyer.id, {
        name: formData.name,
        country: formData.country,
        address: formData.address,
        websiteUrl: formData.websiteUrl,
        revenue: formData.revenue,
        revenueCurrency: formData.revenueCurrency,
        mainProducts: formData.mainProducts,
        email: formData.email,
        phone: formData.phone,
        facebookUrl: formData.facebookUrl,
        linkedinUrl: formData.linkedinUrl,
        youtubeUrl: formData.youtubeUrl,
      });
      
      toast({
        title: '저장 완료',
        description: '바이어 정보가 업데이트되었습니다.',
      });
      
      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Failed to save buyer:', error);
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: '바이어 정보를 저장하지 못했습니다.',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const openGoogleMaps = () => {
    if (formData.address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.address)}`, '_blank');
    }
  };
  
  const fieldLabels: Record<string, string> = {
    name: '회사명',
    country: '국가',
    address: '주소',
    websiteUrl: '웹사이트',
    revenue: '매출',
    mainProducts: '주요 제품',
    email: 'Primary Email',
    phone: 'Phone',
    facebookUrl: 'Facebook',
    linkedinUrl: 'LinkedIn',
    youtubeUrl: 'YouTube',
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[min(920px,60vw)] sm:max-w-[920px] p-0 flex flex-col"
      >
        <SheetHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg font-semibold">바이어 정보 수정</SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                {buyer.name}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-3">
              {/* Overwrite toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  id="overwrite-toggle"
                  checked={overwriteExisting}
                  onCheckedChange={setOverwriteExisting}
                />
                <Label htmlFor="overwrite-toggle" className="text-sm text-muted-foreground cursor-pointer">
                  기존 값 덮어쓰기
                </Label>
              </div>
              
              {/* AI Auto-Fill button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAIAutoFill}
                disabled={isEnriching || !canEnrich}
                className="gap-2"
              >
                {isEnriching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                AI Auto-Fill
                <Badge variant="secondary" className="ml-1 text-xs">
                  {creditCost} credits
                </Badge>
              </Button>
            </div>
          </div>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <div className="px-6 py-6 space-y-6">
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                {fieldLabels.name}
                {aiUpdatedFields.has('name') && (
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">AI</Badge>
                )}
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleChange('name')}
                placeholder="회사명을 입력하세요"
              />
            </div>
            
            {/* Country */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {fieldLabels.country}
                {aiUpdatedFields.has('country') && (
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">AI</Badge>
                )}
              </Label>
              <CountrySelect
                countries={countries}
                value={findCountry(formData.country)?.code || ''}
                onValueChange={handleCountryChange}
              />
            </div>
            
            {/* Address with map preview */}
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                {fieldLabels.address}
                {aiUpdatedFields.has('address') && (
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">AI</Badge>
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="address"
                  value={formData.address}
                  onChange={handleChange('address')}
                  placeholder="주소를 입력하세요"
                  className="flex-1"
                />
                {formData.address && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={openGoogleMaps}
                    title="Google Maps에서 보기"
                  >
                    <MapPin className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Sales (Revenue) */}
            <div className="space-y-2">
              <Label>{fieldLabels.revenue}</Label>
              <div className="flex gap-2">
                <select
                  value={formData.revenueCurrency}
                  onChange={(e) => setFormData(prev => ({ ...prev, revenueCurrency: e.target.value }))}
                  className="w-24 h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="USD">USD</option>
                  <option value="KRW">KRW</option>
                  <option value="EUR">EUR</option>
                  <option value="JPY">JPY</option>
                  <option value="CNY">CNY</option>
                </select>
                <Input
                  value={formData.revenue}
                  onChange={handleChange('revenue')}
                  placeholder="매출액"
                  className="flex-1"
                />
              </div>
            </div>
            
            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="websiteUrl" className="flex items-center gap-2">
                {fieldLabels.websiteUrl}
                {aiUpdatedFields.has('websiteUrl') && (
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">AI</Badge>
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="websiteUrl"
                  type="url"
                  value={formData.websiteUrl}
                  onChange={handleChange('websiteUrl')}
                  placeholder="https://example.com"
                  className="flex-1"
                />
                {formData.websiteUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(formData.websiteUrl.startsWith('http') ? formData.websiteUrl : `https://${formData.websiteUrl}`, '_blank')}
                    title="웹사이트 열기"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Products */}
            <div className="space-y-2">
              <Label htmlFor="mainProducts">{fieldLabels.mainProducts}</Label>
              <Textarea
                id="mainProducts"
                value={formData.mainProducts}
                onChange={handleChange('mainProducts')}
                placeholder="주요 제품을 입력하세요"
                rows={3}
              />
            </div>
            
            {/* Contact Information */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-medium text-foreground mb-4">연락처 정보</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Primary Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    {fieldLabels.email}
                    {aiUpdatedFields.has('email') && (
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">AI</Badge>
                    )}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange('email')}
                    placeholder="email@example.com"
                  />
                </div>
                
                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    {fieldLabels.phone}
                    {aiUpdatedFields.has('phone') && (
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">AI</Badge>
                    )}
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange('phone')}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
            </div>
            
            {/* Social Links */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-medium text-foreground mb-4">소셜 링크</h3>
              <div className="space-y-4">
                {/* Facebook */}
                <div className="space-y-2">
                  <Label htmlFor="facebookUrl" className="flex items-center gap-2">
                    {fieldLabels.facebookUrl}
                    {aiUpdatedFields.has('facebookUrl') && (
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">AI</Badge>
                    )}
                  </Label>
                  <Input
                    id="facebookUrl"
                    type="url"
                    value={formData.facebookUrl}
                    onChange={handleChange('facebookUrl')}
                    placeholder="https://facebook.com/company"
                  />
                </div>
                
                {/* LinkedIn */}
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl" className="flex items-center gap-2">
                    {fieldLabels.linkedinUrl}
                    {aiUpdatedFields.has('linkedinUrl') && (
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">AI</Badge>
                    )}
                  </Label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    value={formData.linkedinUrl}
                    onChange={handleChange('linkedinUrl')}
                    placeholder="https://linkedin.com/company/name"
                  />
                </div>
                
                {/* YouTube */}
                <div className="space-y-2">
                  <Label htmlFor="youtubeUrl" className="flex items-center gap-2">
                    {fieldLabels.youtubeUrl}
                    {aiUpdatedFields.has('youtubeUrl') && (
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">AI</Badge>
                    )}
                  </Label>
                  <Input
                    id="youtubeUrl"
                    type="url"
                    value={formData.youtubeUrl}
                    onChange={handleChange('youtubeUrl')}
                    placeholder="https://youtube.com/@channel"
                  />
                </div>
              </div>
            </div>
            
            {/* AI Evidence Section */}
            {aiEvidence.length > 0 && (
              <Collapsible open={isEvidenceOpen} onOpenChange={setIsEvidenceOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between border border-border">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      AI Evidence / Sources
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isEvidenceOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    {aiEvidence.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <Badge variant="outline" className="shrink-0">
                          {fieldLabels[item.field] || item.field}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {item.sources.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </ScrollArea>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 flex-shrink-0 bg-card">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BuyerEditDrawer;
