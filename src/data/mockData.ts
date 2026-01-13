// Mock Data for TaaS CRM

export type BuyerStatus = 'list' | 'lead' | 'target' | 'client';
export type ActivityType = 'pre-sales' | 'inquiry' | 'rfq' | 'quotation';

export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export interface BuyerContact {
  id: string;
  role: string;
  name: string;
  title: string;
  phone: string;
  mobile: string;
  email: string;
  twitterUrl: string;
  facebookUrl: string;
  linkedinUrl: string;
  instagramUrl: string;
}

export interface Buyer {
  id: string;
  projectId: string;
  name: string;
  country: string;
  countryCode: string;
  status: BuyerStatus;
  bookmarked: boolean;
  createdAt: string;
  websiteUrl: string;
  address: string;
  region: 'america' | 'asia' | 'africa' | 'oceania' | 'europe';
  activityCount: number;
  // Extended fields
  phone: string;
  email: string;
  revenue: string;
  revenueCurrency: string;
  mainProducts: string;
  facebookUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
  contacts: BuyerContact[];
  // Funnel dates
  listDate?: string;
  leadDate?: string;
  targetDate?: string;
  clientDate?: string;
  // B/L source metadata
  blDestinationCountry?: string;
  blOriginCountry?: string;
  blHsCode?: string;
  blProductDesc?: string;
  blRowFingerprint?: string;
}

export interface Activity {
  id: string;
  projectId: string;
  buyerId: string;
  type: ActivityType;
  title: string;
  note: string;
  createdAt: string;
  author: string;
}

export interface MoveHistoryItem {
  id: number;
  dbId?: string; // Database UUID for persistence
  projectId: string;
  category: 'funnel' | 'activity' | 'document';
  description: string;
  author: string;
  date: string;
}

export interface Document {
  id: string;
  projectId: string;
  title: string;
  attachmentName: string;
  createdAt: string;
  author: string;
}

// Mock Projects
export const mockProjects: Project[] = [
  { id: '1', name: '25년 6월 (DROP 업체 제외)', createdAt: '2025-01-01' },
  { id: '2', name: '(주)에이팜건강', createdAt: '2025-01-15' },
];

// Country data
export const countries = [
  { code: 'MY', name: '말레이시아', region: 'asia' as const },
  { code: 'SG', name: '싱가포르', region: 'asia' as const },
  { code: 'KR', name: '대한민국', region: 'asia' as const },
  { code: 'US', name: '미국', region: 'america' as const },
  { code: 'CA', name: '캐나다', region: 'america' as const },
  { code: 'VN', name: '베트남', region: 'asia' as const },
  { code: 'AE', name: '아랍에미리트', region: 'asia' as const },
  { code: 'HK', name: '홍콩', region: 'asia' as const },
  { code: 'ID', name: '인도네시아', region: 'asia' as const },
  { code: 'TH', name: '태국', region: 'asia' as const },
  { code: 'DE', name: '독일', region: 'europe' as const },
  { code: 'FR', name: '프랑스', region: 'europe' as const },
  { code: 'AU', name: '호주', region: 'oceania' as const },
  { code: 'NZ', name: '뉴질랜드', region: 'oceania' as const },
  { code: 'ZA', name: '남아프리카', region: 'africa' as const },
];

const createEmptyContact = (id: string): BuyerContact => ({
  id,
  role: '',
  name: '',
  title: '',
  phone: '',
  mobile: '',
  email: '',
  twitterUrl: '',
  facebookUrl: '',
  linkedinUrl: '',
  instagramUrl: '',
});

