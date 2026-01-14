import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBehaviorIndex } from '@/hooks/useBehaviorIndex';
import { Skeleton } from '@/components/ui/skeleton';

const BehaviorIndexCard: React.FC = () => {
  const { 
    year, 
    month, 
    squareData, 
    dailyData,
    maxSquares, 
    loading, 
    goToPreviousMonth, 
    goToNextMonth, 
    canGoNext 
  } = useBehaviorIndex();

  // Get days in the selected month
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  // Determine the number of rows to display (minimum 4, max from data)
  const numRows = Math.max(maxSquares, 4);
  const rows = Array.from({ length: numRows }, (_, i) => numRows - i); // top to bottom: highest to lowest

  if (loading) {
    return (
      <div className="dashboard-card">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-7 h-7 rounded-full" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-4 w-64 mb-4" />
        <Skeleton className="h-6 w-32 mb-4 ml-auto" />
        <div className="space-y-1">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Monthly Sales Behavior Index</h3>
        </div>
        
        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button 
            onClick={goToPreviousMonth} 
            className="p-1 hover:bg-muted rounded transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium min-w-[70px] text-center">
            {year}.{String(month).padStart(2, '0')}
          </span>
          <button 
            onClick={goToNextMonth} 
            className={`p-1 rounded transition-colors ${
              canGoNext 
                ? 'hover:bg-muted' 
                : 'opacity-40 cursor-not-allowed'
            }`}
            disabled={!canGoNext}
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-4">
        행동지수: 바이어 등록, 등급 이동, 영업활동일지 등록, 이메일 활동의 합계 (1~10건 = 1칸)
      </div>

      {/* Calendar heatmap grid - full width with evenly distributed columns */}
      <div className="relative flex-1 flex flex-col justify-end w-full">
        {/* Grid rows for intensity levels - from top (highest) to bottom (lowest) */}
        <div className="space-y-1 mb-2 w-full">
          {rows.map((level) => (
            <div key={level} className="flex justify-between w-full">
              {days.map((day) => {
                const squaresForDay = squareData[day] || 0;
                const rawCount = dailyData[day] || 0;
                const showBlock = squaresForDay >= level;
                return (
                  <div
                    key={day}
                    className={`w-3.5 h-3.5 rounded-sm transition-colors shrink-0 ${
                      day > daysInMonth
                        ? 'invisible'
                        : showBlock
                        ? 'bg-primary'
                        : 'bg-muted'
                    }`}
                    title={day <= daysInMonth ? `${month}월 ${day}일: ${rawCount}건` : undefined}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Dashed line */}
        <div className="border-t border-dashed border-status-target my-2 w-full" />

        {/* Day labels */}
        <div className="flex justify-between w-full">
          {days.map((day) => (
            <div
              key={day}
              className={`w-3.5 text-center text-[10px] text-muted-foreground shrink-0 ${
                day > daysInMonth ? 'invisible' : ''
              }`}
            >
              {day}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BehaviorIndexCard;
