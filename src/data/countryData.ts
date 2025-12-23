// Country Data Loader and Matching Utilities
// Uses Excel file as single source of truth for country data

import * as XLSX from 'xlsx';

// Country interface - standardized structure
export interface Country {
  code: string;        // ISO alpha-2 code (e.g., US, KR)
  code3: string;       // ISO alpha-3 code (e.g., USA, KOR)
  numericCode: string; // ISO numeric code (e.g., 840, 410)
  nameKo: string;      // Korean name (e.g., 미국)
  nameEn: string;      // English name (derived/mapped)
}

// Storage for loaded countries
let countryList: Country[] = [];
let isLoaded = false;

// Common English name mappings for countries
const englishNameMap: Record<string, string> = {
  '미국': 'United States',
  '대한민국': 'South Korea',
  '중화인민공화국': 'China',
  '중화민국 (대만)': 'Taiwan',
  '일본': 'Japan',
  '영국': 'United Kingdom',
  '독일': 'Germany',
  '프랑스': 'France',
  '이탈리아': 'Italy',
  '캐나다': 'Canada',
  '호주': 'Australia',
  '오스트레일리아 (호주)': 'Australia',
  '뉴질랜드': 'New Zealand',
  '싱가포르': 'Singapore',
  '말레이시아': 'Malaysia',
  '인도네시아': 'Indonesia',
  '베트남': 'Vietnam',
  '태국': 'Thailand',
  '필리핀': 'Philippines',
  '인도': 'India',
  '러시아': 'Russia',
  '브라질': 'Brazil',
  '멕시코': 'Mexico',
  '아르헨티나': 'Argentina',
  '남아프리카 공화국': 'South Africa',
  '이집트': 'Egypt',
  '네덜란드': 'Netherlands',
  '벨기에': 'Belgium',
  '스위스': 'Switzerland',
  '스웨덴': 'Sweden',
  '노르웨이': 'Norway',
  '덴마크': 'Denmark',
  '핀란드': 'Finland',
  '폴란드': 'Poland',
  '오스트리아': 'Austria',
  '그리스': 'Greece',
  '터키': 'Turkey',
  '아랍에미리트': 'United Arab Emirates',
  '사우디아라비아': 'Saudi Arabia',
  '이스라엘': 'Israel',
  '홍콩': 'Hong Kong',
  '마카오': 'Macau',
  '타이': 'Thailand',
  '라오스': 'Laos',
  '캄보디아': 'Cambodia',
  '미얀마': 'Myanmar',
  '방글라데시': 'Bangladesh',
  '파키스탄': 'Pakistan',
  '스리랑카': 'Sri Lanka',
  '네팔': 'Nepal',
  '몽골': 'Mongolia',
  '카자흐스탄': 'Kazakhstan',
  '우즈베키스탄': 'Uzbekistan',
  '조선민주주의인민공화국': 'North Korea',
  '칠레': 'Chile',
  '콜롬비아': 'Colombia',
  '페루': 'Peru',
  '에콰도르': 'Ecuador',
  '베네수엘라': 'Venezuela',
  '쿠바': 'Cuba',
  '푸에르토리코': 'Puerto Rico',
  '도미니카 공화국': 'Dominican Republic',
  '과테말라': 'Guatemala',
  '코스타리카': 'Costa Rica',
  '파나마': 'Panama',
  '케냐': 'Kenya',
  '나이지리아': 'Nigeria',
  '가나': 'Ghana',
  '모로코': 'Morocco',
  '튀니지': 'Tunisia',
  '알제리': 'Algeria',
  '에티오피아': 'Ethiopia',
  '탄자니아': 'Tanzania',
  '우간다': 'Uganda',
  '아일랜드': 'Ireland',
  '포르투갈': 'Portugal',
  '스페인': 'Spain',
  '체코': 'Czech Republic',
  '헝가리': 'Hungary',
  '루마니아': 'Romania',
  '불가리아': 'Bulgaria',
  '우크라이나': 'Ukraine',
  '벨라루스': 'Belarus',
  '크로아티아': 'Croatia',
  '슬로베니아': 'Slovenia',
  '슬로바키아': 'Slovakia',
  '세르비아 몬테네그로': 'Serbia and Montenegro',
  '리투아니아': 'Lithuania',
  '라트비아': 'Latvia',
  '에스토니아': 'Estonia',
  '아이슬란드': 'Iceland',
  '룩셈부르크': 'Luxembourg',
  '모나코': 'Monaco',
  '키프로스': 'Cyprus',
  '몰타': 'Malta',
  '이란': 'Iran',
  '이라크': 'Iraq',
  '시리아': 'Syria',
  '레바논': 'Lebanon',
  '요르단': 'Jordan',
  '쿠웨이트': 'Kuwait',
  '바레인': 'Bahrain',
  '카타르': 'Qatar',
  '오만': 'Oman',
  '예멘': 'Yemen',
  '아프가니스탄': 'Afghanistan',
};