// Mock Buyers with extended data
export const mockBuyers: Buyer[] = [
  { 
    id: '1', projectId: '1', name: 'The Baby Store', country: '말레이시아', countryCode: 'MY', status: 'list', bookmarked: false, createdAt: '2025-12-21T15:19:00', websiteUrl: 'https://babystore.com', address: 'Kuala Lumpur, Malaysia', region: 'asia', activityCount: 5,
    phone: '+60 3 1234 5678', email: 'contact@babystore.com', revenue: '1,000M', revenueCurrency: 'USD', mainProducts: 'Baby products, toys', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-05-30'
  },
  { 
    id: '2', projectId: '1', name: '홍콩 건기식 시장조사', country: '대한민국', countryCode: 'KR', status: 'list', bookmarked: true, createdAt: '2025-12-21T16:19:00', websiteUrl: 'https://example.com', address: 'Seoul, Korea', region: 'asia', activityCount: 8,
    phone: '+82 2 1234 5678', email: 'info@example.com', revenue: '500M', revenueCurrency: 'KRW', mainProducts: '건강기능식품', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-05-25'
  },
  { 
    id: '3', projectId: '1', name: '말레이시아 건기식 시장조사', country: '대한민국', countryCode: 'KR', status: 'list', bookmarked: true, createdAt: '2025-12-21T16:19:00', websiteUrl: 'https://example.com', address: 'Seoul, Korea', region: 'asia', activityCount: 3,
    phone: '+82 2 1234 5678', email: 'info@example.com', revenue: '', revenueCurrency: 'USD', mainProducts: '', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-06-01'
  },
  { 
    id: '4', projectId: '1', name: '싱가포르 건기식 시장조사', country: '대한민국', countryCode: 'KR', status: 'list', bookmarked: true, createdAt: '2025-12-21T16:19:00', websiteUrl: 'https://example.com', address: 'Seoul, Korea', region: 'asia', activityCount: 7,
    phone: '+82 2 1234 5678', email: 'info@example.com', revenue: '', revenueCurrency: 'USD', mainProducts: '', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-05-20'
  },
  { 
    id: '5', projectId: '1', name: 'HealthPro Pte Ltd', country: '싱가포르', countryCode: 'SG', status: 'lead', bookmarked: false, createdAt: '2025-12-21T15:19:00', websiteUrl: 'https://www.healthpro.com.sg/product/shop-by-categ', address: '37 Jalan Pemimpin #06-09 MAPEX Building Singapore 577177', region: 'asia', activityCount: 4,
    phone: '+65 6353 5560', email: 'custsvc@healthpro.com.sg', revenue: '1,000M', revenueCurrency: 'USD', mainProducts: 'Healthcare products', facebookUrl: 'https://facebook.com/healthpro', linkedinUrl: 'https://linkedin.com/company/healthpro', youtubeUrl: 'https://youtube.com/healthpro',
    contacts: [
      { id: '1', role: 'admin', name: 'John Lee', title: 'Sales Manager', phone: '+65 6353 5560', mobile: '+65 9123 4567', email: 'john@healthpro.com.sg', twitterUrl: '', facebookUrl: '', linkedinUrl: '', instagramUrl: '' },
      createEmptyContact('2'),
      createEmptyContact('3')
    ],
    listDate: '2025-05-30', leadDate: '2025-07-14'
  },
  { 
    id: '6', projectId: '1', name: 'MEMOO', country: '아랍에미리트', countryCode: 'AE', status: 'lead', bookmarked: true, createdAt: '2025-12-21T11:19:00', websiteUrl: 'https://memoo.ae', address: 'Dubai, UAE', region: 'asia', activityCount: 9,
    phone: '+971 4 123 4567', email: 'info@memoo.ae', revenue: '', revenueCurrency: 'USD', mainProducts: '', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-04-15', leadDate: '2025-06-20'
  },
  { 
    id: '7', projectId: '1', name: 'Sho International', country: '미국', countryCode: 'US', status: 'lead', bookmarked: false, createdAt: '2025-12-20T23:19:00', websiteUrl: 'https://sho.com', address: 'New York, USA', region: 'america', activityCount: 15,
    phone: '+1 212 123 4567', email: 'contact@sho.com', revenue: '10,000M', revenueCurrency: 'USD', mainProducts: 'International trade', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-03-10', leadDate: '2025-05-15'
  },
  { 
    id: '8', projectId: '1', name: 'J&Y Trading LLC', country: '미국', countryCode: 'US', status: 'lead', bookmarked: false, createdAt: '2025-12-21T02:19:00', websiteUrl: 'https://jytrading.com', address: 'Los Angeles, USA', region: 'america', activityCount: 6,
    phone: '+1 310 123 4567', email: 'info@jytrading.com', revenue: '', revenueCurrency: 'USD', mainProducts: '', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-04-01', leadDate: '2025-06-10'
  },
  { 
    id: '9', projectId: '1', name: 'HST Medical', country: '싱가포르', countryCode: 'SG', status: 'target', bookmarked: false, createdAt: '2025-12-21T15:19:00', websiteUrl: 'https://hstmedical.sg', address: 'Singapore', region: 'asia', activityCount: 16,
    phone: '+65 6789 0123', email: 'contact@hstmedical.sg', revenue: '5,000M', revenueCurrency: 'USD', mainProducts: 'Medical devices', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-02-01', leadDate: '2025-04-15', targetDate: '2025-08-20'
  },
  { 
    id: '10', projectId: '1', name: 'Alpro Pharmacy', country: '말레이시아', countryCode: 'MY', status: 'target', bookmarked: false, createdAt: '2025-12-21T15:19:00', websiteUrl: 'https://alpro.my', address: 'Kuala Lumpur, Malaysia', region: 'asia', activityCount: 11,
    phone: '+60 3 9876 5432', email: 'info@alpro.my', revenue: '', revenueCurrency: 'MYR', mainProducts: 'Pharmacy products', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-03-05', leadDate: '2025-05-20', targetDate: '2025-09-01'
  },
  { 
    id: '11', projectId: '1', name: 'Hwico JSC', country: '베트남', countryCode: 'VN', status: 'target', bookmarked: false, createdAt: '2025-12-21T14:19:00', websiteUrl: 'https://hwico.vn', address: 'Ho Chi Minh, Vietnam', region: 'asia', activityCount: 16,
    phone: '+84 28 1234 5678', email: 'contact@hwico.vn', revenue: '', revenueCurrency: 'USD', mainProducts: '', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-02-15', leadDate: '2025-04-25', targetDate: '2025-07-30'
  },
  { 
    id: '12', projectId: '1', name: 'abw', country: '홍콩', countryCode: 'HK', status: 'target', bookmarked: true, createdAt: '2025-12-21T15:19:00', websiteUrl: 'https://abw.hk', address: 'Hong Kong', region: 'asia', activityCount: 10,
    phone: '+852 1234 5678', email: 'info@abw.hk', revenue: '', revenueCurrency: 'HKD', mainProducts: '', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-03-20', leadDate: '2025-05-30', targetDate: '2025-08-15'
  },
  { 
    id: '13', projectId: '1', name: 'Canada Bubble Toothpaste', country: '캐나다', countryCode: 'CA', status: 'client', bookmarked: false, createdAt: '2025-12-21T16:19:00', websiteUrl: 'https://bubbletoothpaste.ca', address: 'Toronto, Canada', region: 'america', activityCount: 19,
    phone: '+1 416 123 4567', email: 'hello@bubbletoothpaste.ca', revenue: '2,000M', revenueCurrency: 'CAD', mainProducts: 'Oral care products', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-01-10', leadDate: '2025-03-15', targetDate: '2025-06-20', clientDate: '2025-10-01'
  },
  { 
    id: '14', projectId: '1', name: 'Woori Pharmacy', country: '베트남', countryCode: 'VN', status: 'client', bookmarked: true, createdAt: '2025-12-21T14:19:00', websiteUrl: 'https://wooripharm.vn', address: 'Hanoi, Vietnam', region: 'asia', activityCount: 11,
    phone: '+84 24 1234 5678', email: 'contact@wooripharm.vn', revenue: '', revenueCurrency: 'USD', mainProducts: 'Pharmaceutical products', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-02-05', leadDate: '2025-04-10', targetDate: '2025-07-15', clientDate: '2025-11-01'
  },
  { 
    id: '15', projectId: '1', name: 'K-tamin', country: '미국', countryCode: 'US', status: 'client', bookmarked: true, createdAt: '2025-12-21T02:19:00', websiteUrl: 'https://ktamin.com', address: 'Seattle, USA', region: 'america', activityCount: 36,
    phone: '+1 206 123 4567', email: 'info@ktamin.com', revenue: '5,000M', revenueCurrency: 'USD', mainProducts: 'Vitamins, supplements', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-01-05', leadDate: '2025-02-20', targetDate: '2025-05-10', clientDate: '2025-09-15'
  },
  { 
    id: '16', projectId: '1', name: 'Ellielove Mom', country: '미국', countryCode: 'US', status: 'client', bookmarked: true, createdAt: '2025-12-20T23:19:00', websiteUrl: 'https://ellielovemom.com', address: 'Miami, USA', region: 'america', activityCount: 25,
    phone: '+1 305 123 4567', email: 'hello@ellielovemom.com', revenue: '3,000M', revenueCurrency: 'USD', mainProducts: 'Mother and baby products', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-01-15', leadDate: '2025-03-20', targetDate: '2025-06-25', clientDate: '2025-10-10'
  },
  { 
    id: '17', projectId: '1', name: 'OPC Pharmaceutical JSC', country: '베트남', countryCode: 'VN', status: 'target', bookmarked: false, createdAt: '2025-12-21T12:00:00', websiteUrl: 'https://opc.vn', address: 'Ho Chi Minh, Vietnam', region: 'asia', activityCount: 14,
    phone: '+84 28 9876 5432', email: 'info@opc.vn', revenue: '', revenueCurrency: 'USD', mainProducts: '', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-04-01', leadDate: '2025-06-15', targetDate: '2025-09-20'
  },
  { 
    id: '18', projectId: '1', name: 'Haldane', country: '싱가포르', countryCode: 'SG', status: 'target', bookmarked: false, createdAt: '2025-12-21T10:00:00', websiteUrl: 'https://haldane.sg', address: 'Singapore', region: 'asia', activityCount: 14,
    phone: '+65 6543 2109', email: 'contact@haldane.sg', revenue: '', revenueCurrency: 'SGD', mainProducts: '', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-03-25', leadDate: '2025-05-30', targetDate: '2025-08-25'
  },
  { 
    id: '19', projectId: '1', name: 'All About Goodness', country: '호주', countryCode: 'AU', status: 'target', bookmarked: false, createdAt: '2025-12-21T09:00:00', websiteUrl: 'https://allaboutgoodness.au', address: 'Sydney, Australia', region: 'oceania', activityCount: 12,
    phone: '+61 2 1234 5678', email: 'hello@allaboutgoodness.au', revenue: '', revenueCurrency: 'AUD', mainProducts: 'Health foods', facebookUrl: '', linkedinUrl: '', youtubeUrl: '',
    contacts: [createEmptyContact('1'), createEmptyContact('2'), createEmptyContact('3')],
    listDate: '2025-04-10', leadDate: '2025-06-25', targetDate: '2025-09-30'
  },
];

