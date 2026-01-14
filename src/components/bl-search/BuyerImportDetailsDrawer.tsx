import React, { useMemo, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { BLRecord } from '@/data/blMockData';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BuyerImportDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  buyerName: string;
  allResults: BLRecord[];
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

const BuyerImportDetailsDrawer: React.FC<BuyerImportDetailsDrawerProps> = ({
  isOpen,
  onClose,
  buyerName,
  allResults,
  startDate,
  endDate,
}) => {
  // Filter results for this buyer from the ENTIRE dataset (not just current page)
  const buyerRecords = useMemo(() => {
    return allResults.filter(record => 
      record.importer.toLowerCase() === buyerName.toLowerCase()
    );
  }, [allResults, buyerName]);

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

  // Calculate Top 5 Trading Companies (Exporters for this buyer)
  const topExporters = useMemo(() => {
    const exporterMap = new Map<string, number>();
    
    buyerRecords.forEach(record => {
      const exporter = record.exporter;
      if (exporter && exporter !== '-') {
        exporterMap.set(exporter, (exporterMap.get(exporter) || 0) + 1);
      }
    });

    return Array.from(exporterMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [buyerRecords]);

  // Calculate monthly shipping activity with FULL month range
  const monthlyActivity = useMemo(() => {
    // First, build a map of actual transaction counts by month
    const monthMap = new Map<string, number>();
    
    buyerRecords.forEach(record => {
      const date = new Date(record.date);
      if (!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
      }
    });

    // Generate full month range between startDate and endDate
    if (!startDate || !endDate) {
      // Fallback: just use existing data if no date range
      return Array.from(monthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, count]) => ({
          month,
          displayMonth: month.split('-')[1],
          count,
        }));
    }

    const allMonths = generateMonthRange(startDate, endDate);
    
    // Map all months, filling missing ones with 0
    const chartData = allMonths.map(monthKey => ({
      month: monthKey,
      displayMonth: monthKey.split('-')[1], // Just show month number for X-axis
      count: monthMap.get(monthKey) || 0,
    }));

    // Debug logging during development
    console.log('[BuyerImportDetailsDrawer] Monthly Activity Debug:', {
      buyerName,
      dateRange: { startDate: startDate?.toISOString(), endDate: endDate?.toISOString() },
      totalMonthsInRange: allMonths.length,
      monthsWithData: monthMap.size,
      totalTransactions: buyerRecords.length,
      chartDataLength: chartData.length,
      chartData: chartData.slice(0, 5), // First 5 for debug
    });

    return chartData;
  }, [buyerRecords, startDate, endDate, buyerName]);

  // Get total transactions
  const totalTransactions = buyerRecords.length;

  // Get recently traded products (latest 10)
  const recentProducts = useMemo(() => {
    return [...buyerRecords]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map(record => ({
        date: record.date,
        hsCode: record.hsCode,
        shippingMethod: record.incoterms || '-',
        tradeTerms: record.incoterms || '-',
        productDescription: record.productName,
      }));
  }, [buyerRecords]);

  // Get company locations from addresses
  const companyLocations = useMemo(() => {
    const locationSet = new Set<string>();
    
    buyerRecords.forEach(record => {
      if (record.importerAddress && record.importerAddress !== '-') {
        locationSet.add(record.importerAddress);
      }
      if (record.destinationCountry && record.destinationCountry !== '-') {
        locationSet.add(record.destinationCountry);
      }
    });

    return Array.from(locationSet).slice(0, 5);
  }, [buyerRecords]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-full md:w-[640px] md:max-w-[55vw] xl:w-[720px] xl:max-w-[45vw] p-0 overflow-y-auto"
      >
        {/* Header */}
        <SheetHeader className="sticky top-0 bg-background z-10 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-sm font-normal text-muted-foreground">
                Buyer Company <span className="text-primary">Import</span> Details
              </SheetTitle>
              <h2 className="text-xl font-bold mt-1 text-foreground uppercase">
                {buyerName}
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
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <h3 className="font-semibold">Top 5 Trading Companies</h3>
              </div>
              
              <div className="flex gap-8">
                {/* Export Side */}
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground text-center mb-3">Export</p>
                  <div className="space-y-2">
                    {topExporters.map((exporter, index) => (
                      <div
                        key={index}
                        className="border rounded-md px-3 py-2 text-xs bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <span className="line-clamp-2">{exporter.name}</span>
                      </div>
                    ))}
                    {topExporters.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        데이터 없음
                      </p>
                    )}
                  </div>
                </div>

                {/* Arrow + Import Side */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center">
                    <div className="w-12 h-0.5 bg-primary" />
                    <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-8 border-l-primary" />
                  </div>
                  
                  <div className="flex-shrink-0 w-[180px]">
                    <p className="text-sm text-primary text-center mb-3">Import</p>
                    <div className="border-2 border-primary rounded-md px-3 py-3 text-xs bg-primary/5">
                      <span className="line-clamp-2 text-primary font-medium text-center block">
                        {buyerName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
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

export default BuyerImportDetailsDrawer;
