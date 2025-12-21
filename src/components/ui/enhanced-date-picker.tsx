import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isAfter, isBefore, subYears, startOfYear, endOfYear, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';

type ViewMode = 'year' | 'month' | 'day';

interface EnhancedDatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
}

const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

// Calculate rolling 3-year window
const getDateRestrictions = () => {
  const today = new Date();
  const threeYearsAgo = subYears(today, 3);
  threeYearsAgo.setDate(threeYearsAgo.getDate() + 1); // Exclusive: day after 3 years ago
  return {
    minDate: threeYearsAgo,
    maxDate: today,
  };
};

export function EnhancedDatePicker({
  date,
  onDateChange,
  placeholder = '날짜 선택',
  minDate: propMinDate,
  maxDate: propMaxDate,
  disabled = false,
  className,
}: EnhancedDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [viewDate, setViewDate] = useState(() => date || new Date());

  // Apply rolling 3-year restriction
  const restrictions = getDateRestrictions();
  const minDate = propMinDate && isAfter(propMinDate, restrictions.minDate) ? propMinDate : restrictions.minDate;
  const maxDate = propMaxDate && isBefore(propMaxDate, restrictions.maxDate) ? propMaxDate : restrictions.maxDate;

  // Get available years within the 3-year window
  const availableYears = useMemo(() => {
    const years: number[] = [];
    const startYear = minDate.getFullYear();
    const endYear = maxDate.getFullYear();
    for (let year = endYear; year >= startYear; year--) {
      years.push(year);
    }
    return years;
  }, [minDate, maxDate]);

  const handleYearSelect = (year: number) => {
    const newDate = new Date(viewDate);
    newDate.setFullYear(year);
    // Ensure the month is valid for the selected year
    if (year === minDate.getFullYear() && newDate.getMonth() < minDate.getMonth()) {
      newDate.setMonth(minDate.getMonth());
    }
    if (year === maxDate.getFullYear() && newDate.getMonth() > maxDate.getMonth()) {
      newDate.setMonth(maxDate.getMonth());
    }
    setViewDate(newDate);
    setViewMode('month');
  };

  const handleMonthSelect = (month: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(month);
    setViewDate(newDate);
    setViewMode('day');
  };

  const handleDaySelect = (day: Date) => {
    onDateChange(day);
    setOpen(false);
    setViewMode('day');
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' ? subMonths(viewDate, 1) : addMonths(viewDate, 1);
    if (!isBefore(newDate, startOfMonth(minDate)) && !isAfter(newDate, endOfMonth(maxDate))) {
      setViewDate(newDate);
    }
  };

  const isDateDisabled = (day: Date) => {
    return isBefore(day, minDate) || isAfter(day, maxDate);
  };

  const isMonthDisabled = (month: number) => {
    const year = viewDate.getFullYear();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    return isAfter(monthStart, maxDate) || isBefore(monthEnd, minDate);
  };

  const isYearDisabled = (year: number) => {
    return year < minDate.getFullYear() || year > maxDate.getFullYear();
  };

  const canNavigatePrev = () => {
    const prevMonth = subMonths(viewDate, 1);
    return !isBefore(endOfMonth(prevMonth), minDate);
  };

  const canNavigateNext = () => {
    const nextMonth = addMonths(viewDate, 1);
    return !isAfter(startOfMonth(nextMonth), maxDate);
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    const days = eachDayOfInterval({ start, end });
    
    // Pad the start with previous month days
    const startDayOfWeek = start.getDay();
    const paddedDays: (Date | null)[] = Array(startDayOfWeek).fill(null);
    
    return [...paddedDays, ...days];
  }, [viewDate]);

  const renderYearView = () => (
    <div className="p-3">
      <div className="text-center text-sm font-medium text-foreground mb-3">연도 선택</div>
      <div className="grid grid-cols-3 gap-2">
        {availableYears.map((year) => {
          const isDisabled = isYearDisabled(year);
          const isSelected = date && date.getFullYear() === year;
          return (
            <button
              key={year}
              onClick={() => !isDisabled && handleYearSelect(year)}
              disabled={isDisabled}
              className={cn(
                "h-9 rounded-md text-sm font-medium transition-colors",
                isDisabled && "text-muted-foreground/40 cursor-not-allowed",
                !isDisabled && "hover:bg-accent hover:text-accent-foreground",
                isSelected && !isDisabled && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                !isSelected && !isDisabled && "text-foreground"
              )}
            >
              {year}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderMonthView = () => (
    <div className="p-3">
      <button
        onClick={() => setViewMode('year')}
        className="w-full text-center text-sm font-medium text-foreground mb-3 hover:text-primary transition-colors"
      >
        {viewDate.getFullYear()}년 ▼
      </button>
      <div className="grid grid-cols-3 gap-2">
        {MONTHS.map((month, index) => {
          const isDisabled = isMonthDisabled(index);
          const isSelected = date && date.getFullYear() === viewDate.getFullYear() && date.getMonth() === index;
          return (
            <button
              key={month}
              onClick={() => !isDisabled && handleMonthSelect(index)}
              disabled={isDisabled}
              className={cn(
                "h-9 rounded-md text-sm font-medium transition-colors",
                isDisabled && "text-muted-foreground/40 cursor-not-allowed",
                !isDisabled && "hover:bg-accent hover:text-accent-foreground",
                isSelected && !isDisabled && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                !isSelected && !isDisabled && "text-foreground"
              )}
            >
              {month}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderDayView = () => (
    <div className="p-3">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigateMonth('prev')}
          disabled={!canNavigatePrev()}
          className={cn(
            "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
            canNavigatePrev() ? "hover:bg-accent" : "text-muted-foreground/40 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => setViewMode('year')}
          className="text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          {format(viewDate, 'yyyy년 M월', { locale: ko })}
        </button>
        <button
          onClick={() => navigateMonth('next')}
          disabled={!canNavigateNext()}
          className={cn(
            "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
            canNavigateNext() ? "hover:bg-accent" : "text-muted-foreground/40 cursor-not-allowed"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="h-8 w-8" />;
          }
          
          const isDisabled = isDateDisabled(day);
          const isSelected = date && isSameDay(day, date);
          const isToday = isSameDay(day, new Date());
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => !isDisabled && handleDaySelect(day)}
              disabled={isDisabled}
              className={cn(
                "h-8 w-8 flex items-center justify-center text-sm rounded-md transition-colors",
                isDisabled && "text-muted-foreground/40 cursor-not-allowed",
                !isDisabled && !isSelected && "hover:bg-accent hover:text-accent-foreground",
                isSelected && !isDisabled && "bg-primary text-primary-foreground",
                isToday && !isSelected && !isDisabled && "bg-accent text-accent-foreground",
                !isSelected && !isToday && !isDisabled && "text-foreground"
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setViewMode('day');
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-[130px] justify-start font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'yyyy-MM-dd') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        <div className="min-w-[280px]">
          {viewMode === 'year' && renderYearView()}
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'day' && renderDayView()}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { getDateRestrictions };
