import React, { useMemo, useState } from 'react';
import { ExternalLink, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BLRecord } from '@/data/blMockData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface BLSummaryPanelProps {
  results: BLRecord[];
  startDate?: Date;
  endDate?: Date;
  onAddToCRM?: (companyName: string, type: 'buyer' | 'supplier') => void;
  onSave?: () => void;
}

const COLORS = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'];

const BLSummaryPanel: React.FC<BLSummaryPanelProps> = ({
  results,
  startDate,
  endDate,
  onAddToCRM,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'buyers' | 'suppliers'>('buyers');

  // Calculate top 5 companies based on active tab
  const topCompanies = useMemo(() => {
    const companyMap = new Map<string, number>();
    
    results.forEach(record => {
      const companyName = activeTab === 'buyers' ? record.importer : record.exporter;
      if (companyName && companyName !== '-') {
        companyMap.set(companyName, (companyMap.get(companyName) || 0) + 1);
      }
    });

    const sorted = Array.from(companyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count], index) => ({
        name,
        count,
        percentage: results.length > 0 ? ((count / results.length) * 100).toFixed(1) : '0.0',
        color: COLORS[index]
      }));

    return sorted;
  }, [results, activeTab]);

  // Prepare pie chart data
  const pieData = useMemo(() => {
    return topCompanies.map((company, index) => ({
      name: company.name,
      value: company.count,
      color: COLORS[index]
    }));
  }, [topCompanies]);

  const maxCount = topCompanies.length > 0 ? topCompanies[0].count : 1;

  // Format date range for display
  const dateRangeText = useMemo(() => {
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}.${m}.${d}`;
    };

    if (startDate && endDate) {
      return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
    }
    return 'yyyy.mm.dd ~ yyyy.mm.dd';
  }, [startDate, endDate]);

  // Helper functions for external search URLs
  const getGoogleUrl = (companyName: string): string => {
    const keyword = companyName.trim();
    return `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
  };

  const getLinkedinCompanySearchUrl = (companyName: string): string => {
    const keyword = companyName.trim();
    return `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(keyword)}`;
  };

  const handleGoogleSearch = (companyName: string) => {
    window.open(getGoogleUrl(companyName), '_blank', 'noopener,noreferrer');
  };

  const handleLinkedInSearch = (companyName: string) => {
    window.open(getLinkedinCompanySearchUrl(companyName), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white border-l border-border h-full flex flex-col">
      {/* Header with Tabs */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => setActiveTab('buyers')}
            className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
              activeTab === 'buyers'
                ? 'text-foreground border-foreground'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            Buyers
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
              activeTab === 'suppliers'
                ? 'text-foreground border-foreground'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            Suppliers
          </button>
        </div>
        <div className="text-xs text-muted-foreground text-right">
          {dateRangeText}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {topCompanies.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">집계 데이터가 없습니다</p>
          </div>
        ) : (
          <>
            {/* Top 5 Title */}
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">
                <span className="text-primary">TOP 5</span>{' '}
                {activeTab === 'buyers' ? 'Buyers' : 'Suppliers'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                ※ This chart visualizes the top 5 items.
              </p>
            </div>

            {/* Donut Chart */}
            <div className="h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [`${value}건`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Labels around chart */}
              {topCompanies.slice(0, 5).map((company, index) => {
                // Position labels around the chart
                const positions = [
                  { top: '5%', right: '5%' },
                  { top: '20%', right: '0' },
                  { top: '65%', right: '0' },
                  { top: '80%', right: '15%' },
                  { bottom: '5%', left: '15%' }
                ];
                const pos = positions[index] || positions[0];
                
                return (
                  <div
                    key={company.name}
                    className="absolute text-[10px] text-muted-foreground max-w-[100px] truncate"
                    style={pos}
                  >
                    {company.name.length > 25 ? company.name.slice(0, 25) + '...' : company.name}
                  </div>
                );
              })}
            </div>

            {/* Top 5 List with Action Buttons */}
            <div className="mt-4 space-y-3">
              {topCompanies.map((company, index) => (
                <div key={company.name} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
                      style={{ backgroundColor: company.color }}
                    >
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate flex-1">
                      {company.name}
                    </span>
                  </div>
                  
                  {/* Progress bar and percentage */}
                  <div className="flex items-center gap-2 pl-7">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${(company.count / maxCount) * 100}%`,
                          backgroundColor: company.color
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 w-16 text-right">
                      {company.count}건 ({company.percentage}%)
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 pl-7 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px] gap-1"
                      onClick={() => {
                        // Navigate to company detail
                      }}
                    >
                      Detail
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px] gap-1"
                      onClick={() => handleGoogleSearch(company.name)}
                    >
                      Google
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px] gap-1"
                      onClick={() => handleLinkedInSearch(company.name)}
                    >
                      LinkedIn
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px] gap-1"
                      onClick={() => onAddToCRM?.(company.name, activeTab === 'buyers' ? 'buyer' : 'supplier')}
                    >
                      CRM
                      <UserPlus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Save Button */}
      <div className="px-6 py-4 border-t border-border">
        <Button 
          className="w-full"
          onClick={onSave}
        >
          저장하기
        </Button>
      </div>
    </div>
  );
};

export default BLSummaryPanel;
