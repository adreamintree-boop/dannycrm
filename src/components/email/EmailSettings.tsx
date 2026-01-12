import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNylas, NylasEmailAccount } from '@/hooks/useNylas';

export default function EmailSettings() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const { getEmailAccount } = useNylas();
  
  const [emailAccount, setEmailAccount] = useState<NylasEmailAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      setLoading(true);
      const account = await getEmailAccount();
      setEmailAccount(account);
      setLoading(false);
    };
    
    if (user) {
      checkConnection();
    }
  }, [user, getEmailAccount]);

  const handleConnectOAuth = async () => {
    if (!user) {
      toast({
        title: '오류',
        description: '로그인이 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

    setConnecting(true);
    try {
      // First, delete any existing pending/failed email account records
      // to prevent duplicate key constraint errors
      await supabase
        .from('email_accounts')
        .delete()
        .eq('user_id', user.id);
      
      // Build the redirect_uri that will be used throughout the OAuth flow
      const redirectUri = `${window.location.origin}/email/callback`;
      console.log('Starting OAuth with redirect_uri:', redirectUri);
      
      // Call the OAuth start edge function
      const { data, error } = await supabase.functions.invoke('nylas-oauth-start', {
        body: {
          redirect_uri: redirectUri,
        },
      });

      if (error) {
        console.error('OAuth start error:', error);
        throw new Error(error.message || 'OAuth 시작에 실패했습니다.');
      }

      if (data?.auth_url) {
        // Use top-level redirect to avoid iframe restrictions
        // Nylas OAuth pages block being embedded via X-Frame-Options/CSP
        // Try window.top for iframe contexts, fallback to regular navigation
        try {
          if (window.top && window.top !== window) {
            // We're in an iframe - try to redirect the top window
            window.top.location.href = data.auth_url;
          } else {
            window.location.assign(data.auth_url);
          }
        } catch {
          // Cross-origin iframe restriction - open in new window
          window.open(data.auth_url, '_blank');
        }
      } else {
        throw new Error('OAuth URL을 받지 못했습니다.');
      }
    } catch (err: unknown) {
      console.error('OAuth error:', err);
      toast({
        title: '연동 실패',
        description: err instanceof Error ? err.message : '이메일 연동에 실패했습니다.',
        variant: 'destructive',
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setEmailAccount(null);
      toast({
        title: '연동 해제',
        description: '이메일 연동이 해제되었습니다.',
      });
    } catch (err: unknown) {
      console.error('Disconnect error:', err);
      toast({
        title: '오류',
        description: '연동 해제에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">이메일 설정</h1>
          <p className="text-muted-foreground mt-1">
            외부 이메일 계정을 연동하여 실제 이메일을 주고받을 수 있습니다.
          </p>
        </div>

        {/* Connection Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              연동 상태
            </CardTitle>
            <CardDescription>
              현재 연동된 이메일 계정 정보입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailAccount?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900 dark:text-green-100">연동됨</p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {emailAccount.email_address}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {emailAccount.provider}
                  </Badge>
                </div>
                <Button variant="destructive" onClick={handleDisconnect}>
                  연동 해제
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
                <XCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">연동되지 않음</p>
                  <p className="text-sm text-muted-foreground">
                    아래에서 이메일 계정을 연동해주세요.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connect Email Account Card */}
        {!emailAccount?.connected && (
          <Card>
            <CardHeader>
              <CardTitle>이메일 계정 연동</CardTitle>
              <CardDescription>
                Google, Microsoft 등의 이메일 계정을 OAuth로 안전하게 연동합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex gap-2">
                  <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium">안전한 OAuth 연동</p>
                    <p className="mt-1">
                      버튼을 클릭하면 이메일 제공자(Google, Microsoft 등)의 로그인 페이지로 이동합니다.
                      비밀번호는 저장되지 않으며 안전하게 연동됩니다.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleConnectOAuth}
                disabled={connecting}
                className="w-full"
                size="lg"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    연결 중...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    이메일 연동하기 (OAuth)
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Gmail, Outlook 등 주요 이메일 서비스를 지원합니다.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Debug Section - only visible for troubleshooting */}
        {emailAccount && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">디버그 정보</CardTitle>
            </CardHeader>
            <CardContent className="text-xs font-mono text-muted-foreground space-y-1">
              <p>Grant ID: {emailAccount.grant_id ? '••••' + emailAccount.grant_id.slice(-8) : 'N/A'}</p>
              <p>Provider: {emailAccount.provider || 'N/A'}</p>
              <p>Status: {emailAccount.connected ? 'connected' : 'disconnected'}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
