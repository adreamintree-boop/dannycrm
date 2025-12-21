import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { User, Building2, Users } from 'lucide-react';

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, needsOnboarding, completeOnboarding, loading: authLoading } = useAuthContext();
  
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect logic
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/auth');
      } else if (!needsOnboarding) {
        navigate('/');
      }
    }
  }, [isAuthenticated, needsOnboarding, authLoading, navigate]);

  const isFormValid = fullName.trim() && companyName.trim() && department.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) return;

    setLoading(true);

    try {
      const { error } = await completeOnboarding({
        full_name: fullName.trim(),
        company_name: companyName.trim(),
        department: department.trim(),
      });

      if (error) {
        toast({
          title: '설정 저장 실패',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: '환영합니다!',
          description: 'TaaS CRM을 시작할 준비가 되었습니다.',
        });
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Onboarding form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center bg-card p-8 lg:p-12">
        <div className="max-w-[450px] mx-auto w-full">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">ts</span>
              <span className="text-2xl font-bold text-foreground">taas</span>
            </div>
          </div>

          {/* Welcome message */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              환영합니다!
            </h1>
            <p className="text-muted-foreground">
              TaaS CRM을 사용하기 전에 몇 가지 정보가 필요합니다.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">
                성명 <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="예) 홍길동"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-12 pl-10 text-base bg-muted/50 border-border"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm font-medium">
                회사명 <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="companyName"
                  type="text"
                  placeholder="예) (주)트레이드잇"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-12 pl-10 text-base bg-muted/50 border-border"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department" className="text-sm font-medium">
                팀명 / 부서명 <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="department"
                  type="text"
                  placeholder="예) 해외영업팀"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="h-12 pl-10 text-base bg-muted/50 border-border"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 mt-8"
              disabled={!isFormValid || loading}
            >
              {loading ? '저장 중...' : '시작하기'}
            </Button>
          </form>

          {/* Note */}
          <p className="mt-6 text-xs text-muted-foreground text-center">
            * 모든 항목은 필수입니다
          </p>
        </div>
      </div>

      {/* Right side - Blue illustration area */}
      <div className="hidden lg:flex lg:w-[55%] bg-primary items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-80">
          <svg viewBox="0 0 800 600" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="cubeGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.85)" />
              </linearGradient>
              <linearGradient id="cubeSide2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.5)" />
              </linearGradient>
            </defs>
            
            <g transform="translate(400, 300)">
              <g transform="rotate(-15)">
                <rect x="-80" y="-80" width="160" height="160" fill="url(#cubeGradient2)" rx="8" />
                <rect x="-80" y="-80" width="160" height="160" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" rx="8" />
              </g>
              
              <g transform="translate(-150, -120) rotate(-20)">
                <rect x="-30" y="-30" width="60" height="60" fill="url(#cubeSide2)" rx="4" />
              </g>
              <g transform="translate(180, 80) rotate(-10)">
                <rect x="-40" y="-40" width="80" height="80" fill="url(#cubeGradient2)" rx="6" />
              </g>
              <g transform="translate(-200, 100) rotate(-25)">
                <rect x="-25" y="-25" width="50" height="50" fill="url(#cubeSide2)" rx="4" />
              </g>
              <g transform="translate(120, -150) rotate(-5)">
                <rect x="-35" y="-35" width="70" height="70" fill="url(#cubeGradient2)" rx="5" />
              </g>
              
              <circle cx="-100" cy="50" r="8" fill="rgba(100,200,255,0.8)" />
              <circle cx="50" cy="-100" r="6" fill="rgba(100,200,255,0.6)" />
              <circle cx="150" cy="30" r="5" fill="rgba(100,200,255,0.7)" />
            </g>
            
            <g stroke="rgba(255,255,255,0.2)" strokeWidth="1">
              <line x1="150" y1="500" x2="650" y2="500" />
              <line x1="100" y1="520" x2="700" y2="520" />
            </g>
          </svg>
        </div>
        
        {/* Welcome text overlay */}
        <div className="relative z-10 text-center text-primary-foreground px-8">
          <h2 className="text-3xl font-bold mb-4">거의 다 되었습니다!</h2>
          <p className="text-lg opacity-90">몇 가지 정보만 입력하면<br />TaaS CRM을 바로 시작할 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
