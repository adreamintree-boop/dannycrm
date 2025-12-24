import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { User, Lock, Mail } from 'lucide-react';
import authHeroImage from '@/assets/auth-hero.png';
import taasLogo from '@/assets/taas-logo.png';
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
          } else if (error.message.includes('Email not confirmed')) {
            toast({
              title: '이메일 인증 필요',
              description: '이메일 인증 후 로그인하실 수 있습니다.',
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
            title: '회원가입 완료',
            description: '인증 이메일을 발송했습니다. 이메일을 확인하여 계정을 인증해주세요.',
          });
          setMode('login');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
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
            <img 
              src={taasLogo} 
              alt="TaaS Logo" 
              className="h-10 w-auto"
            />
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
        <img 
          src={authHeroImage} 
          alt="TaaS Platform Illustration" 
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export default Auth;
