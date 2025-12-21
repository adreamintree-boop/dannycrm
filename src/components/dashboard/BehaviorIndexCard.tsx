import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { behaviorIndexData } from '@/data/mockData';

const BehaviorIndexCard: React.FC = () => {
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(12);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <div className="dashboard-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Monthly Sales Behavior Index</h3>
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-4">
        행동지수바이어 데이터 등록, 등급 이동, 영업활동일지 등록 횟수의 합계
      </div>

      <div className="flex items-center justify-end gap-2 mb-4">
        <button onClick={handlePrevMonth} className="p-1 hover:bg-muted rounded">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium">{year}.{String(month).padStart(2, '0')}</span>
        <button onClick={handleNextMonth} className="p-1 hover:bg-muted rounded">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Calendar heatmap grid */}
      <div className="relative">
        {/* Grid rows for intensity levels */}
        <div className="space-y-1 mb-2">
          {[4, 3, 2, 1, 0].map((level) => (
            <div key={level} className="flex gap-1">
              {days.map((day) => {
                const value = behaviorIndexData[day] || 0;
                const showBlock = value >= level && level > 0;
                return (
                  <div
                    key={day}
                    className={`flex-1 h-3 rounded-sm ${
                      day > daysInMonth
                        ? 'invisible'
                        : showBlock
                        ? 'bg-primary'
                        : 'bg-muted'
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Dashed line */}
        <div className="border-t border-dashed border-status-target my-2" />

        {/* Day labels */}
        <div className="flex gap-1">
          {days.map((day) => (
            <div
              key={day}
              className={`flex-1 text-center text-[10px] text-muted-foreground ${
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
