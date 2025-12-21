import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { User, Lock, Mail } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('올바른 이메일 주소를 입력해주세요');
const passwordSchema = z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다');

type AuthMode = 'login' | 'signup' | 'forgot';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, isAuthenticated, needsOnboarding } = useAuthContext();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      if (needsOnboarding) {
        navigate('/onboarding');
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, needsOnboarding, navigate]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string; confirmPassword?: string } = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    if (mode !== 'forgot') {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    }

    if (mode === 'signup' && password !== confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: '로그인 실패',
              description: '이메일 또는 비밀번호가 올바르지 않습니다.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: '로그인 실패',
              description: error.message,
              variant: 'destructive',
            });
          }
        }
      } else if (mode === 'signup') {
        const { error } = await signUpWithEmail(email, password);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast({
              title: '회원가입 실패',
              description: '이미 등록된 이메일입니다.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: '회원가입 실패',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: '회원가입 성공',
            description: '계정이 생성되었습니다.',
          });
        }
      } else if (mode === 'forgot') {
        toast({
          title: '비밀번호 재설정',
          description: '비밀번호 재설정 기능은 준비 중입니다.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: '구글 로그인 실패',
        description: error.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-between bg-card p-8 lg:p-12">
        <div className="flex-1 flex flex-col justify-center max-w-[400px] mx-auto w-full">
          {/* Logo */}
          <div className="mb-10">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">ts</span>
              <span className="text-2xl font-bold text-foreground">taas</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Google Login Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base gap-2 border-border"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">또는</span>
              </div>
            </div>

            {/* Email field */}
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-10 text-base bg-muted/50 border-border"
                  disabled={loading}
                />
              </div>
              {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
            </div>

            {/* Password field */}
            {mode !== 'forgot' && (
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-10 text-base bg-muted/50 border-border"
                    disabled={loading}
                  />
                </div>
                {errors.password && <p className="text-destructive text-sm">{errors.password}</p>}
              </div>
            )}

            {/* Confirm password field for signup */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="비밀번호 확인"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 pl-10 text-base bg-muted/50 border-border"
                    disabled={loading}
                  />
                </div>
                {errors.confirmPassword && <p className="text-destructive text-sm">{errors.confirmPassword}</p>}
              </div>
            )}

            {/* Forgot password link */}
            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  아이디/비밀번호 찾기
                </button>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              {mode === 'login' && '로그인'}
              {mode === 'signup' && '회원가입'}
              {mode === 'forgot' && '비밀번호 재설정'}
            </Button>
          </form>

          {/* Toggle between login and signup */}
          <div className="mt-6 text-center text-sm">
            {mode === 'login' && (
              <span className="text-muted-foreground">
                회원이 아니신가요?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-primary font-medium hover:underline"
                >
                  회원가입
                </button>
              </span>
            )}
            {mode === 'signup' && (
              <span className="text-muted-foreground">
                이미 계정이 있으신가요?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-primary font-medium hover:underline"
                >
                  로그인
                </button>
              </span>
            )}
            {mode === 'forgot' && (
              <button
                onClick={() => setMode('login')}
                className="text-primary font-medium hover:underline"
              >
                로그인으로 돌아가기
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-xs text-muted-foreground">
          <p>© 2025 TaaS. All rights reserved.</p>
        </div>
      </div>

      {/* Right side - Blue illustration area */}
      <div className="hidden lg:flex lg:w-[55%] bg-primary items-center justify-center relative overflow-hidden">
        {/* 3D cube decorative elements */}
        <div className="absolute inset-0 opacity-80">
          <svg viewBox="0 0 800 600" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
            {/* Background gradient */}
            <defs>
              <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(214, 89%, 52%)" />
                <stop offset="100%" stopColor="hsl(214, 89%, 45%)" />
              </linearGradient>
              <linearGradient id="cubeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.85)" />
              </linearGradient>
              <linearGradient id="cubeSide" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.5)" />
              </linearGradient>
            </defs>
            
            {/* Large cube group */}
            <g transform="translate(400, 300)">
              {/* Main cube */}
              <g transform="rotate(-15)">
                <rect x="-80" y="-80" width="160" height="160" fill="url(#cubeGradient)" rx="8" />
                <rect x="-80" y="-80" width="160" height="160" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" rx="8" />
              </g>
              
              {/* Floating cubes */}
              <g transform="translate(-150, -120) rotate(-20)">
                <rect x="-30" y="-30" width="60" height="60" fill="url(#cubeSide)" rx="4" />
              </g>
              <g transform="translate(180, 80) rotate(-10)">
                <rect x="-40" y="-40" width="80" height="80" fill="url(#cubeGradient)" rx="6" />
              </g>
              <g transform="translate(-200, 100) rotate(-25)">
                <rect x="-25" y="-25" width="50" height="50" fill="url(#cubeSide)" rx="4" />
              </g>
              <g transform="translate(120, -150) rotate(-5)">
                <rect x="-35" y="-35" width="70" height="70" fill="url(#cubeGradient)" rx="5" />
              </g>
              
              {/* Small accent cubes */}
              <g transform="translate(-250, -50)">
                <rect x="-15" y="-15" width="30" height="30" fill="rgba(255,255,255,0.4)" rx="3" />
              </g>
              <g transform="translate(250, -100)">
                <rect x="-20" y="-20" width="40" height="40" fill="rgba(255,255,255,0.5)" rx="3" />
              </g>
              <g transform="translate(200, 180)">
                <rect x="-18" y="-18" width="36" height="36" fill="rgba(255,255,255,0.45)" rx="3" />
              </g>
              
              {/* Glowing accents */}
              <circle cx="-100" cy="50" r="8" fill="rgba(100,200,255,0.8)" />
              <circle cx="50" cy="-100" r="6" fill="rgba(100,200,255,0.6)" />
              <circle cx="150" cy="30" r="5" fill="rgba(100,200,255,0.7)" />
            </g>
            
            {/* Platform lines */}
            <g stroke="rgba(255,255,255,0.2)" strokeWidth="1">
              <line x1="150" y1="500" x2="650" y2="500" />
              <line x1="100" y1="520" x2="700" y2="520" />
              <line x1="200" y1="480" x2="600" y2="480" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Auth;
