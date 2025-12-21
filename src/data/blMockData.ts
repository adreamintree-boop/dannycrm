// B/L Mock Data - Easy to replace with CSV/JSON/DB later
// This file contains sample B/L records for testing the search functionality

export interface BLRecord {
  id: string;
  date: string;
  importer: string;
  exporter: string;
  hsCode: string;
  productName: string;
  quantity: string;
  weight: string;
  valueUSD: number;
  originCountry: string;
  destinationCountry: string;
}

// Mock dataset - can be replaced with CSV import, JSON fetch, or DB query
export const mockBLData: BLRecord[] = [
  {
    id: "1",
    date: "2025-12-18",
    importer: "OTOKI AMERICA INC",
    exporter: "OTOKI CORPORATION",
    hsCode: "071234",
    productName: "INSTANT RAMEN NOODLE SOUP MIX",
    quantity: "5,219 CARTON",
    weight: "8,900 KG",
    valueUSD: 19734.91,
    originCountry: "South Korea",
    destinationCountry: "United States"
  },
  {
    id: "2",
    date: "2025-12-18",
    importer: "OTOKI AMERICA INC",
    exporter: "OTOKI CORPORATION",
    hsCode: "071234",
    productName: "INSTANT RAMEN PREMIUM PACK",
    quantity: "2,457 CARTON",
    weight: "10,073 KG",
    valueUSD: 22335.93,
    originCountry: "South Korea",
    destinationCountry: "United States"
  },
  {
    id: "3",
    date: "2025-12-18",
    importer: "OTOKI AMERICA INC",
    exporter: "OTOKI CORPORATION",
    hsCode: "071234",
    productName: "INSTANT RAMEN SPICY EDITION",
    quantity: "4,811 CARTON",
    weight: "10,235 KG",
    valueUSD: 30651.51,
    originCountry: "South Korea",
    destinationCountry: "United States"
  },
  {
    id: "4",
    date: "2025-12-18",
    importer: "BINEX LINE CORP LA 19515 19515",
    exporter: "SEAMAX EXPRESS CO LTD ROOM 807 R",
    hsCode: "841590",
    productName: "SHIPPER S LOAD, COUNT SEA L SAID TO CONTAIN X, CARTONS INSTANT RAMEN MIX",
    quantity: "-",
    weight: "-",
    valueUSD: 22335.93,
    originCountry: "South Korea",
    destinationCountry: "United States"
  },
  {
    id: "5",
    date: "2025-12-18",
    importer: "BINEX LINE CORPORATION",
    exporter: "SEAMAX EXPRESS COMPANY LIMITED",
    hsCode: "071234",
    productName: "INSTANT RAMEN BULK SHIPMENT",
    quantity: "-",
    weight: "-",
    valueUSD: 30651.51,
    originCountry: "South Korea",
    destinationCountry: "United States"
  },
  {
    id: "6",
    date: "2025-12-18",
    importer: "OTOKI AMERICA INC",
    exporter: "OTOKI CORPORATION",
    hsCode: "071234",
    productName: "INSTANT RAMEN FAMILY PACK",
    quantity: "5,226 CARTON",
    weight: "8,931 KG",
    valueUSD: 19803.65,
    originCountry: "South Korea",
    destinationCountry: "United States"
  },
  {
    id: "7",
    date: "2025-12-18",
    importer: "BINEX LINE CORP LA 19515 19515",
    exporter: "SEAMAX EXPRESS CO LTD ROOM 807 R",
    hsCode: "841590",
    productName: "SHIPPER S LOAD, COUNT SEA L SAIDTO CONTAIN X, CARTONS INSTANT RAMEN VARIETY",
    quantity: "-",
    weight: "-",
    valueUSD: 19734.91,
    originCountry: "South Korea",
    destinationCountry: "United States"
  },
  {
    id: "8",
    date: "2025-12-18",
    importer: "BINEX LINE CORP LA 19515 19515",
    exporter: "SEAMAX EXPRESS CO LTD ROOM 807 R",
    hsCode: "841590",
    productName: "SHIPPER S LOAD, COUNT SEA L SAID TO CONTAIN X, CARTONS INSTANT RAMEN DELUXE",
    quantity: "-",
    weight: "-",
    valueUSD: 19803.65,
    originCountry: "South Korea",
    destinationCountry: "United States"
  },
  {
    id: "9",
    date: "2025-12-17",
    importer: "BINEX LINE CORPORATION",
    exporter: "SEAMAX EXPRESS COMPANY LIMITED",
    hsCode: "071234",
    productName: "INSTANT RAMEN KOREAN STYLE",
    quantity: "-",
    weight: "-",
    valueUSD: 28029.1,
    originCountry: "South Korea",
    destinationCountry: "United States"
  },
  {
    id: "10",
    date: "2025-12-15",
    importer: "MEGAZONE SA DE CV",
    exporter: "CONVERGENCE CO LTD",
    hsCode: "2104100100",
    productName: "INSTANT NOODLE MILD FLAVOR",
    quantity: "3,500 CARTON",
    weight: "7,200 KG",
    valueUSD: 15420.00,
    originCountry: "South Korea",
    destinationCountry: "Mexico"
  },
  {
    id: "11",
    date: "2025-12-15",
    importer: "BINEX LINE CORP LA",
    exporter: "J B LINERS CO LTD",
    hsCode: "300600",
    productName: "INSTANT NOODLE SAMYANG PREMIUM",
    quantity: "2,800 CARTON",
    weight: "5,600 KG",
    valueUSD: 12350.00,
    originCountry: "South Korea",
    destinationCountry: "United States"
  },
  {
    id: "12",
    date: "2025-12-15",
    importer: "SAMYANG AMERICA INC",
    exporter: "SAMYANG FOODS CO LTD",
    hsCode: "190230",
    productName: "PASTA PREPARED NESOI SPICY NOODLES",
    quantity: "8,000 CARTON",
    weight: "16,000 KG",
    valueUSD: 45000.00,
    originCountry: "South Korea",
    destinationCountry: "United States"
  },
  {
    id: "13",
    date: "2025-12-15",
    importer: "CÔNG TY TNHH GSF VI...",
    exporter: "BUMIL INDUSTRIAL CO...",
    hsCode: "85169090",
    productName: "PARTS OF FCH-D220 N...",
    quantity: "150 PCS",
    weight: "450 KG",
    valueUSD: 8500.00,
    originCountry: "South Korea",
    destinationCountry: "Vietnam"
  },
  {
    id: "14",
    date: "2025-12-04",
    importer: "EXCELL BATTERY COMP...",
    exporter: "HITECHONE CO LTD",
    hsCode: "850760",
    productName: "LITHIUM ION ACCUMULATOR BATTERY",
    quantity: "5,000 PCS",
    weight: "2,500 KG",
    valueUSD: 125000.00,
    originCountry: "South Korea",
    destinationCountry: "United States"
  },
  {
    id: "15",
    date: "2025-12-01",
    importer: "JJGC INDUSTRIA E COM...",
    exporter: "INSTITUT STRAUMANN",
    hsCode: "90184999",
    productName: "046.401 - RC VERSCHLU...",
    quantity: "200 PCS",
    weight: "50 KG",
    valueUSD: 35000.00,
    originCountry: "Switzerland",
    destinationCountry: "Brazil"
  },
  {
    id: "16",
    date: "2025-11-20",
    importer: "DAEDONG HI LEX OF A...",
    exporter: "DAEDONG DOOR INC",
    hsCode: "8708",
    productName: "BRKT ASSY-LIFD SIDE, L...",
    quantity: "1,000 PCS",
    weight: "800 KG",
    valueUSD: 22000.00,
    originCountry: "South Korea",
    destinationCountry: "United States"
  },
  {
    id: "17",
    date: "2025-12-10",
    importer: "ASIAN FOODS DISTRIBUTORS LLC",
    exporter: "NONGSHIM CO LTD",
    hsCode: "190230",
    productName: "INSTANT NOODLE SHIN RAMYUN",
    quantity: "10,000 CARTON",
    weight: "20,000 KG",
    valueUSD: 55000.00,
    originCountry: "South Korea",
    destinationCountry: "United States"
  },
  {
    id: "18",
    date: "2025-12-08",
    importer: "KOREA FOODS CO",
    exporter: "OTTOGI CORPORATION",
    hsCode: "190230",
    productName: "INSTANT RAMEN JIN RAMEN",
    quantity: "6,500 CARTON",
    weight: "13,000 KG",
    valueUSD: 32500.00,
    originCountry: "South Korea",
    destinationCountry: "Canada"
  },
  {
    id: "19",
    date: "2025-12-05",
    importer: "EURO ASIAN TRADING GMBH",
    exporter: "PALDO CO LTD",
    hsCode: "190230",
    productName: "INSTANT NOODLE BIBIM MEN",
    quantity: "4,200 CARTON",
    weight: "8,400 KG",
    valueUSD: 21000.00,
    originCountry: "South Korea",
    destinationCountry: "Germany"
  },
  {
    id: "20",
    date: "2025-11-28",
    importer: "PACIFIC RIM FOODS INC",
    exporter: "SAMYANG FOODS CO LTD",
    hsCode: "190230",
    productName: "BULDAK INSTANT RAMEN HOT CHICKEN",
    quantity: "15,000 CARTON",
    weight: "30,000 KG",
    valueUSD: 82500.00,
    originCountry: "South Korea",
    destinationCountry: "United States"
  },
  {
    id: "21",
    date: "2025-11-25",
    importer: "AUSSIE ASIAN IMPORTS PTY",
    exporter: "NONGSHIM CO LTD",
    hsCode: "190230",
    productName: "INSTANT RAMEN NEOGURI SEAFOOD",
    quantity: "3,800 CARTON",
    weight: "7,600 KG",
    valueUSD: 19000.00,
    originCountry: "South Korea",
    destinationCountry: "Australia"
  },
  {
    id: "22",
    date: "2025-11-22",
    importer: "TOKYO FOODS AMERICA",
    exporter: "NISSIN FOODS HOLDINGS",
    hsCode: "190230",
    productName: "CUP NOODLE ORIGINAL FLAVOR",
    quantity: "8,500 CARTON",
    weight: "8,500 KG",
    valueUSD: 42500.00,
    originCountry: "Japan",
    destinationCountry: "United States"
  },
  {
    id: "23",
    date: "2025-11-18",
    importer: "SHANGHAI IMPORT EXPORT CO",
    exporter: "MASTER KONG HOLDINGS",
    hsCode: "190230",
    productName: "INSTANT NOODLE BEEF FLAVOR",
    quantity: "20,000 CARTON",
    weight: "40,000 KG",
    valueUSD: 60000.00,
    originCountry: "China",
    destinationCountry: "China"
  },
  {
    id: "24",
    date: "2025-11-15",
    importer: "THAI UNION FROZEN PRODUCTS",
    exporter: "MAMA INSTANT NOODLES",
    hsCode: "190230",
    productName: "MAMA INSTANT NOODLE TOM YUM",
    quantity: "12,000 CARTON",
    weight: "12,000 KG",
    valueUSD: 36000.00,
    originCountry: "Thailand",
    destinationCountry: "United States"
  },
  {
    id: "25",
    date: "2025-11-10",
    importer: "INDOFOOD SUKSES MAKMUR",
    exporter: "INDOMIE MANUFACTURING",
    hsCode: "190230",
    productName: "INDOMIE MI GORENG FRIED NOODLES",
    quantity: "25,000 CARTON",
    weight: "25,000 KG",
    valueUSD: 62500.00,
    originCountry: "Indonesia",
    destinationCountry: "Nigeria"
  }
];

