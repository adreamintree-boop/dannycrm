import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function EmailCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Process immediately on mount - no delays to avoid code expiration
    let isProcessed = false;

    const processCallback = async () => {
      // Prevent double processing
      if (isProcessed) return;
      isProcessed = true;

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      console.log('OAuth Callback - Processing started');
      console.log('OAuth Callback - Code present:', !!code);
      console.log('OAuth Callback - State present:', !!state);
      console.log('OAuth Callback - Error:', error);

      // Handle OAuth error
      if (error) {
        setStatus('error');
        setErrorMessage(`OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('No authorization code received');
        return;
      }

      if (!state) {
        setStatus('error');
        setErrorMessage('No state parameter received');
        return;
      }

      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setStatus('error');
          setErrorMessage('로그인이 필요합니다.');
          return;
        }

        // Build the exact redirect_uri that was used in the OAuth start
        // This MUST match exactly what was used in nylas-oauth-start
        const redirectUri = `${window.location.origin}/email/callback`;
        
        console.log('OAuth Callback - Exchanging code with redirect_uri:', redirectUri);
        console.log('OAuth Callback - Code preview:', code.substring(0, 10) + '...');

        // Call the callback edge function IMMEDIATELY
        const { data, error: callbackError } = await supabase.functions.invoke('nylas-oauth-callback', {
          body: {
            code,
            state,
            redirect_uri: redirectUri,
          },
        });

        console.log('OAuth Callback - Response:', data);

        if (callbackError) {
          console.error('OAuth Callback - Edge function error:', callbackError);
          setStatus('error');
          setErrorMessage(callbackError.message || '이메일 연동에 실패했습니다.');
          return;
        }

        // Check for success (support both 'success' and 'ok' fields)
        if (data?.success || data?.ok) {
          setStatus('success');
          toast({
            title: '이메일 연동 완료',
            description: `${data.email || '이메일 계정'}이 연동되었습니다.`,
          });
          
          // Redirect to email settings after a short delay
          setTimeout(() => {
            navigate('/email/settings');
          }, 2000);
        } else {
          setStatus('error');
          // Build detailed error message
          let errorMsg = data?.error || '알 수 없는 오류가 발생했습니다.';
          if (data?.step) {
            errorMsg = `[${data.step}] ${errorMsg}`;
          }
          if (data?.nylas_error) {
            errorMsg += ` (Nylas: ${data.nylas_error})`;
          }
          if (data?.nylas_status) {
            errorMsg += ` [Status: ${data.nylas_status}]`;
          }
          setErrorMessage(errorMsg);
        }
      } catch (err) {
        console.error('OAuth Callback - Processing error:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : '이메일 연동 처리 중 오류가 발생했습니다.');
      }
    };

    processCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">이메일 연동</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'processing' && (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">이메일 계정을 연동하는 중...</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-600" />
              <p className="text-green-700 dark:text-green-400 font-medium">연동 완료!</p>
              <p className="text-sm text-muted-foreground">잠시 후 설정 페이지로 이동합니다...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-destructive" />
              <p className="text-destructive font-medium">연동 실패</p>
              <p className="text-sm text-muted-foreground text-center">{errorMessage}</p>
              <Button onClick={() => navigate('/email/settings')} className="mt-4">
                설정으로 돌아가기
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