// Common alternative names for fuzzy matching
const alternativeNames: Record<string, string[]> = {
  'US': ['USA', 'United States', 'United States of America', 'America', '미국', '미합중국'],
  'KR': ['South Korea', 'Korea', 'Republic of Korea', 'ROK', '한국', '대한민국', '남한'],
  'CN': ['China', 'PRC', "People's Republic of China", '중국', '중화인민공화국'],
  'JP': ['Japan', '일본'],
  'GB': ['UK', 'United Kingdom', 'Great Britain', 'England', '영국', '잉글랜드'],
  'DE': ['Germany', 'Deutschland', '독일'],
  'FR': ['France', '프랑스'],
  'VN': ['Vietnam', 'Viet Nam', '베트남'],
  'TH': ['Thailand', 'Siam', '태국', '타이'],
  'SG': ['Singapore', '싱가포르'],
  'MY': ['Malaysia', '말레이시아'],
  'ID': ['Indonesia', '인도네시아'],
  'PH': ['Philippines', '필리핀'],
  'IN': ['India', '인도'],
  'AU': ['Australia', 'Oz', '호주', '오스트레일리아'],
  'NZ': ['New Zealand', '뉴질랜드'],
  'CA': ['Canada', '캐나다'],
  'MX': ['Mexico', '멕시코'],
  'BR': ['Brazil', '브라질'],
  'AE': ['UAE', 'United Arab Emirates', '아랍에미리트', 'Dubai', '두바이'],
  'SA': ['Saudi Arabia', 'KSA', '사우디아라비아', '사우디'],
  'HK': ['Hong Kong', '홍콩'],
  'TW': ['Taiwan', 'Republic of China', 'ROC', '대만', '타이완', '중화민국'],
  'RU': ['Russia', 'Russian Federation', '러시아'],
  'NL': ['Netherlands', 'Holland', '네덜란드', '홀란드'],
  'BE': ['Belgium', '벨기에'],
  'CH': ['Switzerland', '스위스'],
  'SE': ['Sweden', '스웨덴'],
  'NO': ['Norway', '노르웨이'],
  'DK': ['Denmark', '덴마크'],
  'FI': ['Finland', '핀란드'],
  'PL': ['Poland', '폴란드'],
  'AT': ['Austria', '오스트리아'],
  'GR': ['Greece', 'Hellas', '그리스'],
  'TR': ['Turkey', 'Türkiye', '터키'],
  'IT': ['Italy', '이탈리아'],
  'ES': ['Spain', 'España', '스페인'],
  'PT': ['Portugal', '포르투갈'],
  'IE': ['Ireland', 'Eire', '아일랜드'],
  'ZA': ['South Africa', '남아프리카', '남아공'],
  'EG': ['Egypt', '이집트'],
  'NG': ['Nigeria', '나이지리아'],
  'KE': ['Kenya', '케냐'],
  'CL': ['Chile', '칠레'],
  'AR': ['Argentina', '아르헨티나'],
  'CO': ['Colombia', '콜롬비아'],
  'PE': ['Peru', '페루'],
};

interface ExcelRow {
  '나라 이름'?: string;
  '숫자'?: string | number;
  'alpha-3'?: string;
  'alpha-2'?: string;
}

