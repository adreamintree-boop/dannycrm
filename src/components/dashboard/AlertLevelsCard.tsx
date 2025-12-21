import React from 'react';
import { AlertTriangle } from 'lucide-react';

const AlertLevelsCard: React.FC = () => {
  // Mock line chart data
  const dataPoints = [
    { x: 10, y: 5 },
    { x: 11, y: 6 },
    { x: 12, y: 4 },
    { x: 13, y: 5 },
    { x: 14, y: 7 },
    { x: 15, y: 6 },
    { x: 16, y: 8 },
    { x: 17, y: 9 },
    { x: 18, y: 7 },
    { x: 19, y: 6 },
    { x: 20, y: 5 },
    { x: 21, y: 4 },
  ];

  const width = 600;
  const height = 150;
  const padding = 30;

  const xScale = (x: number) => ((x - 10) / 11) * (width - padding * 2) + padding;
  const yScale = (y: number) => height - padding - (y / 25) * (height - padding * 2);

  const linePath = dataPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.x)} ${yScale(p.y)}`)
    .join(' ');

  return (
    <div className="dashboard-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </div>
          <h3 className="font-semibold text-foreground">Sales Activity Alert Levels</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-status-client"></span>
            <span className="text-muted-foreground">영업활동일지 0~2개</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-status-target"></span>
            <span className="text-muted-foreground">영업활동일지 3개 이상</span>
          </div>
        </div>
      </div>

      {/* Line chart */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
        {/* Y-axis labels */}
        {[25, 20, 15, 10, 5, 0].map((val) => (
          <g key={val}>
            <text
              x={padding - 10}
              y={yScale(val)}
              className="text-[10px] fill-muted-foreground"
              textAnchor="end"
              dominantBaseline="middle"
            >
              {val}
            </text>
            <line
              x1={padding}
              y1={yScale(val)}
              x2={width - padding}
              y2={yScale(val)}
              stroke="hsl(var(--border))"
              strokeWidth="1"
            />
          </g>
        ))}

        {/* Threshold lines */}
        <line
          x1={padding}
          y1={yScale(15)}
          x2={width - padding}
          y2={yScale(15)}
          stroke="hsl(var(--status-client))"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
        <line
          x1={padding}
          y1={yScale(10)}
          x2={width - padding}
          y2={yScale(10)}
          stroke="hsl(var(--status-target))"
          strokeWidth="1"
          strokeDasharray="4 2"
        />

        {/* X-axis labels */}
        {[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((val) => (
          <text
            key={val}
            x={xScale(val)}
            y={height - 10}
            className="text-[10px] fill-muted-foreground"
            textAnchor="middle"
          >
            {val}
          </text>
        ))}

        {/* Data line */}
        <path
          d={linePath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle
            key={i}
            cx={xScale(p.x)}
            cy={yScale(p.y)}
            r="3"
            fill="hsl(var(--primary))"
          />
        ))}
      </svg>
    </div>
  );
};

export default AlertLevelsCard;
