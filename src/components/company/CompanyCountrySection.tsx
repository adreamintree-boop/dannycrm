import React, { useMemo } from 'react';
import { BLRecord } from '@/data/blMockData';

interface CompanyCountrySectionProps {
  title: string;
  data: BLRecord[];
  type: 'origin' | 'destination';
}

const COUNTRY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#84cc16'
];

// Simplified world map coordinates for countries
const COUNTRY_POSITIONS: Record<string, { x: number; y: number }> = {
  'China': { x: 75, y: 40 },
  'USA': { x: 20, y: 35 },
  'United States': { x: 20, y: 35 },
  'Japan': { x: 85, y: 38 },
  'Korea': { x: 80, y: 38 },
  'South Korea': { x: 80, y: 38 },
  'Germany': { x: 50, y: 32 },
  'Vietnam': { x: 76, y: 52 },
  'India': { x: 68, y: 48 },
  'Thailand': { x: 74, y: 52 },
  'Taiwan': { x: 80, y: 45 },
  'Indonesia': { x: 78, y: 62 },
  'Malaysia': { x: 75, y: 58 },
  'Brazil': { x: 30, y: 65 },
  'Mexico': { x: 18, y: 45 },
  'Canada': { x: 22, y: 28 },
  'UK': { x: 47, y: 30 },
  'France': { x: 48, y: 34 },
  'Italy': { x: 52, y: 36 },
  'Netherlands': { x: 49, y: 31 },
  'Australia': { x: 85, y: 72 },
  'Singapore': { x: 76, y: 58 },
  'Philippines': { x: 82, y: 52 },
};

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
  const maxCount = Math.max(...countryStats.map(s => s.count), 1);

  return (
    <div className="bg-white rounded border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>

      <div className="flex gap-4">
        {/* Simple Map Visualization */}
        <div className="w-1/2 relative h-[200px] bg-gray-50 rounded overflow-hidden">
          {/* World map outline (simplified) */}
          <svg viewBox="0 0 100 80" className="w-full h-full">
            {/* Continents simplified paths */}
            <path 
              d="M10,25 Q15,20 25,22 Q35,18 40,25 L38,40 Q30,45 20,42 Q12,38 10,25 Z"
              fill="#e5e7eb"
              className="opacity-60"
            />
            <path 
              d="M25,45 Q30,42 35,50 Q38,62 32,70 Q25,72 20,65 Q18,55 25,45 Z"
              fill="#e5e7eb"
              className="opacity-60"
            />
            <path 
              d="M42,25 Q50,20 58,25 Q55,40 48,38 Q42,35 42,25 Z"
              fill="#e5e7eb"
              className="opacity-60"
            />
            <path 
              d="M60,30 Q75,25 90,35 Q88,55 80,60 Q70,62 65,50 Q60,40 60,30 Z"
              fill="#e5e7eb"
              className="opacity-60"
            />
            <path 
              d="M78,65 Q88,60 95,70 Q90,78 82,76 Q76,72 78,65 Z"
              fill="#e5e7eb"
              className="opacity-60"
            />
            
            {/* Country markers */}
            {countryStats.slice(0, 5).map((stat, index) => {
              const pos = COUNTRY_POSITIONS[stat.country] || { x: 50 + index * 8, y: 40 };
              const size = Math.max(3, Math.min(8, (stat.count / maxCount) * 8));
              
              return (
                <g key={stat.country}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={size}
                    fill={COUNTRY_COLORS[index]}
                    opacity={0.7}
                    className="transition-all"
                  />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={size + 2}
                    fill={COUNTRY_COLORS[index]}
                    opacity={0.2}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Country List */}
        <div className="w-1/2 space-y-1.5 max-h-[200px] overflow-y-auto scrollbar-thin">
          {countryStats.map((stat, index) => {
            const percentage = ((stat.count / totalCount) * 100).toFixed(1);
            
            return (
              <div 
                key={stat.country} 
                className="flex items-center justify-between text-xs py-1 hover:bg-gray-50 px-1 rounded"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: COUNTRY_COLORS[index % COUNTRY_COLORS.length] }}
                  />
                  <span className="text-gray-700 truncate">{stat.country}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-gray-500">{percentage}%</span>
                  <span className="font-medium text-gray-900 w-8 text-right">{stat.count}</span>
                </div>
              </div>
            );
          })}
          
          {countryStats.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">
              데이터 없음
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyCountrySection;