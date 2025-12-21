import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, User, ClipboardList, UserMinus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import TopHeader from '@/components/layout/TopHeader';
import { useCompanySurvey } from '@/hooks/useCompanySurvey';

const EMPLOYEE_OPTIONS = ['1–10', '11–50', '51–200', '200+'];

const EXPORT_EXPERIENCE_OPTIONS = [
  { value: 'none', label: 'No export experience' },
  { value: 'indirect', label: 'Indirect export (via trader)' },
  { value: 'direct', label: 'Direct export' },
];

const COUNTRY_OPTIONS = [
  'United States', 'China', 'Japan', 'Germany', 'United Kingdom',
  'France', 'India', 'Italy', 'Canada', 'South Korea',
  'Australia', 'Brazil', 'Spain', 'Mexico', 'Indonesia',
  'Netherlands', 'Saudi Arabia', 'Turkey', 'Switzerland', 'Poland',
  'Thailand', 'Vietnam', 'Malaysia', 'Singapore', 'Philippines',
];

const CERTIFICATION_OPTIONS = ['FDA', 'CE', 'ISO', 'Halal', 'HACCP', 'GMP', 'KFDA', 'Other'];

const REGION_OPTIONS = [
  { value: 'north_america', label: 'North America' },
  { value: 'europe', label: 'Europe' },
  { value: 'southeast_asia', label: 'Southeast Asia' },
  { value: 'middle_east', label: 'Middle East' },
  { value: 'east_asia', label: 'East Asia' },
  { value: 'others', label: 'Others' },
];