// Filter type for search parameters
export type FilterType = 'productName' | 'hsCode' | 'importer' | 'exporter';

export interface SearchFilter {
  id: string;
  type: FilterType;
  value: string;
}

// Search category type (matches the UI tabs)
export type SearchCategoryType = 'product' | 'hscode' | 'importer' | 'exporter' | 'bl';

// Field-specific search function - matches keyword ONLY to the selected category field
export function searchBLDataByCategory(
  keyword: string, 
  category: SearchCategoryType, 
  additionalFilters: SearchFilter[] = []
): BLRecord[] {
  const searchValue = keyword.toLowerCase().trim();
  
  // If no keyword and no additional filters, return empty
  if (!searchValue && additionalFilters.every(f => !f.value.trim())) {
    return [];
  }

  return mockBLData.filter(record => {
    // First, apply the main keyword search based on category
    if (searchValue) {
      let categoryMatch = false;
      
      switch (category) {
        case 'product':
          // Search ONLY in product description
          categoryMatch = record.productName.toLowerCase().includes(searchValue);
          break;
        case 'hscode':
          // Search ONLY in HS code (partial match allowed)
          categoryMatch = record.hsCode.toLowerCase().includes(searchValue);
          break;
        case 'importer':
          // Search ONLY in importer name
          categoryMatch = record.importer.toLowerCase().includes(searchValue);
          break;
        case 'exporter':
          // Search ONLY in exporter name
          categoryMatch = record.exporter.toLowerCase().includes(searchValue);
          break;
        case 'bl':
          // B/L category: search across all main fields (legacy behavior)
          categoryMatch = 
            record.productName.toLowerCase().includes(searchValue) ||
            record.hsCode.toLowerCase().includes(searchValue) ||
            record.importer.toLowerCase().includes(searchValue) ||
            record.exporter.toLowerCase().includes(searchValue);
          break;
        default:
          categoryMatch = true;
      }
      
      // If the main keyword doesn't match the category field, exclude this record
      if (!categoryMatch) {
        return false;
      }
    }
    
    // Then, apply additional filters from the filter panel (AND logic)
    return additionalFilters.every(filter => {
      const filterValue = filter.value.toLowerCase().trim();
      if (!filterValue) return true; // Empty filter is ignored

      switch (filter.type) {
        case 'productName':
          return record.productName.toLowerCase().includes(filterValue);
        case 'hsCode':
          return record.hsCode.toLowerCase().includes(filterValue);
        case 'importer':
          return record.importer.toLowerCase().includes(filterValue);
        case 'exporter':
          return record.exporter.toLowerCase().includes(filterValue);
        default:
          return true;
      }
    });
  });
}

