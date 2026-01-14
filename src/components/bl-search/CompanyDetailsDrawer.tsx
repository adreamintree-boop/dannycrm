import React, { useMemo, useState } from 'react';
import { X, MapPin, Lock, Unlock } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { BLRecord } from '@/data/blMockData';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export type CompanyDetailsMode = 'buyer' | 'supplier';

interface CompanyDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  mode: CompanyDetailsMode;
  allResults: BLRecord[];
  currentPageRows: BLRecord[];
  startDate?: Date;
  endDate?: Date;
}

// Generate all months between startDate and endDate inclusive
const generateMonthRange = (start: Date, end: Date): string[] => {
  const months: string[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  
  while (current <= endMonth) {
    const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    months.push(monthKey);
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
};

// Normalize company name for matching
const normalizeCompanyName = (name: string | null | undefined): string => {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
};

const CompanyDetailsDrawer: React.FC<CompanyDetailsDrawerProps> = ({
  isOpen,
  onClose,
  companyName,
  mode,
  allResults,
  currentPageRows,
  startDate,
  endDate,
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Filter results for this company from the ENTIRE dataset
  const companyRecords = useMemo(() => {
    if (mode === 'buyer') {
      return allResults.filter(record => 
        record.importer.toLowerCase() === companyName.toLowerCase()
      );
    } else {
      return allResults.filter(record => 
        record.exporter.toLowerCase() === companyName.toLowerCase()
      );
    }
  }, [allResults, companyName, mode]);

  // Build set of visible company names from current page rows
  // For buyer mode: check exporters, for supplier mode: check importers
  const visibleCompanySet = useMemo(() => {
    const set = new Set<string>();
    currentPageRows.forEach(record => {
      const fieldToCheck = mode === 'buyer' ? record.exporter : record.importer;
      const normalized = normalizeCompanyName(fieldToCheck);
      if (normalized && normalized !== '-') {
        set.add(normalized);
      }
    });
    return set;
  }, [currentPageRows, mode]);

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

  // Calculate Top 5 Trading Companies
  // For buyer mode: aggregate exporters
  // For supplier mode: aggregate importers
  const topTradingCompanies = useMemo(() => {
    const companyMap = new Map<string, number>();
    
    companyRecords.forEach(record => {
      const targetCompany = mode === 'buyer' ? record.exporter : record.importer;
      if (targetCompany && targetCompany !== '-') {
        companyMap.set(targetCompany, (companyMap.get(targetCompany) || 0) + 1);
      }
    });

    return Array.from(companyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => {
        const normalized = normalizeCompanyName(name);
        const isVisible = visibleCompanySet.has(normalized);
        return { name, count, isVisible };
      })
      .sort((a, b) => {
        if (a.isVisible === b.isVisible) return 0;
        return a.isVisible ? -1 : 1;
      });
  }, [companyRecords, visibleCompanySet, mode]);

  // Calculate monthly shipping activity with FULL month range
  const monthlyActivity = useMemo(() => {
    const monthMap = new Map<string, number>();
    
    companyRecords.forEach(record => {
      const date = new Date(record.date);
      if (!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
      }
    });

    if (!startDate || !endDate) {
      return Array.from(monthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, count]) => ({
          month,
          displayMonth: month.split('-')[1],
          count,
        }));
    }

    const allMonths = generateMonthRange(startDate, endDate);
    
    return allMonths.map(monthKey => ({
      month: monthKey,
      displayMonth: monthKey.split('-')[1],
      count: monthMap.get(monthKey) || 0,
    }));
  }, [companyRecords, startDate, endDate]);

  const totalTransactions = companyRecords.length;

  // Get recently traded products (latest 10)
  const recentProducts = useMemo(() => {
    return [...companyRecords]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map(record => ({
        date: record.date,
        hsCode: record.hsCode,
        shippingMethod: record.incoterms || '-',
        tradeTerms: record.incoterms || '-',
        productDescription: record.productName,
      }));
  }, [companyRecords]);

  // Get company locations from addresses
  const companyLocations = useMemo(() => {
    const locationSet = new Set<string>();
    
    companyRecords.forEach(record => {
      if (mode === 'buyer') {
        if (record.importerAddress && record.importerAddress !== '-') {
          locationSet.add(record.importerAddress);
        }
        if (record.destinationCountry && record.destinationCountry !== '-') {
          locationSet.add(record.destinationCountry);
        }
      } else {
        if (record.exporterAddress && record.exporterAddress !== '-') {
          locationSet.add(record.exporterAddress);
        }
        if (record.originCountry && record.originCountry !== '-') {
          locationSet.add(record.originCountry);
        }
      }
    });

    return Array.from(locationSet).slice(0, 5);
  }, [companyRecords, mode]);

  // Labels based on mode
  const headerLabel = mode === 'buyer' 
    ? <>Buyer Company <span className="text-primary">Import</span> Details</>
    : <>Supplier Company <span className="text-primary">Export</span> Details</>;
  
  const leftSideLabel = mode === 'buyer' ? 'Export' : 'Export';
  const rightSideLabel = mode === 'buyer' ? 'Import' : 'Import';
  
  const blurHelperText = mode === 'buyer'
    ? 'Only exporters shown on the current page are fully visible. Unlock to reveal all.'
    : 'Only importers shown on the current page are fully visible. Unlock to reveal all.';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[85vw] sm:max-w-[1100px] lg:w-[70vw] lg:max-w-[1200px] p-0 overflow-y-auto"
      >
        {/* Header */}
        <SheetHeader className="sticky top-0 bg-background z-10 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-sm font-normal text-muted-foreground">
                {headerLabel}
              </SheetTitle>
              <h2 className="text-xl font-bold mt-1 text-foreground uppercase">
                {companyName}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                ※ 집계기간 | 조회일 기준 ({dateRangeText})
              </span>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Top Section: Trading Companies + Shipping Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 Trading Companies */}
            <div className="bg-card border rounded-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <h3 className="font-semibold">Top 5 Trading Companies</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs gap-1.5"
                  onClick={() => setIsUnlocked(!isUnlocked)}
                >
                  {isUnlocked ? (
                    <>
                      <Lock className="w-3 h-3" />
                      Lock
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3" />
                      Unlock
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {blurHelperText}
              </p>
              
              {mode === 'buyer' ? (
                // Buyer mode: Exporters (left, blurred) -> Buyer (right, highlighted)
                <div className="flex gap-8">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground text-center mb-3">{leftSideLabel}</p>
                    <div className="space-y-2">
                      {topTradingCompanies.map((company, index) => {
                        const shouldBlur = !company.isVisible && !isUnlocked;
                        
                        return (
                          <div
                            key={index}
                            className={`border rounded-md px-3 py-2 text-xs bg-muted/30 transition-all relative ${
                              shouldBlur ? 'select-none' : 'hover:bg-muted/50'
                            }`}
                            style={shouldBlur ? { filter: 'blur(5px)', opacity: 0.6 } : undefined}
                          >
                            <span className="line-clamp-2">{company.name}</span>
                            {shouldBlur && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <Lock className="w-3 h-3 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {topTradingCompanies.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">데이터 없음</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <div className="w-12 h-0.5 bg-primary" />
                      <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-8 border-l-primary" />
                    </div>
                    
                    <div className="flex-shrink-0 w-[180px]">
                      <p className="text-sm text-primary text-center mb-3">{rightSideLabel}</p>
                      <div className="border-2 border-primary rounded-md px-3 py-3 text-xs bg-primary/5">
                        <span className="line-clamp-2 text-primary font-medium text-center block">
                          {companyName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Supplier mode: Supplier (left, highlighted) -> Importers (right, blurred)
                <div className="flex gap-8">
                  <div className="flex-shrink-0 w-[180px]">
                    <p className="text-sm text-primary text-center mb-3">{leftSideLabel}</p>
                    <div className="border-2 border-primary rounded-md px-3 py-3 text-xs bg-primary/5">
                      <span className="line-clamp-2 text-primary font-medium text-center block">
                        {companyName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <div className="w-12 h-0.5 bg-primary" />
                      <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-8 border-l-primary" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground text-center mb-3">{rightSideLabel}</p>
                    <div className="space-y-2">
                      {topTradingCompanies.map((company, index) => {
                        const shouldBlur = !company.isVisible && !isUnlocked;
                        
                        return (
                          <div
                            key={index}
                            className={`border rounded-md px-3 py-2 text-xs bg-muted/30 transition-all relative ${
                              shouldBlur ? 'select-none' : 'hover:bg-muted/50'
                            }`}
                            style={shouldBlur ? { filter: 'blur(5px)', opacity: 0.6 } : undefined}
                          >
                            <span className="line-clamp-2">{company.name}</span>
                            {shouldBlur && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <Lock className="w-3 h-3 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {topTradingCompanies.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">데이터 없음</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Shipping Activity by Data Source */}
            <div className="bg-card border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <h3 className="font-semibold">Shipping Activity by Data Source</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  total number of transaction in the selected period | <span className="font-semibold">{totalTransactions.toLocaleString()}</span>
                </span>
              </div>
              
              {monthlyActivity.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyActivity} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="displayMonth" 
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                        interval={monthlyActivity.length > 12 ? Math.floor(monthlyActivity.length / 12) : 0}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                        labelFormatter={(label, payload) => {
                          if (payload && payload.length > 0) {
                            return payload[0].payload.month;
                          }
                          return label;
                        }}
                        formatter={(value: number) => [`${value}건`, 'Transactions']}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary) / 0.2)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  데이터 없음
                </div>
              )}
            </div>
          </div>

          {/* Recently Traded Products */}
          <div className="bg-card border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold">Recently Traded Products</h3>
            </div>
            
            {recentProducts.length > 0 ? (
              <div className="space-y-3">
                {recentProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-6 text-sm border-b pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="w-24 shrink-0">
                      <span className="text-muted-foreground text-xs">Date | </span>
                      <span className="font-medium">{product.date}</span>
                    </div>
                    <div className="w-28 shrink-0">
                      <span className="text-muted-foreground text-xs">HS Code | </span>
                      <span className="font-medium">{product.hsCode}</span>
                    </div>
                    <div className="w-28 shrink-0">
                      <span className="text-muted-foreground text-xs">shipping method | </span>
                      <span className="font-medium">{product.shippingMethod}</span>
                    </div>
                    <div className="w-24 shrink-0">
                      <span className="text-muted-foreground text-xs">trade terms | </span>
                      <span className="font-medium">{product.tradeTerms}</span>
                    </div>
                    <div className="flex-1 truncate" title={product.productDescription}>
                      <span className="text-muted-foreground">{product.productDescription || '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                거래 내역이 없습니다
              </p>
            )}
          </div>

          {/* Company Locations */}
          <div className="bg-card border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold">Company Locations</h3>
            </div>
            
            {companyLocations.length > 0 ? (
              <div className="space-y-2">
                {companyLocations.map((location, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm"
                  >
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate" title={location}>{location}</span>
                  </div>
                ))}
                {companyLocations.length >= 5 && (
                  <button className="text-xs text-primary hover:underline mt-2">
                    View more locations...
                  </button>
                )}
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">위치 정보 없음</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CompanyDetailsDrawer;
