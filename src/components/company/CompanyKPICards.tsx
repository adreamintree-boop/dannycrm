import React from 'react';

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
      unit: '건',
      color: '#3b82f6'
    },
    {
      label: '총 가치',
      value: formatNumber(kpis.totalValue, 0),
      unit: 'US$',
      color: '#10b981'
    },
    {
      label: '총 중량',
      value: formatNumber(kpis.totalWeight, 1),
      unit: 'kg',
      color: '#f59e0b'
    },
    {
      label: '총 수량',
      value: formatNumber(kpis.totalQuantity),
      unit: '',
      color: '#8b5cf6'
    },
    {
      label: '무게당 평균 가격',
      value: formatNumber(kpis.avgPricePerKg, 2),
      unit: 'US$/kg',
      color: '#06b6d4'
    },
    {
      label: '품목당 평균 가격',
      value: formatNumber(kpis.avgValuePerShipment, 2),
      unit: 'US$/수량',
      color: '#ec4899'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, index) => (
        <div 
          key={index} 
          className="bg-white rounded border border-gray-200 p-3 relative overflow-hidden"
        >
          <div 
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{ backgroundColor: card.color }}
          />
          <div className="pl-2">
            <p className="text-[11px] text-gray-500 font-medium mb-1">{card.label}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-gray-900">{card.value}</span>
              {card.unit && (
                <span className="text-[10px] text-gray-400">{card.unit}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CompanyKPICards;