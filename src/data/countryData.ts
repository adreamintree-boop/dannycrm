// Country Data Loader and Matching Utilities
// Uses Supabase country_master table as single source of truth

import { supabase } from "@/integrations/supabase/client";

// Country interface - standardized structure
export interface Country {
  code: string;        // ISO alpha-2 code (e.g., US, KR)
  code3: string;       // ISO alpha-3 code (e.g., USA, KOR)
  numericCode: string; // ISO numeric code (e.g., 840, 410)
  nameKo: string;      // Korean name (e.g., 미국)
  nameEn: string;      // English name
  searchText: string;  // Combined search text
}

// Storage for loaded countries
let countryList: Country[] = [];
let isLoaded = false;

// Load country data from Supabase
export async function loadCountryData(): Promise<Country[]> {
  if (isLoaded && countryList.length > 0) {
    return countryList;
  }

  try {
    const { data, error } = await supabase
      .from('country_master')
      .select('iso2, iso3, name_ko, name_en, search_text')
      .order('name_ko', { ascending: true });

    if (error) {
      console.error('Error fetching countries from Supabase:', error);
      // Fallback to static data if Supabase fails
      return loadStaticCountryData();
    }

    if (!data || data.length === 0) {
      console.log('No countries in database, using static data');
      return loadStaticCountryData();
    }

    countryList = data.map(row => ({
      code: row.iso2,
      code3: row.iso3 || '',
      numericCode: '',
      nameKo: row.name_ko,
      nameEn: row.name_en,
      searchText: row.search_text,
    }));

    isLoaded = true;
    console.log(`Loaded ${countryList.length} countries from Supabase`);
    
    return countryList;
  } catch (error) {
    console.error('Error loading country data:', error);
    return loadStaticCountryData();
  }
}

