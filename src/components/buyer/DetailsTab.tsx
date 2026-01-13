import React, { useState, useEffect } from 'react';
import { Save, ExternalLink, User, Sparkles, Loader2 } from 'lucide-react';
import { Buyer, BuyerContact } from '@/data/mockData';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CountrySelect } from '@/components/ui/country-select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { useCreditsContext } from '@/context/CreditsContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { 
  loadCountryData, 
  findCountry, 
  getRegion,
  Country
} from '@/data/countryData';

interface DetailsTabProps {
  buyer: Buyer;
}

interface EnrichmentOutput {
  website_url: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
  address: string | null;
  email_address: string | null;
  phone_number_e164: string | null;
  enrichment_summary: string;
  confidence_level: "High" | "Medium" | "Low";
  evidence: Record<string, unknown>;
}

const ENRICH_CREDIT_COST = 5;

const DetailsTab: React.FC<DetailsTabProps> = ({ buyer }) => {
  const { updateBuyer } = useApp();
  const { session } = useAuthContext();
  const { balance, refreshBalance } = useCreditsContext();
  
  const [formData, setFormData] = useState<Buyer>({ ...buyer });
  const [activeContactTab, setActiveContactTab] = useState<number>(0);
  const [countryList, setCountryList] = useState<Country[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);

  const canEnrich = (balance ?? 0) >= ENRICH_CREDIT_COST;

  // Load country data on mount
  useEffect(() => {
    loadCountryData().then(countries => {
      setCountryList(countries);
    });
  }, []);

  // Auto-fill country from BL destination country if empty
  useEffect(() => {
    if (!formData.country && buyer.blDestinationCountry && countryList.length > 0) {
      const matchedCountry = findCountry(buyer.blDestinationCountry);
      
      if (matchedCountry) {
        setFormData(prev => ({
          ...prev,
          country: matchedCountry.nameKo,
          countryCode: matchedCountry.code,
          region: getRegion(matchedCountry.code),
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          country: 'Unmapped',
        }));
      }
    }
  }, [buyer.blDestinationCountry, formData.country, countryList.length]);

  const handleInputChange = (field: keyof Buyer, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleContactChange = (contactIndex: number, field: keyof BuyerContact, value: string) => {
    const updatedContacts = [...formData.contacts];
    updatedContacts[contactIndex] = { ...updatedContacts[contactIndex], [field]: value };
    setFormData({ ...formData, contacts: updatedContacts });
  };

  const handleSave = async () => {
    try {
      await updateBuyer(buyer.id, formData);
      toast({
        title: '저장 완료',
        description: '바이어 정보가 업데이트되었습니다.',
      });
    } catch (error) {
      console.error('Error saving buyer:', error);
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: '바이어 정보를 저장하지 못했습니다. 다시 시도해주세요.',
      });
    }
  };

  // Get country calling code from country code
  const getCountryCallingCode = (countryCode?: string): string | null => {
    const callingCodes: Record<string, string> = {
      'US': '+1', 'CA': '+1', 'KR': '+82', 'JP': '+81', 'CN': '+86',
      'GB': '+44', 'DE': '+49', 'FR': '+33', 'AU': '+61', 'SG': '+65',
      'MY': '+60', 'VN': '+84', 'TH': '+66', 'ID': '+62', 'PH': '+63',
      'IN': '+91', 'AE': '+971', 'SA': '+966', 'HK': '+852', 'TW': '+886',
      'NL': '+31', 'IT': '+39', 'ES': '+34', 'MX': '+52', 'BR': '+55',
    };
    return countryCode ? callingCodes[countryCode] || null : null;
  };

  const handleEnrichClick = async () => {
    if (!session?.access_token) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '로그인이 필요합니다.',
      });
      return;
    }

    if (!canEnrich) {
      toast({
        variant: 'destructive',
        title: '크레딧 부족',
        description: `크레딧이 부족합니다.`,
      });
      return;
    }

    setIsEnriching(true);

    try {
      // Prepare input for the edge function
      const input = {
        buyer_id: buyer.id,
        buyer_name: formData.name,
        country: formData.country || buyer.blDestinationCountry || null,
        country_calling_code: getCountryCallingCode(formData.countryCode),
        existing: {
          website_url: formData.websiteUrl || null,
          facebook_url: formData.facebookUrl || null,
          linkedin_url: formData.linkedinUrl || null,
          youtube_url: formData.youtubeUrl || null,
          address: formData.address || null,
          email_address: formData.email || null,
          phone_number_e164: formData.phone || null,
        },
      };

      const { data, error } = await supabase.functions.invoke('buyer-enrichment', {
        body: input,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Enrichment error:', error);
        toast({
          variant: 'destructive',
          title: '오류',
          description: 'AI 추천 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.',
        });
        return;
      }

      if (data?.error) {
        console.error('Enrichment API error:', data.error);
        toast({
          variant: 'destructive',
          title: '오류',
          description: data.error,
        });
        return;
      }

      if (data?.success && data.data) {
        const enriched: EnrichmentOutput = data.data;
        
        // Apply enriched data to form - ONLY update fields that have evidence
        const updates: Partial<Buyer> = {};
        let updatedFieldsCount = 0;

        // Map each field from enrichment output to form data
        // Only update if: (1) enriched value exists, (2) current value is empty or different

        if (enriched.website_url && !formData.websiteUrl) {
          updates.websiteUrl = enriched.website_url;
          updatedFieldsCount++;
        }

        if (enriched.address && !formData.address) {
          updates.address = enriched.address;
          updatedFieldsCount++;
        }

        if (enriched.facebook_url && !formData.facebookUrl) {
          updates.facebookUrl = enriched.facebook_url;
          updatedFieldsCount++;
        }

        if (enriched.linkedin_url && !formData.linkedinUrl) {
          updates.linkedinUrl = enriched.linkedin_url;
          updatedFieldsCount++;
        }

        if (enriched.youtube_url && !formData.youtubeUrl) {
          updates.youtubeUrl = enriched.youtube_url;
          updatedFieldsCount++;
        }

        if (enriched.email_address && !formData.email) {
          updates.email = enriched.email_address;
          updatedFieldsCount++;
        }

        if (enriched.phone_number_e164 && !formData.phone) {
          updates.phone = enriched.phone_number_e164;
          updatedFieldsCount++;
        }

        // Apply updates to form state - this is the FIX for fields staying empty
        if (Object.keys(updates).length > 0) {
          setFormData(prev => ({ ...prev, ...updates }));
        }

        // Refresh credit balance
        await refreshBalance();

        // Show toast with results
        if (updatedFieldsCount > 0) {
          toast({
            title: 'AI로 정보 업데이트 완료',
            description: `${updatedFieldsCount}개 필드가 자동으로 채워졌습니다. 저장하려면 'Save changes' 버튼을 눌러주세요. (신뢰도: ${enriched.confidence_level})`,
          });
        } else {
          toast({
            title: '새로운 정보를 찾지 못했습니다',
            description: enriched.enrichment_summary?.slice(0, 100) || '공개적으로 확인 가능한 정보가 부족합니다.',
          });
        }

        // Log the summary to console for debugging
        console.log('Enrichment summary:', enriched.enrichment_summary);
        console.log('Confidence level:', enriched.confidence_level);
        console.log('Evidence:', enriched.evidence);
      }
    } catch (err) {
      console.error('Enrichment exception:', err);
      toast({
        variant: 'destructive',
        title: '오류',
        description: 'AI 추천 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.',
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const selectedCountry = countryList.find(c => c.code === formData.countryCode);

  const currencyOptions = ['USD', 'KRW', 'SGD', 'MYR', 'VND', 'AED', 'HKD', 'CAD', 'AUD', 'EUR'];

  const roleOptions = ['admin', 'buyer', 'manager', 'ceo', 'director', 'other'];

  return (
    <div className="p-6">
      {/* AI Buttons Row */}
      <div className="flex justify-end gap-3 mb-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleEnrichClick}
                disabled={isEnriching || !canEnrich}
                className="flex items-center gap-2"
              >
                {isEnriching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                AI로 회사정보 자동 채우기
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>웹에서 공개 정보를 기반으로 주소/웹사이트/연락처 등을 제안합니다.</p>
              <p className="text-muted-foreground">실행 시 {ENRICH_CREDIT_COST} credit 차감 (보유: {balance})</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Left Column: 회사정보 */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-foreground">회사정보</h3>
          
          <div>
            <label className="text-sm font-medium text-foreground">
              회사명 <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">
              대륙 - 세부지역 - 국가 <span className="text-destructive">*</span>
            </label>
            <CountrySelect
              countries={countryList}
              value={formData.countryCode}
              onValueChange={(country) => {
              if (country) {
                  setFormData({
                    ...formData,
                    countryCode: country.code,
                    country: country.nameKo,
                    region: getRegion(country.code),
                  });
                } else {
                  setFormData({
                    ...formData,
                    countryCode: undefined,
                    country: '',
                    region: undefined,
                  });
                }
              }}
              placeholder="국가 선택"
              className="mt-1"
            />
            {selectedCountry && (
              <div className="mt-2 text-xs text-muted-foreground">
                {(() => {
                  const region = getRegion(selectedCountry.code);
                  return (
                    <>
                      <div>대륙 : {region === 'asia' ? '아시아' : region === 'america' ? '아메리카' : region === 'europe' ? '유럽' : region === 'africa' ? '아프리카' : '오세아니아'}</div>
                      <div>세부지역 : {region === 'asia' ? '동남아시아' : '-'}</div>
                    </>
                  );
                })()}
              </div>
            )}
            {buyer.blDestinationCountry && !selectedCountry && (
              <div className="mt-2 text-xs text-muted-foreground">
                B/L 목적지 국가: {buyer.blDestinationCountry}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                구글맵 기준 바이어 소재지 및 주소 <span className="text-destructive">*</span>
              </label>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.address || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                구글맵 바로가기
              </a>
            </div>
            <Input
              value={formData.address || ''}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">
              웹사이트 주소 <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.websiteUrl || ''}
              onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">매출액</label>
            <div className="flex gap-2 mt-1">
              <Select
                value={formData.revenueCurrency}
                onValueChange={(value) => handleInputChange('revenueCurrency', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="flex items-center px-3 bg-muted rounded-md text-sm">$</span>
              <Input
                value={formData.revenue || ''}
                onChange={(e) => handleInputChange('revenue', e.target.value)}
                placeholder="ex) 1,000M"
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">주요품목</label>
            <Textarea
              value={formData.mainProducts || ''}
              onChange={(e) => handleInputChange('mainProducts', e.target.value)}
              className="mt-1"
              rows={3}
            />
            {buyer.blProductDesc && (
              <div className="mt-1 text-xs text-muted-foreground">
                B/L 제품: {buyer.blProductDesc}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-primary">회사 연락처</label>
              <Input
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="mt-1"
              />
              <Input className="mt-2" placeholder="" />
              <Input className="mt-2" placeholder="" />
            </div>
            <div>
              <label className="text-sm font-medium text-primary">회사 이메일</label>
              <Input
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="mt-1"
              />
              <Input className="mt-2" placeholder="" />
              <Input className="mt-2" placeholder="" />
            </div>
          </div>
        </div>

        {/* Right Column: Social URLs + 담당자 정보 */}
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">회사 페이스북 URL</label>
              <Textarea
                value={formData.facebookUrl || ''}
                onChange={(e) => handleInputChange('facebookUrl', e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">회사 링크드인 URL</label>
              <Textarea
                value={formData.linkedinUrl || ''}
                onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">회사 유튜브 URL</label>
              <Textarea
                value={formData.youtubeUrl || ''}
                onChange={(e) => handleInputChange('youtubeUrl', e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* 담당자 정보 */}
          <div className="border border-border rounded-lg p-4">
            <h4 className="text-base font-semibold text-foreground mb-4">담당자 정보</h4>
            
            {/* Contact Tabs */}
            <div className="flex border-b border-border mb-4">
              {formData.contacts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveContactTab(index)}
                  className={`flex items-center gap-1 px-4 py-2 text-sm border-b-2 transition-colors ${
                    activeContactTab === index
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <User className="w-4 h-4" />
                  담당자 {index + 1}
                </button>
              ))}
            </div>

            {/* Contact Form */}
            {formData.contacts[activeContactTab] && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">담당자 신분</label>
                    <Select
                      value={formData.contacts[activeContactTab].role}
                      onValueChange={(value) => handleContactChange(activeContactTab, 'role', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">담당자 이름</label>
                    <Input
                      value={formData.contacts[activeContactTab].name}
                      onChange={(e) => handleContactChange(activeContactTab, 'name', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">담당자 직책 및 직위</label>
                    <Input
                      value={formData.contacts[activeContactTab].title}
                      onChange={(e) => handleContactChange(activeContactTab, 'title', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">담당자 유선번호</label>
                    <Input
                      value={formData.contacts[activeContactTab].phone}
                      onChange={(e) => handleContactChange(activeContactTab, 'phone', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">담당자 연락처</label>
                    <Input
                      value={formData.contacts[activeContactTab].mobile}
                      onChange={(e) => handleContactChange(activeContactTab, 'mobile', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">담당자 이메일</label>
                  <Input
                    value={formData.contacts[activeContactTab].email}
                    onChange={(e) => handleContactChange(activeContactTab, 'email', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">담당자 트위터 URL</label>
                    <Input
                      value={formData.contacts[activeContactTab].twitterUrl}
                      onChange={(e) => handleContactChange(activeContactTab, 'twitterUrl', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">담당자 페이스북 URL</label>
                    <Input
                      value={formData.contacts[activeContactTab].facebookUrl}
                      onChange={(e) => handleContactChange(activeContactTab, 'facebookUrl', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">담당자 링크드인 URL</label>
                    <Input
                      value={formData.contacts[activeContactTab].linkedinUrl}
                      onChange={(e) => handleContactChange(activeContactTab, 'linkedinUrl', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">담당자 인스타그램 URL</label>
                    <Input
                      value={formData.contacts[activeContactTab].instagramUrl}
                      onChange={(e) => handleContactChange(activeContactTab, 'instagramUrl', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-8">
        <Button onClick={handleSave} className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          Save changes
        </Button>
      </div>
    </div>
  );
};

export default DetailsTab;