// Legacy search function - kept for backward compatibility
export function searchBLData(filters: SearchFilter[]): BLRecord[] {
  // If no filters, return empty (validation should prevent this)
  if (filters.length === 0 || filters.every(f => !f.value.trim())) {
    return [];
  }

  return mockBLData.filter(record => {
    // All filters must match (AND logic)
    return filters.every(filter => {
      const searchValue = filter.value.toLowerCase().trim();
      if (!searchValue) return true; // Empty filter is ignored

      switch (filter.type) {
        case 'productName':
          return record.productName.toLowerCase().includes(searchValue);
        case 'hsCode':
          return record.hsCode.toLowerCase().includes(searchValue);
        case 'importer':
          return record.importer.toLowerCase().includes(searchValue);
        case 'exporter':
          return record.exporter.toLowerCase().includes(searchValue);
        default:
          return true;
      }
    });
  });
}

// Utility function to highlight matched text
export function highlightMatch(text: string, searchTerms: string[]): { text: string; highlighted: boolean }[] {
  if (!searchTerms.length || searchTerms.every(t => !t.trim())) {
    return [{ text, highlighted: false }];
  }

  const lowerText = text.toLowerCase();
  const segments: { text: string; highlighted: boolean }[] = [];
  let lastIndex = 0;

  // Find all matches and their positions
  const matches: { start: number; end: number }[] = [];
  
  searchTerms.forEach(term => {
    if (!term.trim()) return;
    const lowerTerm = term.toLowerCase();
    let index = lowerText.indexOf(lowerTerm);
    while (index !== -1) {
      matches.push({ start: index, end: index + term.length });
      index = lowerText.indexOf(lowerTerm, index + 1);
    }
  });

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Merge overlapping matches
  const mergedMatches: { start: number; end: number }[] = [];
  matches.forEach(match => {
    if (mergedMatches.length === 0) {
      mergedMatches.push(match);
    } else {
      const last = mergedMatches[mergedMatches.length - 1];
      if (match.start <= last.end) {
        last.end = Math.max(last.end, match.end);
      } else {
        mergedMatches.push(match);
      }
    }
  });

  // Build segments
  mergedMatches.forEach(match => {
    if (match.start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.start), highlighted: false });
    }
    segments.push({ text: text.slice(match.start, match.end), highlighted: true });
    lastIndex = match.end;
  });

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), highlighted: false });
  }

  return segments.length ? segments : [{ text, highlighted: false }];
}
