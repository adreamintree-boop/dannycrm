import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, FileText, User } from 'lucide-react';
import { Buyer, Activity, ActivityType, BuyerStatus } from '@/data/mockData';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ActivityTabProps {
  buyer: Buyer;
}

const ActivityTab: React.FC<ActivityTabProps> = ({ buyer }) => {
  const { getBuyerActivities, addActivity, deleteActivity, activeProjectId } = useApp();
  const activities = getBuyerActivities(buyer.id);

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [filters, setFilters] = useState<Record<ActivityType, boolean>>({
    'pre-sales': true,
    'inquiry': true,
    'rfq': true,
    'quotation': true,
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [newActivity, setNewActivity] = useState({
    type: 'pre-sales' as ActivityType,
    title: '',
    note: '',
  });

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

  const handleAddActivity = () => {
    if (!newActivity.title.trim()) return;

    const activityDate = selectedDay 
      ? new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), selectedDay)
      : new Date();

    addActivity({
      projectId: activeProjectId,
      buyerId: buyer.id,
      type: newActivity.type,
      title: newActivity.title,
      note: newActivity.note,
      createdAt: activityDate.toISOString().split('T')[0],
      author: '관리자',
    });

    setNewActivity({ type: 'pre-sales', title: '', note: '' });
    setShowAddForm(false);
    setSelectedDay(null);
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
    <div className="p-6 space-y-6">
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
          <Button variant="outline" size="sm" className="flex items-center gap-2">
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
                        setSelectedDay(day);
                        setShowAddForm(true);
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
              className="bg-blue-100 rounded-lg p-4 relative min-h-[180px] flex flex-col"
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
                  onClick={() => deleteActivity(activity.id)}
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

      {/* Add Activity Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>활동 등록</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedDay && (
              <div className="text-sm text-muted-foreground">
                날짜: {selectedMonth.getFullYear()}.{String(selectedMonth.getMonth() + 1).padStart(2, '0')}.{String(selectedDay).padStart(2, '0')}
              </div>
            )}
            <div>
              <label className="text-sm font-medium">활동 유형</label>
              <Select
                value={newActivity.type}
                onValueChange={(value) => setNewActivity({ ...newActivity, type: value as ActivityType })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre-sales">Pre-sales</SelectItem>
                  <SelectItem value="inquiry">Inquiry</SelectItem>
                  <SelectItem value="rfq">RFQ</SelectItem>
                  <SelectItem value="quotation">Quotation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">제목</label>
              <Input
                value={newActivity.title}
                onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                placeholder="활동 제목 입력"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">메모</label>
              <Input
                value={newActivity.note}
                onChange={(e) => setNewActivity({ ...newActivity, note: e.target.value })}
                placeholder="메모 입력 (선택)"
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddForm(false)}>
              취소
            </Button>
            <Button onClick={handleAddActivity}>
              등록
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActivityTab;
