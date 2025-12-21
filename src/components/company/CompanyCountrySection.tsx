import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { BLRecord } from '@/data/blMockData';

interface CompanyCountrySectionProps {
  title: string;
  data: BLRecord[];
  type: 'origin' | 'destination';
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
];

const CompanyCountrySection: React.FC<CompanyCountrySectionProps> = ({ title, data, type }) => {
  const countryStats = useMemo(() => {
    const stats: Record<string, { count: number; value: number }> = {};
    
    data.forEach(record => {
      const country = type === 'origin' ? record.originCountry : record.destinationCountry;
      if (!country || country === '-') return;
      
      if (!stats[country]) {
        stats[country] = { count: 0, value: 0 };
      }
      stats[country].count += 1;
      stats[country].value += record.valueUSD || 0;
    });

    return Object.entries(stats)
      .map(([country, stat]) => ({ country, ...stat }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [data, type]);

  const totalCount = countryStats.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card className="p-6 bg-card border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">지도 보기</span>
      </div>

      {/* Simple map placeholder with country markers */}
      <div className="relative h-[200px] bg-muted/20 rounded-lg mb-4 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 400 200" className="w-full h-full opacity-30">
            {/* Simplified world map outline */}
            <path 
              d="M50,100 Q100,50 200,60 Q300,70 350,100 Q300,130 200,140 Q100,150 50,100"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-muted-foreground"
            />
          </svg>
        </div>
        
        {/* Country markers */}
        {countryStats.slice(0, 5).map((stat, index) => {
          // Random positions for demo
          const positions = [
            { x: 30, y: 40 },
            { x: 60, y: 30 },
            { x: 45, y: 60 },
            { x: 75, y: 45 },
            { x: 50, y: 50 }
          ];
          const pos = positions[index];
          
          return (
            <div
              key={stat.country}
              className="absolute w-3 h-3 rounded-full bg-primary animate-pulse"
              style={{ 
                left: `${pos.x}%`, 
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              title={stat.country}
            />
          );
        })}
      </div>

      {/* Country list */}
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {countryStats.map((stat, index) => (
          <div 
            key={stat.country} 
            className="flex items-center justify-between text-sm py-1"
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-foreground">{stat.country}</span>
            </div>
            <span className="text-muted-foreground font-medium">{stat.count}</span>
          </div>
        ))}
        
        {countryStats.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            데이터 없음
          </p>
        )}
      </div>
    </Card>
  );
};

export default CompanyCountrySection;
