import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, User, ClipboardList, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthContext } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import TopHeader from '@/components/layout/TopHeader';
import CountryPhoneInput from '@/components/profile/CountryPhoneInput';

const ROLE_OPTIONS = [
  'CEO',
  'Director',
  'Manager',
  'Assistant Manager',
  'Staff',
  'Sales Manager',
  'Overseas Sales',
  'Other',
];

const EMAIL_DOMAINS = [
  'gmail.com',
  'naver.com',
  'daum.net',
  'hanmail.net',
  'kakao.com',
  'nate.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'direct', // Direct input option
];

const MyProfile: React.FC = () => {
  const navigate = useNavigate();
  const { profile, updateProfile, user } = useAuthContext();
  
  const [rolePosition, setRolePosition] = useState('');
  const [emailLocal, setEmailLocal] = useState('');
  const [emailDomain, setEmailDomain] = useState('gmail.com');
  const [customDomain, setCustomDomain] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+82');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setRolePosition((profile as any).role_position || '');
      setEmailLocal((profile as any).email_local || '');
      const domain = (profile as any).email_domain || 'gmail.com';
      if (EMAIL_DOMAINS.includes(domain)) {
        setEmailDomain(domain);
      } else {
        setEmailDomain('direct');
        setCustomDomain(domain);
      }
      setPhoneCountryCode((profile as any).phone_country_code || '+82');
      setPhoneNumber((profile as any).phone_number || '');
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    
    const finalDomain = emailDomain === 'direct' ? customDomain : emailDomain;
    
    const { error } = await updateProfile({
      role_position: rolePosition,
      email_local: emailLocal,
      email_domain: finalDomain,
      phone_country_code: phoneCountryCode,
      phone_number: phoneNumber,
    } as any);

    setIsSaving(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: '프로필 저장 중 오류가 발생했습니다.',
      });
    } else {
      toast({
        title: '저장 완료',
        description: '프로필이 성공적으로 저장되었습니다.',
      });
    }
  };

  const sidebarItems = [
    { id: 'home', label: 'Home', icon: Home, onClick: () => navigate('/') },
    { id: 'profile', label: 'My Profile', icon: User, active: true },
    { id: 'onboarding', label: 'Onboarding Survey', icon: ClipboardList },
    { id: 'withdrawal', label: 'Withdrawal', icon: UserMinus },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopHeader />
      
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-60 bg-card border-r border-border p-4">
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
        <main className="flex-1 p-8">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold text-foreground mb-8">My Profile</h1>

            <div className="space-y-6">
              {/* Read-only fields */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                <p className="text-xs text-muted-foreground">온보딩 시 입력된 정보 (수정 불가)</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">ID (로그인 ID)</Label>
                    <Input 
                      value={user?.email || ''} 
                      disabled 
                      className="mt-1.5 bg-muted text-muted-foreground"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Name (성명)</Label>
                    <Input 
                      value={profile?.full_name || ''} 
                      disabled 
                      className="mt-1.5 bg-muted text-muted-foreground"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Company (회사명)</Label>
                    <Input 
                      value={profile?.company_name || ''} 
                      disabled 
                      className="mt-1.5 bg-muted text-muted-foreground"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Organization / Team (팀명)</Label>
                    <Input 
                      value={profile?.department || ''} 
                      disabled 
                      className="mt-1.5 bg-muted text-muted-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Editable fields */}
              <div className="space-y-5">
                {/* Role / Position */}
                <div>
                  <Label htmlFor="role" className="text-sm font-medium">Role / Position (직책)</Label>
                  <Select value={rolePosition} onValueChange={setRolePosition}>
                    <SelectTrigger id="role" className="mt-1.5">
                      <SelectValue placeholder="직책을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Email */}
                <div>
                  <Label className="text-sm font-medium">Email (이메일)</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Input
                      value={emailLocal}
                      onChange={(e) => setEmailLocal(e.target.value)}
                      placeholder="example"
                      className="flex-1"
                    />
                    <span className="text-muted-foreground">@</span>
                    {emailDomain === 'direct' ? (
                      <Input
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                        placeholder="domain.com"
                        className="flex-1"
                      />
                    ) : (
                      <Select value={emailDomain} onValueChange={setEmailDomain}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {EMAIL_DOMAINS.map((domain) => (
                            <SelectItem key={domain} value={domain}>
                              {domain === 'direct' ? '직접 입력' : domain}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {emailDomain === 'direct' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEmailDomain('gmail.com')}
                      >
                        선택
                      </Button>
                    )}
                  </div>
                </div>

                {/* Contact Number */}
                <div>
                  <Label className="text-sm font-medium">Contact Number (연락처)</Label>
                  <div className="mt-1.5">
                    <CountryPhoneInput
                      countryCode={phoneCountryCode}
                      phoneNumber={phoneNumber}
                      onCountryCodeChange={setPhoneCountryCode}
                      onPhoneNumberChange={setPhoneNumber}
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  {isSaving ? '저장 중...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MyProfile;
