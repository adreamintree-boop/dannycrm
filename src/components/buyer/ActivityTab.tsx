import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, FileText, User, Mail, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Buyer, Activity, ActivityType, BuyerStatus } from '@/data/mockData';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useSalesActivityLogs, SalesActivityLog } from '@/hooks/useSalesActivityLogs';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import EmailDetailDrawer from './EmailDetailDrawer';

interface ActivityTabProps {
  buyer: Buyer;
  onOpenDrawer: (mode: 'detail' | 'collection' | 'create', activity?: Activity, date?: Date) => void;
}

const ActivityTab: React.FC<ActivityTabProps> = ({ buyer, onOpenDrawer }) => {
  const { getBuyerActivities, deleteActivity } = useApp();
  const activities = getBuyerActivities(buyer.id);
  const { logs: emailLogs, loading: emailLogsLoading, fetchLogsByBuyer } = useSalesActivityLogs();

  useEffect(() => {
    fetchLogsByBuyer(buyer.id);
  }, [buyer.id, fetchLogsByBuyer]);

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [filters, setFilters] = useState<Record<ActivityType, boolean>>({
    'pre-sales': true,
    'inquiry': true,
    'rfq': true,
    'quotation': true,
  });
  
  const [emailDrawerOpen, setEmailDrawerOpen] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  const handleEmailLogClick = (log: SalesActivityLog) => {
    if (log.email_message_id) {
      setSelectedEmailId(log.email_message_id);
      setEmailDrawerOpen(true);
    }
  };

  const handleActivityClick = (activity: Activity) => {
    onOpenDrawer('detail', activity);
  };

  const handleCollectionClick = () => {
    onOpenDrawer('collection', activities[0]);
  };

  const today = new Date();

  // Filter activities based on selected filters
  const filteredActivities = activities.filter(a => filters[a.type]);

  // Count activities by type
  const activityCounts = {
    total: activities.length,
    'pre-sales': activities.filter(a => a.type === 'pre-sales').length,
    'inquiry': activities.filter(a => a.type === 'inquiry').length,
    'rfq': activities.filter(a => a.type === 'rfq').length,
    'quotation': activities.filter(a => a.type === 'quotation').length,
  };

  // Get activities by day for current month
  const getActivitiesForDay = (day: number) => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    return activities.filter(a => {
      const actDate = new Date(a.createdAt);
      return actDate.getFullYear() === year && 
             actDate.getMonth() === month && 
             actDate.getDate() === day;
    });
  };

  // Generate days in month with weekday
  const getDaysInMonth = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    const weekdays = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
    
    for (let i = 1; i <= 31; i++) {
      if (i <= daysInMonth) {
        const date = new Date(year, month, i);
        days.push({ day: i, weekday: weekdays[date.getDay()] });
      } else {
        days.push({ day: i, weekday: '' });
      }
    }
    return days;
  };

  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  const statusLabels: { key: BuyerStatus; label: string; color: string }[] = [
    { key: 'list', label: 'List', color: 'bg-status-list' },
    { key: 'lead', label: 'Lead', color: 'bg-status-lead' },
    { key: 'target', label: 'Target', color: 'bg-status-target' },
    { key: 'client', label: 'Client', color: 'bg-status-client' },
  ];

  const getStatusIndex = (status: BuyerStatus) => {
    return statusLabels.findIndex(s => s.key === status);
  };

  const formatMonthYear = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  return (
    <div className="p-6 space-y-6 relative">
      {/* Top Section: KPIs, Manager, Funnel Progress */}
      <div className="grid grid-cols-3 gap-6">
        {/* KPI Summary */}
        <div className="dashboard-card">
          <div className="text-sm text-muted-foreground mb-2">Total of data</div>
          <div className="text-3xl font-bold text-foreground mb-4">{activityCounts.total}</div>
          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-border">
            <div>
              <div className="text-xs text-muted-foreground">Pre-sales</div>
              <div className="text-xl font-bold text-foreground">{activityCounts['pre-sales']}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Inquiry</div>
              <div className="text-xl font-bold text-foreground">{activityCounts['inquiry']}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">RFQ</div>
              <div className="text-xl font-bold text-foreground">{activityCounts['rfq']}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Quotation</div>
              <div className="text-xl font-bold text-foreground">{activityCounts['quotation']}</div>
            </div>
          </div>
        </div>

        {/* Manager Card */}
        <div className="dashboard-card">
          <div className="text-sm text-muted-foreground mb-3">Manager</div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 border-2 border-background flex items-center justify-center"
                >
                  <User className="w-5 h-5 text-amber-700" />
                </div>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground" />
                -
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground" />
                -
              </div>
            </div>
          </div>
        </div>

        {/* Funnel Progress */}
        <div className="dashboard-card">
          <div className="flex items-center justify-between">
            {statusLabels.map((status, index) => {
              const isActive = getStatusIndex(buyer.status) >= index;
              const date = buyer[`${status.key}Date` as keyof Buyer] as string | undefined;
              return (
                <div key={status.key} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold ${isActive ? status.color : 'bg-muted'}`}>
                    {index + 1}
                  </div>
                  <div className={`text-xs mt-1 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {status.label}
                  </div>
                  {date && (
                    <div className="text-xs text-muted-foreground mt-1">{date}</div>
                  )}
                  {index < statusLabels.length - 1 && (
                    <div className={`absolute w-8 h-0.5 top-4 left-1/2 transform translate-x-4 ${isActive ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2 px-2">
            {statusLabels.map((status, index) => {
              if (index < statusLabels.length - 1) {
                return (
                  <div key={`line-${index}`} className="flex-1 h-0.5 bg-muted mx-1 relative">
                    {getStatusIndex(buyer.status) > index && (
                      <div className="absolute inset-0 bg-primary" />
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>

      {/* Calendar Strip Section */}
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-muted rounded">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">{formatMonthYear(selectedMonth)}</span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-muted rounded">
              <ChevronRight className="w-4 h-4" />
            </button>
            <Button
              variant="secondary"
              size="sm"
              className="ml-2 bg-foreground text-background hover:bg-foreground/90"
              onClick={() => setSelectedMonth(new Date())}
            >
              Today {today.getFullYear()}.{String(today.getMonth() + 1).padStart(2, '0')}.{String(today.getDate()).padStart(2, '0')}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            ※ 캘린더는 현재 날짜와 관계없이 가장 마지막에 등록된 영업활동일지가 속한 연월 기준으로 표시됩니다.
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={handleCollectionClick}
          >
            <FileText className="w-4 h-4" />
            영업활동일지 모아보기
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {getDaysInMonth().map(({ day, weekday }) => {
              const dayActivities = getActivitiesForDay(day);
              const isDisabled = !weekday;
              return (
                <div key={day} className="flex flex-col items-center w-10">
                  <div className={`text-xs ${isDisabled ? 'text-muted' : 'text-muted-foreground'}`}>
                    {day} {weekday}
                  </div>
                  <div className={`text-sm font-medium mt-1 ${isDisabled ? 'text-muted' : 'text-foreground'}`}>
                    {isDisabled ? '' : dayActivities.length || 0}
                  </div>
                  {!isDisabled && (
                    <button
                      onClick={() => {
                        const clickedDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
                        onOpenDrawer('create', undefined, clickedDate);
                      }}
                      className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs hover:bg-primary/90 mt-1"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity Type Filters */}
      <div className="flex items-center gap-4">
        {(['pre-sales', 'inquiry', 'rfq', 'quotation'] as ActivityType[]).map((type) => (
          <label key={type} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={filters[type]}
              onCheckedChange={(checked) => setFilters({ ...filters, [type]: !!checked })}
            />
            <span className="text-sm capitalize">
              {type === 'pre-sales' ? 'Pre-sales' : type === 'rfq' ? 'RFQ' : type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
          </label>
        ))}
      </div>

      {/* Activity Cards */}
      <div className="grid grid-cols-4 gap-4">
        {filteredActivities.length > 0 ? (
          filteredActivities.map((activity) => (
            <div
              key={activity.id}
              onClick={() => handleActivityClick(activity)}
              className="bg-blue-100 rounded-lg p-4 relative min-h-[180px] flex flex-col cursor-pointer hover:bg-blue-200 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-700 font-medium">{activity.createdAt}</span>
                <span className="text-xs bg-white/80 px-2 py-0.5 rounded text-muted-foreground">
                  # N/A
                </span>
              </div>
              <div className="text-sm font-medium text-blue-900 flex-1">
                {activity.title}
              </div>
              <div className="flex-1 flex items-center justify-center py-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-amber-600" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-auto pt-2">
                <span className="text-sm text-blue-700">{activity.author}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteActivity(activity.id);
                  }}
                  className="p-1 hover:bg-blue-200 rounded text-blue-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-4 py-12 text-center text-muted-foreground">
            등록된 활동일지가 없습니다.
          </div>
        )}
      </div>

      {/* Email Logs Section */}
      {emailLogs.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            이메일 기록
            <span className="text-sm font-normal text-muted-foreground">({emailLogs.length})</span>
          </h3>
          <div className="space-y-3">
            {emailLogs.map((log) => (
              <TooltipProvider key={log.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      onClick={() => handleEmailLogClick(log)}
                      className={`bg-card border border-border rounded-lg p-4 transition-all ${
                        log.email_message_id 
                          ? 'cursor-pointer hover:bg-accent hover:shadow-md' 
                          : 'opacity-75'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          log.direction === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                        }`}>
                          {log.direction === 'inbound' ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground truncate">{log.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              log.direction === 'inbound' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {log.direction === 'inbound' ? '수신' : '발신'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-line">
                            {log.content}
                          </p>
                          <div className="text-xs text-muted-foreground mt-2">
                            {format(new Date(log.occurred_at), 'yyyy년 M월 d일 a h:mm', { locale: ko })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  {log.email_message_id && (
                    <TooltipContent>
                      <p>이메일 내용 보기</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      )}

      {/* Email Detail Drawer */}
      <EmailDetailDrawer
        open={emailDrawerOpen}
        onClose={() => {
          setEmailDrawerOpen(false);
          setSelectedEmailId(null);
        }}
        emailMessageId={selectedEmailId}
        buyerId={buyer.id}
        buyerName={buyer.name}
        buyerStage={buyer.status}
      />
    </div>
  );
};

export default ActivityTab;
