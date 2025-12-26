import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
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
  
  // Form state for manual connection
  const [grantId, setGrantId] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [provider, setProvider] = useState('google');

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

  const handleConnect = async () => {
    if (!user || !grantId.trim() || !emailAddress.trim()) {
      toast({
        title: '오류',
        description: 'Grant ID와 이메일 주소를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setConnecting(true);
    try {
      const { error } = await supabase
        .from('email_accounts')
        .upsert({
          user_id: user.id,
          grant_id: grantId.trim(),
          email_address: emailAddress.trim(),
          provider: provider,
          status: 'connected',
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      toast({
        title: '연동 완료',
        description: '이메일 계정이 연동되었습니다.',
      });

      // Refresh account status
      const account = await getEmailAccount();
      setEmailAccount(account);
      setGrantId('');
      setEmailAddress('');
    } catch (err: unknown) {
      console.error('Connection error:', err);
      toast({
        title: '연동 실패',
        description: err instanceof Error ? err.message : '이메일 연동에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
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
                Nylas Grant ID를 입력하여 이메일 계정을 연동합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium">Nylas 연동 안내</p>
                    <p className="mt-1">
                      Nylas Dashboard에서 Grant ID를 확인한 후 아래에 입력해주세요.
                      Grant ID는 이메일 계정 인증 후 발급됩니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 주소</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your-email@gmail.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grantId">Nylas Grant ID</Label>
                  <Input
                    id="grantId"
                    placeholder="your-grant-id-here"
                    value={grantId}
                    onChange={(e) => setGrantId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider">이메일 제공자</Label>
                  <select
                    id="provider"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="google">Google (Gmail)</option>
                    <option value="microsoft">Microsoft (Outlook)</option>
                    <option value="imap">IMAP (기타)</option>
                  </select>
                </div>
              </div>

              <Button
                onClick={handleConnect}
                disabled={connecting || !grantId.trim() || !emailAddress.trim()}
                className="w-full"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    연동 중...
                  </>
                ) : (
                  '이메일 연동하기'
                )}
              </Button>
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
