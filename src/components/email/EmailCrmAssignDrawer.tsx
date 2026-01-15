import React, { useState, useEffect, useCallback } from 'react';
import { Search, Building2, MapPin, Check, Mail, FolderOpen, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Project {
  id: string;
  project_name: string;
}

interface CrmBuyer {
  id: string;
  company_name: string;
  stage: string;
  country: string | null;
  website: string | null;
  project_id: string | null;
}

interface SelectedEmail {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
}

interface EmailCrmAssignDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmails: SelectedEmail[];
  onAssign: (buyerId: string, buyerName: string, notes?: string) => Promise<void>;
  loading?: boolean;
}

const stageLabels: Record<string, { label: string; color: string }> = {
  list: { label: 'List', color: 'bg-status-list text-white' },
  lead: { label: 'Lead', color: 'bg-status-lead text-white' },
  target: { label: 'Target', color: 'bg-status-target text-white' },
  client: { label: 'Client', color: 'bg-status-client text-white' },
};

const EmailCrmAssignDrawer: React.FC<EmailCrmAssignDrawerProps> = ({
  open,
  onOpenChange,
  selectedEmails,
  onAssign,
  loading = false,
}) => {
  const { user } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [buyers, setBuyers] = useState<CrmBuyer[]>([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [fetchingProjects, setFetchingProjects] = useState(false);
  const [fetchingBuyers, setFetchingBuyers] = useState(false);
  const [notes, setNotes] = useState('');

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setFetchingProjects(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProjects(data || []);
      
      // Auto-select if only one project
      if (data && data.length === 1) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setFetchingProjects(false);
    }
  }, [user]);

  // Fetch buyers for selected project
  const fetchBuyers = useCallback(async () => {
    if (!user || !selectedProjectId) {
      setBuyers([]);
      return;
    }
    setFetchingBuyers(true);
    try {
      const { data, error } = await supabase
        .from('crm_buyers')
        .select('id, company_name, stage, country, website, project_id')
        .eq('user_id', user.id)
        .eq('project_id', selectedProjectId)
        .order('company_name', { ascending: true });

      if (error) throw error;
      setBuyers(data || []);
    } catch (error) {
      console.error('Failed to fetch buyers:', error);
    } finally {
      setFetchingBuyers(false);
    }
  }, [user, selectedProjectId]);

  // Reset state when drawer opens
  useEffect(() => {
    if (open) {
      fetchProjects();
      setSelectedProjectId(null);
      setSelectedBuyerId(null);
      setBuyers([]);
      setSearchQuery('');
      setNotes('');
    }
  }, [open, fetchProjects]);

  // Fetch buyers when project changes
  useEffect(() => {
    if (selectedProjectId) {
      setSelectedBuyerId(null);
      setSearchQuery('');
      fetchBuyers();
    }
  }, [selectedProjectId, fetchBuyers]);

  const filteredBuyers = buyers.filter(buyer =>
    buyer.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    buyer.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    buyer.website?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirm = async () => {
    const selected = buyers.find(b => b.id === selectedBuyerId);
    if (selected) {
      await onAssign(selected.id, selected.company_name, notes || undefined);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedBuyer = buyers.find(b => b.id === selectedBuyerId);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'M월 d일 HH:mm', { locale: ko });
    } catch {
      return dateStr;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>CRM에 이메일 추가</SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-4 space-y-5">
          {/* Selected emails preview */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              선택된 이메일 ({selectedEmails.length}개)
            </Label>
            <div className="space-y-2 max-h-32 overflow-auto">
              {selectedEmails.slice(0, 5).map((email) => (
                <div
                  key={email.id}
                  className="flex items-start gap-2 p-2 bg-muted/50 rounded-md text-xs"
                >
                  <Mail className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{email.subject || '(제목 없음)'}</p>
                    <p className="text-muted-foreground truncate">
                      {email.from} → {email.to}
                    </p>
                    <p className="text-muted-foreground">{formatDate(email.date)}</p>
                  </div>
                </div>
              ))}
              {selectedEmails.length > 5 && (
                <p className="text-xs text-muted-foreground pl-6">
                  ...외 {selectedEmails.length - 5}개
                </p>
              )}
            </div>
          </div>

          {/* Step 1: Project selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              <span className="inline-flex items-center gap-1">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">1</span>
                프로젝트 선택 <span className="text-destructive">*</span>
              </span>
            </Label>
            <Select
              value={selectedProjectId || ''}
              onValueChange={(value) => setSelectedProjectId(value)}
              disabled={fetchingProjects}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={fetchingProjects ? '로딩 중...' : '프로젝트를 선택하세요'} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-muted-foreground" />
                      {project.project_name}
                    </div>
                  </SelectItem>
                ))}
                {projects.length === 0 && !fetchingProjects && (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    등록된 프로젝트가 없습니다
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Buyer selection (only shown after project is selected) */}
          {selectedProjectId && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                <span className="inline-flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">2</span>
                  바이어 선택 <span className="text-destructive">*</span>
                </span>
              </Label>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="회사명, 국가, 웹사이트로 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-48 rounded-md border">
                {fetchingBuyers ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : filteredBuyers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                    <Building2 className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm text-center">
                      {searchQuery
                        ? '검색 결과가 없습니다'
                        : '이 프로젝트에 등록된 바이어가 없습니다'}
                    </p>
                  </div>
                ) : (
                  <div className="p-1">
                    {filteredBuyers.map((buyer) => {
                      const stageInfo = stageLabels[buyer.stage] || stageLabels.list;
                      const isSelected = selectedBuyerId === buyer.id;

                      return (
                        <button
                          key={buyer.id}
                          onClick={() => setSelectedBuyerId(buyer.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors ${
                            isSelected
                              ? 'bg-primary/10 border border-primary'
                              : 'hover:bg-muted border border-transparent'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground truncate">
                                {buyer.company_name}
                              </span>
                              <Badge className={`${stageInfo.color} text-xs shrink-0`}>
                                {stageInfo.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              {buyer.country && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {buyer.country}
                                </span>
                              )}
                              {buyer.website && (
                                <span className="truncate">{buyer.website}</span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* Selected summary */}
          {(selectedProject || selectedBuyer) && (
            <div className="p-3 bg-primary/5 rounded-md border border-primary/20 space-y-2">
              {selectedProject && (
                <div className="flex items-center gap-2 text-sm">
                  <FolderOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">프로젝트:</span>
                  <span className="font-medium">{selectedProject.project_name}</span>
                </div>
              )}
              {selectedBuyer && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">바이어:</span>
                  <span className="font-medium">{selectedBuyer.company_name}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              메모 (선택)
            </Label>
            <Textarea
              placeholder="이메일에 대한 메모를 입력하세요..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <SheetFooter className="px-4 py-4 border-t">
          <div className="flex gap-2 w-full">
            <SheetClose asChild>
              <Button variant="outline" className="flex-1">
                취소
              </Button>
            </SheetClose>
            <Button
              onClick={handleConfirm}
              disabled={!selectedBuyerId || loading}
              className="flex-1"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>저장 중...</span>
                </div>
              ) : (
                `CRM에 추가`
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default EmailCrmAssignDrawer;
