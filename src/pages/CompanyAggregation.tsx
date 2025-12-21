import React, { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockBLData, BLRecord } from '@/data/blMockData';
import CompanyKPICards from '@/components/company/CompanyKPICards';
import CompanyTimeChart from '@/components/company/CompanyTimeChart';
import CompanyCountrySection from '@/components/company/CompanyCountrySection';
import CompanyHSCodeChart from '@/components/company/CompanyHSCodeChart';
import CompanyPortsChart from '@/components/company/CompanyPortsChart';
import TopHeader from '@/components/layout/TopHeader';

interface SearchContext {
  companyName: string;
  companyType: 'importer' | 'exporter';
  mainKeyword: string;
  startDate: string;
  endDate: string;
  filters: Array<{ type: string; value: string }>;
}

const CompanyAggregation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Get search context from location state or URL params
  const searchContext: SearchContext = useMemo(() => {
    const state = location.state as SearchContext | null;
    if (state) return state;
    
    return {
      companyName: searchParams.get('company') || '',
      companyType: (searchParams.get('type') as 'importer' | 'exporter') || 'importer',
      mainKeyword: searchParams.get('keyword') || '',
      startDate: searchParams.get('startDate') || '',
      endDate: searchParams.get('endDate') || '',
      filters: []
    };
  }, [location.state, searchParams]);

  // Filter data for the selected company with the same search conditions
  const filteredData = useMemo(() => {
    let data = mockBLData;

    // Filter by company
    if (searchContext.companyType === 'importer') {
      data = data.filter(r => r.importer === searchContext.companyName);
    } else {
      data = data.filter(r => r.exporter === searchContext.companyName);
    }

    // Apply date range filter
    if (searchContext.startDate) {
      data = data.filter(r => r.date >= searchContext.startDate);
    }
    if (searchContext.endDate) {
      data = data.filter(r => r.date <= searchContext.endDate);
    }

    // Apply main keyword filter
    if (searchContext.mainKeyword) {
      const keyword = searchContext.mainKeyword.toLowerCase();
      data = data.filter(r => 
        r.productName.toLowerCase().includes(keyword) ||
        r.hsCode.toLowerCase().includes(keyword)
      );
    }

    // Apply additional filters
    searchContext.filters.forEach(filter => {
      const value = filter.value.toLowerCase();
      if (!value) return;
      
      switch (filter.type) {
        case 'productName':
          data = data.filter(r => r.productName.toLowerCase().includes(value));
          break;
        case 'hsCode':
          data = data.filter(r => r.hsCode.toLowerCase().includes(value));
          break;
        case 'importer':
          data = data.filter(r => r.importer.toLowerCase().includes(value));
          break;
        case 'exporter':
          data = data.filter(r => r.exporter.toLowerCase().includes(value));
          break;
      }
    });

    return data;
  }, [searchContext]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalShipments = filteredData.length;
    const totalValue = filteredData.reduce((sum, r) => sum + (r.valueUSD || 0), 0);
    
    // Parse weight values
    const totalWeight = filteredData.reduce((sum, r) => {
      if (!r.weight || r.weight === '-') return sum;
      const match = r.weight.match(/[\d,]+/);
      return sum + (match ? parseFloat(match[0].replace(/,/g, '')) : 0);
    }, 0);
    
    // Parse quantity values
    const totalQuantity = filteredData.reduce((sum, r) => {
      if (!r.quantity || r.quantity === '-') return sum;
      const match = r.quantity.match(/[\d,]+/);
      return sum + (match ? parseFloat(match[0].replace(/,/g, '')) : 0);
    }, 0);

    const avgValuePerShipment = totalShipments > 0 ? totalValue / totalShipments : 0;
    const avgPricePerKg = totalWeight > 0 ? totalValue / totalWeight : 0;

    return {
      totalShipments,
      totalValue,
      totalWeight,
      totalQuantity,
      avgValuePerShipment,
      avgPricePerKg
    };
  }, [filteredData]);

  const handleBack = () => {
    navigate('/bl-search');
  };

  const formatDateRange = () => {
    if (searchContext.startDate && searchContext.endDate) {
      return `${searchContext.startDate} ~ ${searchContext.endDate}`;
    }
    return '전체 기간';
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopHeader />
      
      <div className="flex-1 overflow-auto">
        {/* Breadcrumb & Header */}
        <div className="border-b border-border bg-card">
          <div className="px-6 py-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              className="gap-2 text-muted-foreground hover:text-foreground mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              B/L Search
            </Button>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    {searchContext.companyName || 'Unknown Company'}
                  </h1>
                  <p className="text-sm text-muted-foreground">기업 글로벌 무역</p>
                </div>
              </div>
              
              <Badge variant={searchContext.companyType === 'importer' ? 'default' : 'secondary'}>
                {searchContext.companyType === 'importer' ? '임포터' : '내보내기'}
              </Badge>
            </div>
            
            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
              <span>📅 {formatDateRange()}</span>
              <span className="text-xs">데이터 업데이트: {new Date().toLocaleString('ko-KR')}</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-6">
          {/* KPI Cards */}
          <CompanyKPICards kpis={kpis} />

          {/* Time Series Chart */}
          <CompanyTimeChart data={filteredData} />

          {/* Country Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CompanyCountrySection 
              title="상위 수출국" 
              data={filteredData} 
              type="origin" 
            />
            <CompanyCountrySection 
              title="상위 목적지 국가" 
              data={filteredData} 
              type="destination" 
            />
          </div>

          {/* HS Codes & Ports */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CompanyHSCodeChart data={filteredData} />
            <CompanyPortsChart data={filteredData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyAggregation;