// Mock Activities with extended data
export const mockActivities: Activity[] = [
  { id: '1', projectId: '1', buyerId: '5', type: 'pre-sales', title: '1. ★ 바이어 개요', note: 'Initial buyer overview and research', createdAt: '2025-05-29', author: '이수민' },
  { id: '2', projectId: '1', buyerId: '5', type: 'pre-sales', title: '2. 콜드콜 진행 / customer service에 이메일 보내라는 요청 받음', note: 'Cold call made, received request to email customer service', createdAt: '2025-05-30', author: '이수민' },
  { id: '3', projectId: '1', buyerId: '5', type: 'pre-sales', title: '3. HY] CS팀 여직원과 통화', note: 'Phone call with HY CS team staff', createdAt: '2025-07-02', author: '이수민' },
  { id: '4', projectId: '1', buyerId: '5', type: 'pre-sales', title: '4. HY] 담당자 이름 확보', note: 'Obtained contact person name', createdAt: '2025-07-14', author: '이수민' },
  { id: '5', projectId: '1', buyerId: '15', type: 'pre-sales', title: '초기 연락', note: 'Initial contact made', createdAt: '2025-12-19', author: '관리자' },
  { id: '6', projectId: '1', buyerId: '15', type: 'inquiry', title: '제품 문의', note: 'Product inquiry received', createdAt: '2025-12-18', author: '이수민' },
  { id: '7', projectId: '1', buyerId: '13', type: 'quotation', title: '견적서 발송', note: 'Quotation sent', createdAt: '2025-12-17', author: '관리자' },
  { id: '8', projectId: '1', buyerId: '16', type: 'pre-sales', title: '슈퍼베어, 포비타, 징크스펜스, 락토프리미엄 1개씩 샘플 요청', note: '', createdAt: '2025-12-19', author: '관리자' },
  { id: '9', projectId: '1', buyerId: '16', type: 'rfq', title: '견적서 발송 / 입금 확인', note: '', createdAt: '2025-12-19', author: '관리자' },
];

// Mock Move History
export const mockMoveHistory: MoveHistoryItem[] = [
  { id: 1218, projectId: '1', category: 'activity', description: 'Ellielove Mom 바이어 기업의 영업활동일지 등록 : 송장 번호 공유', author: '관리자', date: '2025.12.19' },
  { id: 1217, projectId: '1', category: 'activity', description: 'Ellielove Mom 바이어 기업의 영업활동일지 수정 : 견적서 발송 / 입금 확인', author: '관리자', date: '2025.12.19' },
  { id: 1216, projectId: '1', category: 'activity', description: 'Ellielove Mom 바이어 기업의 영업활동일지 등록 : 세금 계산서 / 송장 / 사업자 등록증 확인', author: '관리자', date: '2025.12.19' },
  { id: 1215, projectId: '1', category: 'activity', description: 'Ellielove Mom 바이어 기업의 영업활동일지 등록 : 견적서 발송 / 입금 확인', author: '관리자', date: '2025.12.19' },
  { id: 1214, projectId: '1', category: 'activity', description: 'Ellielove Mom 바이어 기업의 영업활동일지 등록 : 슈퍼베어, 포비타, 징크스펜스, 락토프리미엄 1개씩 샘플 요청', author: '관리자', date: '2025.12.19' },
  { id: 1213, projectId: '1', category: 'funnel', description: 'Ellielove Mom 바이어 기업의 인사이트 등급 변경: level3 Target → level4 Client', author: '관리자', date: '2025.12.19' },
  { id: 1212, projectId: '1', category: 'activity', description: 'Woori Pharmacy 바이어 기업의 영업활동일지 등록 : 유선상 피드백 요청', author: '이수민', date: '2025.10.10' },
  { id: 1211, projectId: '1', category: 'activity', description: 'Woori Pharmacy 바이어 기업의 영업활동일지 등록 : 추석명절 인사 전달드리며 대화개시', author: '이수민', date: '2025.10.10' },
  { id: 1210, projectId: '1', category: 'activity', description: 'Ellielove Mom 바이어 기업의 영업활동일지 수정 : 9/17 이후로 카톡', author: '관리자', date: '2025.09.19' },
  { id: 1209, projectId: '1', category: 'activity', description: 'Ellielove Mom 바이어 기업의 영업활동일지 수정 : 9/17 이후로 카톡', author: '관리자', date: '2025.09.19' },
];