const OnboardingSurvey: React.FC = () => {
  const navigate = useNavigate();
  const {
    survey,
    isLoading,
    isSaving,
    saveSurvey,
    updateSurvey,
    addProduct,
    removeProduct,
    updateProduct,
  } = useCompanySurvey();

  const handleSave = async () => {
    const { error } = await saveSurvey();
    if (error) {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: '설문 저장 중 오류가 발생했습니다.',
      });
    } else {
      toast({
        title: '저장 완료',
        description: '온보딩 설문이 성공적으로 저장되었습니다.',
      });
    }
  };

  const toggleArrayItem = (
    field: 'existing_markets' | 'certifications' | 'target_regions',
    value: string
  ) => {
    const current = survey[field] || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateSurvey({ [field]: updated });
  };

  const sidebarItems = [
    { id: 'home', label: 'Home', icon: Home, onClick: () => navigate('/') },
    { id: 'profile', label: 'My Profile', icon: User, onClick: () => navigate('/my-profile') },
    { id: 'onboarding', label: 'Onboarding Survey', icon: ClipboardList, active: true },
    { id: 'withdrawal', label: 'Withdrawal', icon: UserMinus },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <TopHeader />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopHeader />
      
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-60 bg-card border-r border-border p-4 flex-shrink-0">
          <nav className="space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  item.active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold text-foreground mb-2">Onboarding Survey</h1>
            <p className="text-sm text-muted-foreground mb-8">
              수출 가능성 분석을 위한 회사 정보를 입력해주세요. 이 정보는 Strategy 분석에 활용됩니다.
            </p>

            <div className="space-y-10">
              {/* Section A: Company Basic Information */}
              <section>
                <h2 className="text-lg font-medium text-foreground mb-4 border-b border-border pb-2">
                  A. Company Basic Information
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="website">Company Website URL</Label>
                    <Input
                      id="website"
                      value={survey.company_website}
                      onChange={(e) => updateSurvey({ company_website: e.target.value })}
                      placeholder="https://example.com"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Company Description</Label>
                    <Textarea
                      id="description"
                      value={survey.company_description}
                      onChange={(e) => updateSurvey({ company_description: e.target.value })}
                      placeholder="회사에 대해 간략히 설명해주세요..."
                      className="mt-1.5"
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="year_founded">Year Founded (optional)</Label>
                      <Input
                        id="year_founded"
                        type="number"
                        value={survey.year_founded || ''}
                        onChange={(e) => updateSurvey({ year_founded: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="2010"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="employees">Number of Employees</Label>
                      <Select
                        value={survey.employee_count}
                        onValueChange={(value) => updateSurvey({ employee_count: value })}
                      >
                        <SelectTrigger id="employees" className="mt-1.5">
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {EMPLOYEE_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section B: Product Information */}
              <section>
                <h2 className="text-lg font-medium text-foreground mb-4 border-b border-border pb-2">
                  B. Product Information
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label>Main Products</Label>
                    <div className="space-y-3 mt-2">
                      {survey.products.map((product, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <Input
                              value={product.product_name}
                              onChange={(e) => updateProduct(index, { product_name: e.target.value })}
                              placeholder="Product Name"
                            />
                            <Input
                              value={product.product_description}
                              onChange={(e) => updateProduct(index, { product_description: e.target.value })}
                              placeholder="Short Description"
                            />
                          </div>
                          {survey.products.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeProduct(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addProduct}
                      className="mt-2"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Product
                    </Button>
                  </div>
                  <div>
                    <Label htmlFor="strengths">Core Product Strengths</Label>
                    <Textarea
                      id="strengths"
                      value={survey.core_strengths}
                      onChange={(e) => updateSurvey({ core_strengths: e.target.value })}
                      placeholder="technology, quality, pricing, certifications..."
                      className="mt-1.5"
                      rows={3}
                    />
                  </div>
                </div>
              </section>

              {/* Section C: Export Readiness */}
              <section>
                <h2 className="text-lg font-medium text-foreground mb-4 border-b border-border pb-2">
                  C. Export Readiness
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="export_exp">Current Export Experience</Label>
                    <Select
                      value={survey.export_experience}
                      onValueChange={(value) => updateSurvey({ export_experience: value })}
                    >
                      <SelectTrigger id="export_exp" className="mt-1.5">
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {EXPORT_EXPERIENCE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Existing Export Markets</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {COUNTRY_OPTIONS.map((country) => (
                        <label key={country} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={survey.existing_markets.includes(country)}
                            onCheckedChange={() => toggleArrayItem('existing_markets', country)}
                          />
                          {country}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Available Certifications</Label>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {CERTIFICATION_OPTIONS.map((cert) => (
                        <label key={cert} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={survey.certifications.includes(cert)}
                            onCheckedChange={() => toggleArrayItem('certifications', cert)}
                          />
                          {cert}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Section D: Sales & Materials */}
              <section>
                <h2 className="text-lg font-medium text-foreground mb-4 border-b border-border pb-2">
                  D. Sales & Materials
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="catalog">Company Product Catalog URL (PDF)</Label>
                    <Input
                      id="catalog"
                      value={survey.catalog_file_url}
                      onChange={(e) => updateSurvey({ catalog_file_url: e.target.value })}
                      placeholder="https://example.com/catalog.pdf"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">파일 업로드 기능은 추후 추가 예정입니다.</p>
                  </div>
                  <div>
                    <Label htmlFor="intro">Company Introduction File URL (optional)</Label>
                    <Input
                      id="intro"
                      value={survey.intro_file_url}
                      onChange={(e) => updateSurvey({ intro_file_url: e.target.value })}
                      placeholder="https://example.com/intro.pdf"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Preferred Target Regions</Label>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {REGION_OPTIONS.map((region) => (
                        <label key={region.value} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={survey.target_regions.includes(region.value)}
                            onCheckedChange={() => toggleArrayItem('target_regions', region.value)}
                          />
                          {region.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Save Button */}
              <div className="pt-4 border-t border-border">
                <Button onClick={handleSave} disabled={isSaving} size="lg">
                  {isSaving ? 'Saving...' : 'Save Survey'}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default OnboardingSurvey;