// Static country data as fallback (seed data)
export const STATIC_COUNTRIES: Country[] = [
  { code: 'KR', code3: 'KOR', numericCode: '410', nameKo: '대한민국', nameEn: 'South Korea', searchText: '대한민국 South Korea KR KOR 한국' },
  { code: 'US', code3: 'USA', numericCode: '840', nameKo: '미국', nameEn: 'United States', searchText: '미국 United States US USA America' },
  { code: 'CN', code3: 'CHN', numericCode: '156', nameKo: '중국', nameEn: 'China', searchText: '중국 China CN CHN 중화인민공화국' },
  { code: 'JP', code3: 'JPN', numericCode: '392', nameKo: '일본', nameEn: 'Japan', searchText: '일본 Japan JP JPN' },
  { code: 'DE', code3: 'DEU', numericCode: '276', nameKo: '독일', nameEn: 'Germany', searchText: '독일 Germany DE DEU Deutschland' },
  { code: 'GB', code3: 'GBR', numericCode: '826', nameKo: '영국', nameEn: 'United Kingdom', searchText: '영국 United Kingdom GB GBR UK England' },
  { code: 'FR', code3: 'FRA', numericCode: '250', nameKo: '프랑스', nameEn: 'France', searchText: '프랑스 France FR FRA' },
  { code: 'IT', code3: 'ITA', numericCode: '380', nameKo: '이탈리아', nameEn: 'Italy', searchText: '이탈리아 Italy IT ITA' },
  { code: 'CA', code3: 'CAN', numericCode: '124', nameKo: '캐나다', nameEn: 'Canada', searchText: '캐나다 Canada CA CAN' },
  { code: 'AU', code3: 'AUS', numericCode: '036', nameKo: '호주', nameEn: 'Australia', searchText: '호주 Australia AU AUS 오스트레일리아' },
  { code: 'NZ', code3: 'NZL', numericCode: '554', nameKo: '뉴질랜드', nameEn: 'New Zealand', searchText: '뉴질랜드 New Zealand NZ NZL' },
  { code: 'SG', code3: 'SGP', numericCode: '702', nameKo: '싱가포르', nameEn: 'Singapore', searchText: '싱가포르 Singapore SG SGP' },
  { code: 'MY', code3: 'MYS', numericCode: '458', nameKo: '말레이시아', nameEn: 'Malaysia', searchText: '말레이시아 Malaysia MY MYS' },
  { code: 'ID', code3: 'IDN', numericCode: '360', nameKo: '인도네시아', nameEn: 'Indonesia', searchText: '인도네시아 Indonesia ID IDN' },
  { code: 'VN', code3: 'VNM', numericCode: '704', nameKo: '베트남', nameEn: 'Vietnam', searchText: '베트남 Vietnam VN VNM' },
  { code: 'TH', code3: 'THA', numericCode: '764', nameKo: '태국', nameEn: 'Thailand', searchText: '태국 Thailand TH THA 타이' },
  { code: 'PH', code3: 'PHL', numericCode: '608', nameKo: '필리핀', nameEn: 'Philippines', searchText: '필리핀 Philippines PH PHL' },
  { code: 'IN', code3: 'IND', numericCode: '356', nameKo: '인도', nameEn: 'India', searchText: '인도 India IN IND' },
  { code: 'RU', code3: 'RUS', numericCode: '643', nameKo: '러시아', nameEn: 'Russia', searchText: '러시아 Russia RU RUS' },
  { code: 'BR', code3: 'BRA', numericCode: '076', nameKo: '브라질', nameEn: 'Brazil', searchText: '브라질 Brazil BR BRA' },
  { code: 'MX', code3: 'MEX', numericCode: '484', nameKo: '멕시코', nameEn: 'Mexico', searchText: '멕시코 Mexico MX MEX' },
  { code: 'AR', code3: 'ARG', numericCode: '032', nameKo: '아르헨티나', nameEn: 'Argentina', searchText: '아르헨티나 Argentina AR ARG' },
  { code: 'ZA', code3: 'ZAF', numericCode: '710', nameKo: '남아프리카공화국', nameEn: 'South Africa', searchText: '남아프리카공화국 South Africa ZA ZAF 남아공' },
  { code: 'EG', code3: 'EGY', numericCode: '818', nameKo: '이집트', nameEn: 'Egypt', searchText: '이집트 Egypt EG EGY' },
  { code: 'NL', code3: 'NLD', numericCode: '528', nameKo: '네덜란드', nameEn: 'Netherlands', searchText: '네덜란드 Netherlands NL NLD Holland' },
  { code: 'BE', code3: 'BEL', numericCode: '056', nameKo: '벨기에', nameEn: 'Belgium', searchText: '벨기에 Belgium BE BEL' },
  { code: 'CH', code3: 'CHE', numericCode: '756', nameKo: '스위스', nameEn: 'Switzerland', searchText: '스위스 Switzerland CH CHE' },
  { code: 'SE', code3: 'SWE', numericCode: '752', nameKo: '스웨덴', nameEn: 'Sweden', searchText: '스웨덴 Sweden SE SWE' },
  { code: 'NO', code3: 'NOR', numericCode: '578', nameKo: '노르웨이', nameEn: 'Norway', searchText: '노르웨이 Norway NO NOR' },
  { code: 'DK', code3: 'DNK', numericCode: '208', nameKo: '덴마크', nameEn: 'Denmark', searchText: '덴마크 Denmark DK DNK' },
  { code: 'FI', code3: 'FIN', numericCode: '246', nameKo: '핀란드', nameEn: 'Finland', searchText: '핀란드 Finland FI FIN' },
  { code: 'PL', code3: 'POL', numericCode: '616', nameKo: '폴란드', nameEn: 'Poland', searchText: '폴란드 Poland PL POL' },
  { code: 'AT', code3: 'AUT', numericCode: '040', nameKo: '오스트리아', nameEn: 'Austria', searchText: '오스트리아 Austria AT AUT' },
  { code: 'GR', code3: 'GRC', numericCode: '300', nameKo: '그리스', nameEn: 'Greece', searchText: '그리스 Greece GR GRC' },
  { code: 'TR', code3: 'TUR', numericCode: '792', nameKo: '터키', nameEn: 'Turkey', searchText: '터키 Turkey TR TUR Türkiye' },
  { code: 'AE', code3: 'ARE', numericCode: '784', nameKo: '아랍에미리트', nameEn: 'United Arab Emirates', searchText: '아랍에미리트 United Arab Emirates AE ARE UAE Dubai 두바이' },
  { code: 'SA', code3: 'SAU', numericCode: '682', nameKo: '사우디아라비아', nameEn: 'Saudi Arabia', searchText: '사우디아라비아 Saudi Arabia SA SAU 사우디' },
  { code: 'IL', code3: 'ISR', numericCode: '376', nameKo: '이스라엘', nameEn: 'Israel', searchText: '이스라엘 Israel IL ISR' },
  { code: 'HK', code3: 'HKG', numericCode: '344', nameKo: '홍콩', nameEn: 'Hong Kong', searchText: '홍콩 Hong Kong HK HKG' },
  { code: 'TW', code3: 'TWN', numericCode: '158', nameKo: '대만', nameEn: 'Taiwan', searchText: '대만 Taiwan TW TWN 타이완 중화민국' },
  { code: 'ES', code3: 'ESP', numericCode: '724', nameKo: '스페인', nameEn: 'Spain', searchText: '스페인 Spain ES ESP España' },
  { code: 'PT', code3: 'PRT', numericCode: '620', nameKo: '포르투갈', nameEn: 'Portugal', searchText: '포르투갈 Portugal PT PRT' },
  { code: 'IE', code3: 'IRL', numericCode: '372', nameKo: '아일랜드', nameEn: 'Ireland', searchText: '아일랜드 Ireland IE IRL Eire' },
  { code: 'CZ', code3: 'CZE', numericCode: '203', nameKo: '체코', nameEn: 'Czech Republic', searchText: '체코 Czech Republic CZ CZE Czechia' },
  { code: 'HU', code3: 'HUN', numericCode: '348', nameKo: '헝가리', nameEn: 'Hungary', searchText: '헝가리 Hungary HU HUN' },
  { code: 'RO', code3: 'ROU', numericCode: '642', nameKo: '루마니아', nameEn: 'Romania', searchText: '루마니아 Romania RO ROU' },
  { code: 'UA', code3: 'UKR', numericCode: '804', nameKo: '우크라이나', nameEn: 'Ukraine', searchText: '우크라이나 Ukraine UA UKR' },
  { code: 'CL', code3: 'CHL', numericCode: '152', nameKo: '칠레', nameEn: 'Chile', searchText: '칠레 Chile CL CHL' },
  { code: 'CO', code3: 'COL', numericCode: '170', nameKo: '콜롬비아', nameEn: 'Colombia', searchText: '콜롬비아 Colombia CO COL' },
  { code: 'PE', code3: 'PER', numericCode: '604', nameKo: '페루', nameEn: 'Peru', searchText: '페루 Peru PE PER' },
];

