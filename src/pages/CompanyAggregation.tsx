import React, { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockBLData, BLRecord } from '@/data/blMockData';
import CompanyKPICards from '@/components/company/CompanyKPICards';
import CompanyTimeChart from '@/components/company/CompanyTimeChart';
import CompanyCountrySection from '@/components/company/CompanyCountrySection';
import CompanyHSCodeChart from '@/components/company/CompanyHSCodeChart';
import CompanyPortsChart from '@/components/company/CompanyPortsChart';
import CompanyRegionalBreakdown from '@/components/company/CompanyRegionalBreakdown';
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

  const filteredData = useMemo(() => {
    let data = mockBLData;

    if (searchContext.companyType === 'importer') {
      data = data.filter(r => r.importer === searchContext.companyName);
    } else {
      data = data.filter(r => r.exporter === searchContext.companyName);
    }

    if (searchContext.startDate) {
      data = data.filter(r => r.date >= searchContext.startDate);
    }
    if (searchContext.endDate) {
      data = data.filter(r => r.date <= searchContext.endDate);
    }

    if (searchContext.mainKeyword) {
      const keyword = searchContext.mainKeyword.toLowerCase();
      data = data.filter(r => 
        r.productName.toLowerCase().includes(keyword) ||
        r.hsCode.toLowerCase().includes(keyword)
      );
    }

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

  const kpis = useMemo(() => {
    const totalShipments = filteredData.length;
    const totalValue = filteredData.reduce((sum, r) => sum + (r.valueUSD || 0), 0);
    
    const totalWeight = filteredData.reduce((sum, r) => {
      if (!r.weight || r.weight === '-') return sum;
      const match = r.weight.match(/[\d,]+/);
      return sum + (match ? parseFloat(match[0].replace(/,/g, '')) : 0);
    }, 0);
    
    const totalQuantity = filteredData.reduce((sum, r) => {
      if (!r.quantity || r.quantity === '-') return sum;
      const match = r.quantity.match(/[\d,]+/);
      return sum + (match ? parseFloat(match[0].replace(/,/g, '')) : 0);
    }, 0);

    const avgValuePerShipment = totalQuantity > 0 ? totalValue / totalQuantity : 0;
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
    <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
      <TopHeader />
      
      <div className="flex-1 overflow-auto">
        {/* Compact Header */}
        <div className="bg-white border-b border-border">
          <div className="px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBack}
                  className="gap-1 text-muted-foreground hover:text-foreground h-8 px-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">B/L Search</span>
                </Button>
                
                <div className="h-5 w-px bg-border" />
                
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h1 className="text-base font-semibold text-foreground">
                    {searchContext.companyName || 'Unknown Company'}
                  </h1>
                  <Badge 
                    variant="outline" 
                    className={`text-xs h-5 ${
                      searchContext.companyType === 'importer' 
                        ? 'border-blue-300 bg-blue-50 text-blue-700' 
                        : 'border-green-300 bg-green-50 text-green-700'
                    }`}
                  >
                    {searchContext.companyType === 'importer' ? '수입자' : '수출자'}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDateRange()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  <span>{filteredData.length}건</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Data Dense Layout */}
        <div className="p-4 space-y-4">
          {/* KPI Cards Row */}
          <CompanyKPICards kpis={kpis} />

          {/* Time Series Chart */}
          <CompanyTimeChart data={filteredData} />

          {/* Geographic Analysis - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CompanyCountrySection 
              title="상위 원산지 국가" 
              data={filteredData} 
              type="origin" 
            />
            <CompanyCountrySection 
              title="상위 목적지 국가" 
              data={filteredData} 
              type="destination" 
            />
          </div>

          {/* Distribution Analysis - Three Column */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <CompanyHSCodeChart data={filteredData} />
            <CompanyPortsChart data={filteredData} />
            <CompanyRegionalBreakdown data={filteredData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyAggregation;