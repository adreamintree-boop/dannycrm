import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { 
  mockProjects, 
  mockBuyers, 
  mockMoveHistory, 
  mockDocuments,
  mockActivities,
  Project,
  Buyer,
  MoveHistoryItem,
  Document,
  Activity,
  BuyerStatus,
  ActivityType,
  BuyerContact
} from '@/data/mockData';

// Demo account identifier - apharm account gets seeded data
const DEMO_ACCOUNT_EMAIL = 'apharm@apharm.com';

interface AppState {
  projects: Project[];
  activeProjectId: string;
  buyers: Buyer[];
  activities: Activity[];
  moveHistory: MoveHistoryItem[];
  documents: Document[];
  activeTab: 'dashboard' | 'funnel' | 'history' | 'databoard';
}

interface AppContextType extends AppState {
  setActiveProjectId: (id: string) => void;
  setActiveTab: (tab: AppState['activeTab']) => void;
  addProject: (name: string) => void;
  deleteProject: (id: string) => void;
  updateProject: (id: string, name: string) => void;
  addBuyer: (buyer: Omit<Buyer, 'id' | 'createdAt' | 'activityCount'>) => void;
  updateBuyer: (buyerId: string, updates: Partial<Buyer>) => void;
  updateBuyerStatus: (buyerId: string, status: BuyerStatus) => void;
  toggleBookmark: (buyerId: string) => void;
  deleteBuyer: (buyerId: string) => void;
  addActivity: (activity: Omit<Activity, 'id'>) => void;
  deleteActivity: (activityId: string) => void;
  getBuyerActivities: (buyerId: string) => Activity[];
  addDocument: (doc: Omit<Document, 'id' | 'createdAt'>) => void;
  deleteDocument: (docId: string) => void;
  getProjectBuyers: () => Buyer[];
  getProjectMoveHistory: () => MoveHistoryItem[];
  getProjectDocuments: () => Document[];
  isDemoAccount: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Empty initial state for new users
const emptyProjects: Project[] = [
  { id: 'default', name: '기본 프로젝트', createdAt: new Date().toISOString() }
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile, user } = useAuthContext();
  
  // Check if this is the demo account
  const isDemoAccount = user?.email === DEMO_ACCOUNT_EMAIL;
  
  // Initialize with empty data for new users, demo data for apharm
  const [projects, setProjects] = useState<Project[]>(emptyProjects);
  const [activeProjectId, setActiveProjectId] = useState<string>('default');
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState<AppState['activeTab']>('dashboard');

  // Load demo data for apharm account, empty for others
  useEffect(() => {
    if (isDemoAccount) {
      // Demo account gets seeded data
      setProjects(mockProjects);
      setActiveProjectId(mockProjects[0]?.id || 'default');
      setBuyers(mockBuyers);
      setActivities(mockActivities);
      setMoveHistory(mockMoveHistory);
      setDocuments(mockDocuments);
    } else {
      // Regular users start with empty data
      setProjects(emptyProjects);
      setActiveProjectId('default');
      setBuyers([]);
      setActivities([]);
      setMoveHistory([]);
      setDocuments([]);
    }
  }, [isDemoAccount, user?.id]);

  const addProject = (name: string) => {
    const newProject: Project = {
      id: String(Date.now()),
      name,
      createdAt: new Date().toISOString(),
    };
    setProjects([...projects, newProject]);
    setActiveProjectId(newProject.id);
  };

