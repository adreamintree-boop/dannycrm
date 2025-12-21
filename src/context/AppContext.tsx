import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  mockProjects, 
  mockBuyers, 
  mockMoveHistory, 
  mockDocuments,
  Project,
  Buyer,
  MoveHistoryItem,
  Document,
  BuyerStatus
} from '@/data/mockData';

interface AppState {
  projects: Project[];
  activeProjectId: string;
  buyers: Buyer[];
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
  updateBuyerStatus: (buyerId: string, status: BuyerStatus) => void;
  toggleBookmark: (buyerId: string) => void;
  deleteBuyer: (buyerId: string) => void;
  addDocument: (doc: Omit<Document, 'id' | 'createdAt'>) => void;
  deleteDocument: (docId: string) => void;
  getProjectBuyers: () => Buyer[];
  getProjectMoveHistory: () => MoveHistoryItem[];
  getProjectDocuments: () => Document[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [activeProjectId, setActiveProjectId] = useState<string>(mockProjects[0]?.id || '');
  const [buyers, setBuyers] = useState<Buyer[]>(mockBuyers);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>(mockMoveHistory);
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [activeTab, setActiveTab] = useState<AppState['activeTab']>('dashboard');

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
      author: '관리자',
      date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', ''),
    };
    setMoveHistory([newHistoryItem, ...moveHistory]);
  };

  const updateBuyerStatus = (buyerId: string, status: BuyerStatus) => {
    const buyer = buyers.find(b => b.id === buyerId);
    if (buyer && buyer.status !== status) {
      setBuyers(buyers.map(b => b.id === buyerId ? { ...b, status } : b));
      
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
        author: '관리자',
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
      moveHistory,
      documents,
      activeTab,
      setActiveProjectId,
      setActiveTab,
      addProject,
      deleteProject,
      updateProject,
      addBuyer,
      updateBuyerStatus,
      toggleBookmark,
      deleteBuyer,
      addDocument,
      deleteDocument,
      getProjectBuyers,
      getProjectMoveHistory,
      getProjectDocuments,
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
