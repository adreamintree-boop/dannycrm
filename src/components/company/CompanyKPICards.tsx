import React from 'react';
import { Card } from '@/components/ui/card';
import { Package, DollarSign, Scale, Boxes, TrendingUp, Calculator } from 'lucide-react';

interface KPIs {
  totalShipments: number;
  totalValue: number;
  totalWeight: number;
  totalQuantity: number;
  avgValuePerShipment: number;
  avgPricePerKg: number;
}

interface CompanyKPICardsProps {
  kpis: KPIs;
}

const CompanyKPICards: React.FC<CompanyKPICardsProps> = ({ kpis }) => {
  const formatNumber = (value: number, decimals: number = 0) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const cards = [
    {
      label: '총 발송물',
      value: formatNumber(kpis.totalShipments),
      icon: Package,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      label: '총 가치(US$)',
      value: formatNumber(kpis.totalValue, 2),
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    {
      label: '총 중량(kg)',
      value: formatNumber(kpis.totalWeight, 1),
      icon: Scale,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50'
    },
    {
      label: '총 수량',
      value: formatNumber(kpis.totalQuantity),
      icon: Boxes,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      label: '무게당 평균 가격($/kg)',
      value: formatNumber(kpis.avgPricePerKg, 2),
      icon: TrendingUp,
      color: 'text-teal-500',
      bgColor: 'bg-teal-50'
    },
    {
      label: '품목당 평균 가격($/수량)',
      value: formatNumber(kpis.avgValuePerShipment, 2),
      icon: Calculator,
      color: 'text-pink-500',
      bgColor: 'bg-pink-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="p-4 bg-card border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${card.color.replace('text-', 'bg-')}`} />
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{card.value}</p>
          </Card>
        );
      })}
    </div>
  );
};

export default CompanyKPICards;