  const deleteProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
    if (activeProjectId === id && projects.length > 1) {
      const remaining = projects.filter(p => p.id !== id);
      setActiveProjectId(remaining[0]?.id || '');
    }
  };

  const updateProject = (id: string, name: string) => {
    setProjects(projects.map(p => p.id === id ? { ...p, name } : p));
  };

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

  const addBuyer = (buyerData: Omit<Buyer, 'id' | 'createdAt' | 'activityCount'>) => {
    const newBuyer: Buyer = {
      ...buyerData,
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      activityCount: 0,
    };
    setBuyers([newBuyer, ...buyers]);
    
    // Add to move history
    const newHistoryItem: MoveHistoryItem = {
      id: moveHistory.length > 0 ? Math.max(...moveHistory.map(h => h.id)) + 1 : 1,
      projectId: buyerData.projectId,
      category: 'funnel',
      description: `${newBuyer.name} 바이어 기업 등록`,
      author: profile?.full_name || '관리자',
      date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', ''),
    };
    setMoveHistory([newHistoryItem, ...moveHistory]);
  };

  const updateBuyer = (buyerId: string, updates: Partial<Buyer>) => {
    setBuyers(buyers.map(b => b.id === buyerId ? { ...b, ...updates } : b));
  };

  const updateBuyerStatus = (buyerId: string, status: BuyerStatus) => {
    const buyer = buyers.find(b => b.id === buyerId);
    if (buyer && buyer.status !== status) {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
      const statusDateField = `${status}Date` as keyof Buyer;
      
      setBuyers(buyers.map(b => b.id === buyerId ? { 
        ...b, 
        status,
        [statusDateField]: today.slice(2) // Format: 25.12.21
      } : b));
      
      const statusNames: Record<BuyerStatus, string> = {
        list: 'level1 List',
        lead: 'level2 Lead',
        target: 'level3 Target',
        client: 'level4 Client',
      };
      
      const newHistoryItem: MoveHistoryItem = {
        id: moveHistory.length > 0 ? Math.max(...moveHistory.map(h => h.id)) + 1 : 1,
        projectId: buyer.projectId,
        category: 'funnel',
        description: `${buyer.name} 바이어 기업의 인사이트 등급 변경: ${statusNames[buyer.status]} → ${statusNames[status]}`,
        author: profile?.full_name || '관리자',
        date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', ''),
      };
      setMoveHistory([newHistoryItem, ...moveHistory]);
    }
  };

  const toggleBookmark = (buyerId: string) => {
    setBuyers(buyers.map(b => b.id === buyerId ? { ...b, bookmarked: !b.bookmarked } : b));
  };

  const deleteBuyer = (buyerId: string) => {
    setBuyers(buyers.filter(b => b.id !== buyerId));
  };

  const addActivity = (activityData: Omit<Activity, 'id'>) => {
    const newActivity: Activity = {
      ...activityData,
      id: String(Date.now()),
    };
    setActivities([newActivity, ...activities]);
    
    // Update buyer activity count
    setBuyers(buyers.map(b => 
      b.id === activityData.buyerId 
        ? { ...b, activityCount: b.activityCount + 1 }
        : b
    ));

    // Add to move history
    const buyer = buyers.find(b => b.id === activityData.buyerId);
    if (buyer) {
      const newHistoryItem: MoveHistoryItem = {
        id: moveHistory.length > 0 ? Math.max(...moveHistory.map(h => h.id)) + 1 : 1,
        projectId: activityData.projectId,
        category: 'activity',
        description: `${buyer.name} 바이어 기업의 영업활동일지 등록 : ${activityData.title}`,
        author: activityData.author,
        date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', ''),
      };
      setMoveHistory([newHistoryItem, ...moveHistory]);
    }
  };

  const deleteActivity = (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    if (activity) {
      setActivities(activities.filter(a => a.id !== activityId));
      // Update buyer activity count
      setBuyers(buyers.map(b => 
        b.id === activity.buyerId 
          ? { ...b, activityCount: Math.max(0, b.activityCount - 1) }
          : b
      ));
    }
  };

  const getBuyerActivities = (buyerId: string) => 
    activities.filter(a => a.buyerId === buyerId).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const addDocument = (docData: Omit<Document, 'id' | 'createdAt'>) => {
    const newDoc: Document = {
      ...docData,
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
    };
    setDocuments([newDoc, ...documents]);
  };

  const deleteDocument = (docId: string) => {
    setDocuments(documents.filter(d => d.id !== docId));
  };

  const getProjectBuyers = () => buyers.filter(b => b.projectId === activeProjectId);
  const getProjectMoveHistory = () => moveHistory.filter(h => h.projectId === activeProjectId);
  const getProjectDocuments = () => documents.filter(d => d.projectId === activeProjectId);

  return (
    <AppContext.Provider value={{
      projects,
      activeProjectId,
      buyers,
      activities,
      moveHistory,
      documents,
      activeTab,
      setActiveProjectId,
      setActiveTab,
      addProject,
      deleteProject,
      updateProject,
      addBuyer,
      updateBuyer,
      updateBuyerStatus,
      toggleBookmark,
      deleteBuyer,
      addActivity,
      deleteActivity,
      getBuyerActivities,
      addDocument,
      deleteDocument,
      getProjectBuyers,
      getProjectMoveHistory,
      getProjectDocuments,
      isDemoAccount,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