// Load country data from Excel file
export async function loadCountryData(): Promise<Country[]> {
  if (isLoaded && countryList.length > 0) {
    return countryList;
  }

  try {
    const response = await fetch('/data/country-list.xlsx');
    if (!response.ok) {
      throw new Error(`Failed to fetch country list: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);
    
    // Transform to Country format
    countryList = rawData
      .filter(row => row['나라 이름'] && row['alpha-3'] && row['alpha-2'])
      .map(row => {
        const nameKo = String(row['나라 이름']).trim();
        const code = String(row['alpha-3']).trim(); // alpha-2 is in the alpha-3 column based on parsed data
        const code3 = String(row['alpha-2']).trim(); // alpha-3 is in the alpha-2 column
        const numericCode = String(row['숫자'] || '').trim();
        
        return {
          code,
          code3,
          numericCode,
          nameKo,
          nameEn: englishNameMap[nameKo] || nameKo,
        };
      });

    isLoaded = true;
    console.log(`Loaded ${countryList.length} countries from Excel`);
    
    return countryList;
  } catch (error) {
    console.error('Error loading country data:', error);
    return [];
  }
}

// Get all countries (sync, requires loadCountryData to be called first)
export function getCountries(): Country[] {
  return countryList;
}

// Check if country data is loaded
export function isCountryDataLoaded(): boolean {
  return isLoaded && countryList.length > 0;
}

// Normalize string for comparison
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣]/g, '');
}

// Find country by exact or fuzzy match
export function findCountry(input: string | undefined | null): Country | null {
  if (!input || !input.trim()) {
    return null;
  }

  const searchTerm = input.trim();
  const normalizedSearch = normalizeString(searchTerm);

  // 1. Exact match on code
  const byCode = countryList.find(c => 
    c.code.toUpperCase() === searchTerm.toUpperCase() ||
    c.code3.toUpperCase() === searchTerm.toUpperCase()
  );
  if (byCode) return byCode;

  // 2. Exact match on Korean name
  const byNameKo = countryList.find(c => c.nameKo === searchTerm);
  if (byNameKo) return byNameKo;

  // 3. Exact match on English name
  const byNameEn = countryList.find(c => 
    c.nameEn.toLowerCase() === searchTerm.toLowerCase()
  );
  if (byNameEn) return byNameEn;

  // 4. Case-insensitive partial match on Korean name
  const byPartialKo = countryList.find(c => 
    normalizeString(c.nameKo).includes(normalizedSearch) ||
    normalizedSearch.includes(normalizeString(c.nameKo))
  );
  if (byPartialKo) return byPartialKo;

  // 5. Case-insensitive partial match on English name
  const byPartialEn = countryList.find(c => 
    normalizeString(c.nameEn).includes(normalizedSearch) ||
    normalizedSearch.includes(normalizeString(c.nameEn))
  );
  if (byPartialEn) return byPartialEn;

  // 6. Check alternative names
  for (const [code, alternatives] of Object.entries(alternativeNames)) {
    const matches = alternatives.some(alt => 
      normalizeString(alt) === normalizedSearch ||
      normalizeString(alt).includes(normalizedSearch) ||
      normalizedSearch.includes(normalizeString(alt))
    );
    if (matches) {
      const country = countryList.find(c => c.code === code);
      if (country) return country;
    }
  }

  // 7. Try to match by common patterns
  // Handle "UNITED STATES" → "US"
  if (/united\s*states/i.test(searchTerm)) {
    return countryList.find(c => c.code === 'US') || null;
  }
  if (/china|chinese/i.test(searchTerm) && !/taiwan/i.test(searchTerm)) {
    return countryList.find(c => c.code === 'CN') || null;
  }
  if (/korea/i.test(searchTerm) && !/north/i.test(searchTerm)) {
    return countryList.find(c => c.code === 'KR') || null;
  }
  if (/hong\s*kong/i.test(searchTerm)) {
    return countryList.find(c => c.code === 'HK') || null;
  }
  if (/taiwan/i.test(searchTerm)) {
    return countryList.find(c => c.code === 'TW') || null;
  }

  return null;
}

// Match and normalize country for CRM
export interface NormalizedCountry {
  code: string;
  nameKo: string;
  nameEn: string;
  isMatched: boolean;
  originalValue: string;
}

export function normalizeCountryValue(input: string | undefined | null): NormalizedCountry {
  const originalValue = input?.trim() || '';
  
  if (!originalValue) {
    return {
      code: '',
      nameKo: '',
      nameEn: '',
      isMatched: false,
      originalValue: '',
    };
  }

  const matched = findCountry(originalValue);
  
  if (matched) {
    return {
      code: matched.code,
      nameKo: matched.nameKo,
      nameEn: matched.nameEn,
      isMatched: true,
      originalValue,
    };
  }

  // Return unmapped state
  return {
    code: '',
    nameKo: 'Unmapped',
    nameEn: 'Unmapped',
    isMatched: false,
    originalValue,
  };
}

// Get flag emoji from country code
export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Get region from country code (simplified mapping)
export function getRegion(countryCode: string): 'asia' | 'america' | 'europe' | 'africa' | 'oceania' {
  const asiaCountries = ['KR', 'JP', 'CN', 'HK', 'TW', 'SG', 'MY', 'ID', 'TH', 'VN', 'PH', 'IN', 'BD', 'PK', 'LK', 'NP', 'MM', 'KH', 'LA', 'MN', 'KZ', 'UZ', 'AE', 'SA', 'IL', 'TR', 'IR', 'IQ', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB', 'SY', 'YE', 'AF', 'MO'];
  const americaCountries = ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'UY', 'PY', 'BO', 'CR', 'PA', 'GT', 'CU', 'DO', 'PR', 'JM', 'HT', 'HN', 'SV', 'NI', 'BZ'];
  const europeCountries = ['GB', 'DE', 'FR', 'IT', 'ES', 'PT', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'HU', 'RO', 'BG', 'GR', 'IE', 'UA', 'BY', 'RU', 'HR', 'SI', 'SK', 'LT', 'LV', 'EE', 'IS', 'LU', 'MC', 'MT', 'CY', 'RS', 'BA', 'AL', 'MK', 'ME'];
  const oceaniaCountries = ['AU', 'NZ', 'FJ', 'PG', 'WS', 'TO', 'VU', 'SB', 'PW', 'FM', 'MH', 'KI', 'NR', 'TV', 'NC', 'PF', 'GU'];
  
  if (asiaCountries.includes(countryCode)) return 'asia';
  if (americaCountries.includes(countryCode)) return 'america';
  if (europeCountries.includes(countryCode)) return 'europe';
  if (oceaniaCountries.includes(countryCode)) return 'oceania';
  return 'africa'; // Default for remaining countries
}