// Load static country data as fallback
function loadStaticCountryData(): Country[] {
  countryList = [...STATIC_COUNTRIES];
  isLoaded = true;
  console.log(`Loaded ${countryList.length} countries from static data`);
  return countryList;
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

  // 4. Search in searchText field
  const bySearchText = countryList.find(c => 
    c.searchText.toLowerCase().includes(normalizedSearch)
  );
  if (bySearchText) return bySearchText;

  // 5. Case-insensitive partial match on Korean name
  const byPartialKo = countryList.find(c => 
    normalizeString(c.nameKo).includes(normalizedSearch) ||
    normalizedSearch.includes(normalizeString(c.nameKo))
  );
  if (byPartialKo) return byPartialKo;

  // 6. Case-insensitive partial match on English name
  const byPartialEn = countryList.find(c => 
    normalizeString(c.nameEn).includes(normalizedSearch) ||
    normalizedSearch.includes(normalizeString(c.nameEn))
  );
  if (byPartialEn) return byPartialEn;

  // 7. Common pattern matching
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

// Seed country data to Supabase (call once to populate database)
export async function seedCountryData(): Promise<boolean> {
  try {
    // Check if data already exists
    const { count } = await supabase
      .from('country_master')
      .select('*', { count: 'exact', head: true });
    
    if (count && count > 0) {
      console.log('Country data already exists in database');
      return true;
    }

    // Insert static countries
    const insertData = STATIC_COUNTRIES.map(c => ({
      iso2: c.code,
      iso3: c.code3,
      name_ko: c.nameKo,
      name_en: c.nameEn,
      search_text: c.searchText,
    }));

    const { error } = await supabase
      .from('country_master')
      .upsert(insertData, { onConflict: 'iso2' });

    if (error) {
      console.error('Error seeding country data:', error);
      return false;
    }

    console.log(`Seeded ${insertData.length} countries to database`);
    return true;
  } catch (error) {
    console.error('Error seeding country data:', error);
    return false;
  }
}
