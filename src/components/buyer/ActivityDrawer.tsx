import React, { useState, useEffect, useCallback } from 'react';
import { X, MapPin, ExternalLink, Paperclip, Calendar } from 'lucide-react';
import { Buyer, Activity, ActivityType } from '@/data/mockData';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/context/AppContext';

interface ActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  buyer: Buyer;
  activities: Activity[];
  mode: 'detail' | 'collection' | 'create';
  selectedActivity: Activity | null;
  onSelectActivity: (activity: Activity) => void;
  prefilledDate?: Date | null;
}

const ActivityDrawer: React.FC<ActivityDrawerProps> = ({
  isOpen,
  onClose,
  buyer,
  activities,
  mode,
  selectedActivity,
  onSelectActivity,
  prefilledDate,
}) => {
  const { addActivity, activeProjectId } = useApp();
  
  const [filters, setFilters] = useState<Record<ActivityType, boolean>>({
    'pre-sales': true,
    'inquiry': true,
    'rfq': true,
    'quotation': true,
  });

  // Create mode form state
  const [createForm, setCreateForm] = useState({
    title: '',
    date: '',
    stage: 'pre-sales' as ActivityType,
    content: '',
    attachments: [] as File[],
  });

  // Reset form when drawer opens in create mode
  useEffect(() => {
    if (isOpen && mode === 'create') {
      const dateStr = prefilledDate 
        ? `${prefilledDate.getFullYear()}-${String(prefilledDate.getMonth() + 1).padStart(2, '0')}-${String(prefilledDate.getDate()).padStart(2, '0')}`
        : new Date().toISOString().split('T')[0];
      setCreateForm({
        title: '',
        date: dateStr,
        stage: 'pre-sales',
        content: '',
        attachments: [],
      });
    }
  }, [isOpen, mode, prefilledDate]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const filteredActivities = activities.filter(a => filters[a.type]);

  // Sort activities by date (newest first)
  const sortedActivities = [...filteredActivities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getFilterLabel = (type: ActivityType) => {
    switch (type) {
      case 'pre-sales': return 'Pre-sales';
      case 'inquiry': return 'Inquiry';
      case 'rfq': return 'RFQ';
      case 'quotation': return 'Quotation';
    }
  };

  // Placeholder images for activity detail
  const placeholderImages = [
    'https://via.placeholder.com/150x120?text=Product+1',
    'https://via.placeholder.com/150x120?text=Product+2',
    'https://via.placeholder.com/150x120?text=Product+3',
  ];

  const handleCreateSubmit = () => {
    if (!createForm.title.trim()) return;

    addActivity({
      projectId: activeProjectId,
      buyerId: buyer.id,
      type: createForm.stage,
      title: createForm.title,
      note: createForm.content,
      createdAt: createForm.date,
      author: '관리자',
    });

    onClose();
  };

  const getDrawerTitle = () => {
    if (mode === 'create') return '영업활동일지 등록';
    if (mode === 'collection') return buyer.name;
    return null;
  };

  return (
    <>
      {/* Overlay - covers entire buyer detail screen */}
      <div 
        className={`absolute inset-0 bg-black/40 z-10 transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer - slides from right */}
      <div 
        className={`absolute top-0 right-0 h-full bg-background shadow-2xl z-20 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${mode === 'create' 
          ? 'w-full lg:w-[60vw] xl:w-[70vw] lg:min-w-[860px] xl:min-w-[900px] lg:max-w-[1200px]' 
          : 'w-full lg:w-[80vw] lg:min-w-[1100px] lg:max-w-[1400px]'
        }`}
      >
        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mode === 'create' ? (
              <span className="font-bold text-lg">{getDrawerTitle()}</span>
            ) : mode === 'detail' ? (
              <>
                <span className="text-sm text-slate-300">고객사</span>
                <span className="font-medium">에이팜건강</span>
                <span className="text-sm text-slate-300 ml-2">바이어</span>
                <span className="font-medium">{buyer.name}</span>
              </>
            ) : (
              <span className="font-bold text-lg">{buyer.name}</span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="h-[calc(100%-60px)] overflow-hidden">
          {mode === 'create' ? (
            <CreateView
              buyer={buyer}
              form={createForm}
              setForm={setCreateForm}
              onSubmit={handleCreateSubmit}
            />
          ) : mode === 'detail' ? (
            <DetailView
              buyer={buyer}
              activities={sortedActivities}
              selectedActivity={selectedActivity}
              onSelectActivity={onSelectActivity}
              filters={filters}
              setFilters={setFilters}
              getFilterLabel={getFilterLabel}
              placeholderImages={placeholderImages}
            />
          ) : (
            <CollectionView
              buyer={buyer}
              activities={sortedActivities}
              filters={filters}
              setFilters={setFilters}
              getFilterLabel={getFilterLabel}
              placeholderImages={placeholderImages}
            />
          )}
        </div>
      </div>
    </>
  );
};

// Create View Component
interface CreateViewProps {
  buyer: Buyer;
  form: {
    title: string;
    date: string;
    stage: ActivityType;
    content: string;
    attachments: File[];
  };
  setForm: React.Dispatch<React.SetStateAction<{
    title: string;
    date: string;
    stage: ActivityType;
    content: string;
    attachments: File[];
  }>>;
  onSubmit: () => void;
}

const CreateView: React.FC<CreateViewProps> = ({ buyer, form, setForm, onSubmit }) => {
  const stages: { key: ActivityType; label: string; desc: string }[] = [
    { key: 'pre-sales', label: 'Pre-sales', desc: '사전 영업 활동' },
    { key: 'inquiry', label: 'Inquiry', desc: '문의 접수' },
    { key: 'rfq', label: 'RFQ', desc: '견적 요청' },
    { key: 'quotation', label: 'Quotation', desc: '견적 제출' },
  ];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${year}.${month}.${day}`;
  };

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2">활동제목</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="활동 제목을 입력하세요"
                  className="w-full"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-2">활동일자</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  선택된 날짜: {formatDate(form.date)}
                </p>
              </div>

              {/* Stage Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">활동단계</label>
                <div className="grid grid-cols-2 gap-3">
                  {stages.map((stage) => (
                    <button
                      key={stage.key}
                      onClick={() => setForm({ ...form, stage: stage.key })}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        form.stage === stage.key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-sm">{stage.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{stage.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">첨부파일</label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Paperclip className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">파일을 드래그하거나 클릭하여 업로드</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {form.attachments.length}개 / 5개
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col h-full">
              <label className="block text-sm font-medium mb-2">상세내용</label>
              {/* Toolbar placeholder */}
              <div className="flex items-center gap-1 p-2 border border-border rounded-t-lg bg-muted/30">
                <button className="p-1.5 hover:bg-muted rounded text-sm font-bold">B</button>
                <button className="p-1.5 hover:bg-muted rounded text-sm italic">I</button>
                <button className="p-1.5 hover:bg-muted rounded text-sm underline">U</button>
                <div className="w-px h-4 bg-border mx-1" />
                <button className="p-1.5 hover:bg-muted rounded text-xs">목록</button>
                <button className="p-1.5 hover:bg-muted rounded text-xs">링크</button>
              </div>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="상세 내용을 입력하세요..."
                className="flex-1 min-h-[300px] rounded-t-none border-t-0 resize-none"
              />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-4 flex justify-end">
        <Button 
          onClick={onSubmit}
          className="bg-primary hover:bg-primary/90 px-8"
          disabled={!form.title.trim()}
        >
          등록
        </Button>
      </div>
    </div>
  );
};
interface DetailViewProps {
  buyer: Buyer;
  activities: Activity[];
  selectedActivity: Activity | null;
  onSelectActivity: (activity: Activity) => void;
  filters: Record<ActivityType, boolean>;
  setFilters: React.Dispatch<React.SetStateAction<Record<ActivityType, boolean>>>;
  getFilterLabel: (type: ActivityType) => string;
  placeholderImages: string[];
}

const DetailView: React.FC<DetailViewProps> = ({
  buyer,
  activities,
  selectedActivity,
  onSelectActivity,
  filters,
  setFilters,
  getFilterLabel,
  placeholderImages,
}) => {
  return (
    <div className="flex h-full">
      {/* Left Column: Activity List - fixed width 300px */}
      <div className="w-[300px] shrink-0 border-r border-border bg-muted/30 flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-border">
          <div className="flex flex-wrap gap-3">
            {(['pre-sales', 'inquiry', 'rfq', 'quotation'] as ActivityType[]).map((type) => (
              <label key={type} className="flex items-center gap-1.5 cursor-pointer text-xs">
                <Checkbox
                  checked={filters[type]}
                  onCheckedChange={(checked) => setFilters({ ...filters, [type]: !!checked })}
                  className="w-3.5 h-3.5"
                />
                <span>{getFilterLabel(type)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Activity List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {activities.map((activity) => (
              <button
                key={activity.id}
                onClick={() => onSelectActivity(activity)}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                  selectedActivity?.id === activity.id
                    ? 'bg-primary/10 border border-primary'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{activity.createdAt}</span>
                  {selectedActivity?.id === activity.id && (
                    <span className="text-xs text-primary">★</span>
                  )}
                </div>
                <div className="text-sm font-medium mt-1 line-clamp-2">{activity.title}</div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Middle Column: Activity Detail */}
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-6">
            {selectedActivity ? (
              <>
                {/* Activity Header */}
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <span className="text-primary">★</span>
                    {selectedActivity.title}
                  </h2>
                  <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                    # N/A
                  </span>
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
                  <div>
                    <span className="text-foreground">작성일</span> {selectedActivity.createdAt}
                  </div>
                  <div>
                    <span className="text-foreground">작성자</span> {selectedActivity.author}
                  </div>
                  <div>
                    <span className="text-foreground">조회수</span> -
                  </div>
                </div>

                {/* Image Thumbnails */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {placeholderImages.map((img, idx) => (
                    <div 
                      key={idx} 
                      className="aspect-[4/3] bg-muted rounded-lg flex items-center justify-center overflow-hidden border border-border relative"
                    >
                      <img 
                        src={img} 
                        alt={`Placeholder ${idx + 1}`}
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 120"><rect fill="%23f0f0f0" width="150" height="120"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="12">Product</text></svg>';
                        }}
                      />
                      {idx === 0 && (
                        <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">NEW</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Content */}
                <div className="prose prose-sm max-w-none">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedActivity.note || `- ${buyer.name}는 싱가포르에 기반을 둔 건강기능식품 전문 유통업체로, 고품질의 비타민, 미네랄, 허브 보충제 등을 온라인 플랫폼을 통해 제공하고 있음

(비타민 및 미네랄 보충제) 면역력 강화, 에너지 충전, 뼈 건강 등을 위한 제품
(허브 보충제) 자연 유래 성분을 기반으로 한 건강 보조 제품
(기타 건강기능식품) 특정 건강 목표에 맞춘 다양한 보충제

[제안 가능성]
고품질 비타민, 미네랄, 허브 보충제 등 다양한 목적의 건강기능식품을 취급하고 있어 제안 가능성 높을 것으로 판단됨.`}
                  </p>
                </div>

                {/* Rewrite Button */}
                <div className="mt-6 flex justify-end">
                  <Button variant="default" className="bg-primary hover:bg-primary/90">
                    재작성
                  </Button>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                활동을 선택하세요
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Column: Buyer Info Panel - fixed width 400px */}
      <div className="w-[400px] shrink-0 border-l border-border bg-muted/20 flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button className="flex-1 py-3 text-sm font-medium text-primary border-b-2 border-primary">
            company
          </button>
          <button className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
            person
          </button>
          <button className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
            history
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Map Placeholder */}
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border border-border overflow-hidden">
              <div className="text-center text-muted-foreground">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <span className="text-xs">지도</span>
              </div>
            </div>

            {/* Buyer Fields - wider labels for better readability */}
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">☆ 고객등급</span>
                <span className="font-medium capitalize">level 2 · {buyer.status}</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">🏢 바이어 기업명</span>
                <span className="font-medium">{buyer.name}</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">🌍 대륙</span>
                <span className="text-primary">아시아</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">📍 세부지역</span>
                <span className="text-primary">동남아시아</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">🏳️ 국가</span>
                <span>{buyer.country}</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">🕐 실시간 현지시간</span>
                <span>{new Date().toLocaleString('ko-KR')}</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">📮 주소</span>
                <span className="break-words">{buyer.address || '37 Jalan Pemimpin #06-09 MAPEX Building Singapore 577177'}</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">🌐 웹사이트</span>
                <a href={buyer.websiteUrl || '#'} className="text-primary hover:underline flex items-center gap-1 break-all" target="_blank" rel="noopener noreferrer">
                  {buyer.websiteUrl || '-'}
                  {buyer.websiteUrl && <ExternalLink className="w-3 h-3 shrink-0" />}
                </a>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">💰 매출액</span>
                <span>$ -</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">📦 주요품목</span>
                <span>-</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">📞 대표 연락처</span>
                <span>{buyer.phone || '-'}</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">✉️ 대표 이메일</span>
                <span className="break-all">{buyer.email || '-'}</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">♡ SNS</span>
                <span>-</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

interface CollectionViewProps {
  buyer: Buyer;
  activities: Activity[];
  filters: Record<ActivityType, boolean>;
  setFilters: React.Dispatch<React.SetStateAction<Record<ActivityType, boolean>>>;
  getFilterLabel: (type: ActivityType) => string;
  placeholderImages: string[];
}

const CollectionView: React.FC<CollectionViewProps> = ({
  buyer,
  activities,
  filters,
  setFilters,
  getFilterLabel,
  placeholderImages,
}) => {
  return (
    <div className="flex h-full">
      {/* Left Column: Activity List Navigation - fixed width 300px */}
      <div className="w-[300px] shrink-0 border-r border-border bg-muted/30 flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-border">
          <div className="flex flex-wrap gap-3">
            {(['pre-sales', 'inquiry', 'rfq', 'quotation'] as ActivityType[]).map((type) => (
              <label key={type} className="flex items-center gap-1.5 cursor-pointer text-xs">
                <Checkbox
                  checked={filters[type]}
                  onCheckedChange={(checked) => setFilters({ ...filters, [type]: !!checked })}
                  className="w-3.5 h-3.5"
                />
                <span>{getFilterLabel(type)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Activity List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="p-3 rounded-lg mb-2 hover:bg-muted cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{activity.createdAt}</span>
                  <span className="text-xs text-primary">★</span>
                </div>
                <div className="text-sm font-medium mt-1 line-clamp-2">{activity.title}</div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Middle Column: Activity Cards Feed */}
      <div className="flex-1 min-w-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {activities.map((activity) => (
              <div key={activity.id} className="border border-border rounded-lg p-6 bg-card">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-muted-foreground">{activity.createdAt}</span>
                      <span className="text-primary">★</span>
                      <span className="font-medium">{activity.title}</span>
                    </div>
                  </div>
                  <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                    # N/A
                  </span>
                </div>

                {/* Image Thumbnails */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {placeholderImages.map((img, idx) => (
                    <div 
                      key={idx} 
                      className="aspect-[4/3] bg-muted rounded-lg flex items-center justify-center overflow-hidden border border-border relative"
                    >
                      <img 
                        src={img} 
                        alt={`Placeholder ${idx + 1}`}
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 120"><rect fill="%23f0f0f0" width="150" height="120"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="12">Product</text></svg>';
                        }}
                      />
                      {idx === 0 && (
                        <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">NEW</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Content */}
                <div className="prose prose-sm max-w-none">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {activity.note || `- 해당 바이어에 대한 상세 활동 내용이 여기에 표시됩니다.

최초 연락을 위해 유선으로 연결 시도하였으며, 고객센터 상담원이 전화를 응대함
당사 에이팜(Apharm) 제품의 강점을 간단히 소개:

여성 건강에 특화된 성분으로, 특히 수유부에게 안전하고 도움이 되는 포뮬레이션 강조
해당 내용을 바탕으로 관련 담당자와 직접 통화 가능 여부를 요청하였으니,
고객사 내부 방침상 개별 담당자 연결은 어렵다고 회신

대신, 고객센터 대표 이메일로 내용을 전달하면 관련 부서에서 모두 검토 가능하다는 안내를 받음
이에 따라, 고객사가 요청한 공식 이메일 주소로 회사 및 제품 정보를 정리하여 발송하기로 함`}
                  </p>
                </div>
              </div>
            ))}

            {activities.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                등록된 활동일지가 없습니다.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Column: Buyer Info Panel - fixed width 400px */}
      <div className="w-[400px] shrink-0 border-l border-border bg-muted/20 flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button className="flex-1 py-3 text-sm font-medium text-primary border-b-2 border-primary">
            company
          </button>
          <button className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
            person
          </button>
          <button className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
            history
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5">
            {/* Map Placeholder */}
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border border-border overflow-hidden">
              <div className="text-center text-muted-foreground">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <span className="text-xs">지도</span>
              </div>
            </div>

            {/* Buyer Fields */}
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">☆ 고객등급</span>
                <span className="font-medium capitalize">level 2 · {buyer.status}</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">🏢 바이어 기업명</span>
                <span className="font-medium">{buyer.name}</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">🌍 대륙</span>
                <span className="text-primary">아시아</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">📍 세부지역</span>
                <span className="text-primary">동남아시아</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">🏳️ 국가</span>
                <span>{buyer.country}</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">📞 대표 연락처</span>
                <span>{buyer.phone || '-'}</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-muted-foreground w-28 shrink-0">✉️ 대표 이메일</span>
                <span className="break-all">{buyer.email || '-'}</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ActivityDrawer;