// Generate more move history items for pagination
for (let i = 1208; i >= 1; i--) {
  mockMoveHistory.push({
    id: i,
    projectId: '1',
    category: ['funnel', 'activity', 'document'][Math.floor(Math.random() * 3)] as 'funnel' | 'activity' | 'document',
    description: `샘플 히스토리 항목 #${i}`,
    author: ['관리자', '이수민', '김영희'][Math.floor(Math.random() * 3)],
    date: `2025.${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}.${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
  });
}

// Mock Documents
export const mockDocuments: Document[] = [];

// Monthly activity data
export const monthlyActivityData = [
  { month: '1월', buyerRegistrations: 0, activityLogs: 16 },
  { month: '2월', buyerRegistrations: 0, activityLogs: 20 },
  { month: '3월', buyerRegistrations: 69, activityLogs: 13 },
  { month: '4월', buyerRegistrations: 0, activityLogs: 16 },
  { month: '5월', buyerRegistrations: 3, activityLogs: 27 },
  { month: '6월', buyerRegistrations: 3, activityLogs: 49 },
  { month: '7월', buyerRegistrations: 2, activityLogs: 107 },
  { month: '8월', buyerRegistrations: 1, activityLogs: 31 },
  { month: '9월', buyerRegistrations: 1, activityLogs: 16 },
  { month: '10월', buyerRegistrations: 0, activityLogs: 1 },
  { month: '11월', buyerRegistrations: 0, activityLogs: 0 },
  { month: '12월', buyerRegistrations: 0, activityLogs: 4 },
];

// Behavior index data for calendar heatmap
export const behaviorIndexData: Record<number, number> = {
  4: 3, 5: 2, 11: 4, 12: 5, 13: 4, 14: 3, 15: 2, 16: 3, 20: 1, 21: 2
};

// Sales activity summary
export const salesActivitySummary = {
  total: 4,
  percentChange: 1.2,
  preSales: 338,
  inquiry: 0,
  rfq: 2,
  quotation: 0,
  barData: [25, 5, 10, 15, 20, 25],
};

// Region summary data
export const regionSummary = {
  america: { list: 10, lead: 4, target: 0, client: 3 },
  asia: { list: 38, lead: 14, target: 7, client: 1 },
  africa: { list: 1, lead: 0, target: 0, client: 0 },
  oceania: { list: 0, lead: 0, target: 0, client: 0 },
  europe: { list: 1, lead: 0, target: 0, client: 0 },
};

// Flag emoji mapping
export const getFlagEmoji = (countryCode: string): string => {
  const flags: Record<string, string> = {
    MY: '🇲🇾',
    SG: '🇸🇬',
    KR: '🇰🇷',
    US: '🇺🇸',
    CA: '🇨🇦',
    VN: '🇻🇳',
    AE: '🇦🇪',
    HK: '🇭🇰',
    ID: '🇮🇩',
    TH: '🇹🇭',
    DE: '🇩🇪',
    FR: '🇫🇷',
    AU: '🇦🇺',
    NZ: '🇳🇿',
    ZA: '🇿🇦',
  };
  return flags[countryCode] || '🏳️';
};
