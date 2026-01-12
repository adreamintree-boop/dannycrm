import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  loading: boolean;
}

interface AppContextType extends AppState {
  setActiveProjectId: (id: string) => void;
  setActiveTab: (tab: AppState['activeTab']) => void;
  addProject: (name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  updateProject: (id: string, name: string) => Promise<void>;
  addBuyer: (buyer: Omit<Buyer, 'id' | 'createdAt' | 'activityCount'>) => Promise<void>;
  updateBuyer: (buyerId: string, updates: Partial<Buyer>) => Promise<void>;
  updateBuyerStatus: (buyerId: string, status: BuyerStatus) => Promise<void>;
  toggleBookmark: (buyerId: string) => Promise<void>;
  deleteBuyer: (buyerId: string) => Promise<void>;
  addActivity: (activity: Omit<Activity, 'id'>) => void;
  deleteActivity: (activityId: string) => void;
  getBuyerActivities: (buyerId: string) => Activity[];
  addDocument: (doc: Omit<Document, 'id' | 'createdAt'>) => void;
  deleteDocument: (docId: string) => void;
  getProjectBuyers: () => Buyer[];
  getProjectMoveHistory: () => MoveHistoryItem[];
  getProjectDocuments: () => Document[];
  isDemoAccount: boolean;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile, user } = useAuthContext();
  
  // Check if this is the demo account
  const isDemoAccount = user?.email === DEMO_ACCOUNT_EMAIL;
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState<AppState['activeTab']>('dashboard');
  const [loading, setLoading] = useState(true);

  // Fetch projects from database
  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }
    
    if (data && data.length > 0) {
      const mappedProjects: Project[] = data.map(p => ({
        id: p.id,
        name: p.project_name,
        createdAt: p.created_at,
      }));
      setProjects(mappedProjects);
      
      // Set active project to default or first project
      const defaultProject = data.find(p => p.is_default);
      setActiveProjectId(defaultProject?.id || data[0].id);
    } else {
      // Create default project for new user
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          project_name: '기본 프로젝트',
          is_default: true,
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating default project:', createError);
        return;
      }
      
      if (newProject) {
        setProjects([{
          id: newProject.id,
          name: newProject.project_name,
          createdAt: newProject.created_at,
        }]);
        setActiveProjectId(newProject.id);
      }
    }
  }, [user?.id]);

  // Fetch buyers from database
  const fetchBuyers = useCallback(async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('crm_buyers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching buyers:', error);
      return;
    }
    
    if (data) {
      const mappedBuyers: Buyer[] = data.map(b => ({
        id: b.id,
        projectId: b.project_id || '',
        name: b.company_name,
        country: b.country || '',
        countryCode: '',
        region: (b.region as Buyer['region']) || 'asia',
        status: b.stage as BuyerStatus,
        createdAt: b.created_at,
        activityCount: b.activity_count,
        bookmarked: false,
        websiteUrl: (b as any).website || '',
        address: (b as any).address || '',
        phone: (b as any).company_phone || '',
        email: (b as any).company_email || '',
        revenue: '',
        revenueCurrency: 'USD',
        mainProducts: '',
        facebookUrl: (b as any).facebook_url || '',
        linkedinUrl: (b as any).linkedin_url || '',
        youtubeUrl: (b as any).youtube_url || '',
        contacts: [],
        blDestinationCountry: (b as any).bl_destination_country || undefined,
        blOriginCountry: (b as any).bl_origin_country || undefined,
        blHsCode: (b as any).bl_hs_code || undefined,
        blProductDesc: (b as any).bl_product_desc || undefined,
        blRowFingerprint: (b as any).bl_row_fingerprint || undefined,
      }));
      setBuyers(mappedBuyers);
    }
  }, [user?.id]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchProjects(), fetchBuyers()]);
    setLoading(false);
  }, [fetchProjects, fetchBuyers]);

  // Load data on user change
  useEffect(() => {
    if (isDemoAccount) {
      // Demo account gets seeded data
      setProjects(mockProjects);
      setActiveProjectId(mockProjects[0]?.id || 'default');
      setBuyers(mockBuyers);
      setActivities(mockActivities);
      setMoveHistory(mockMoveHistory);
      setDocuments(mockDocuments);
      setLoading(false);
    } else if (user?.id) {
      // Regular users load from database
      refreshData();
    } else {
      // No user - clear data
      setProjects([]);
      setActiveProjectId('');
      setBuyers([]);
      setActivities([]);
      setMoveHistory([]);
      setDocuments([]);
      setLoading(false);
    }
  }, [isDemoAccount, user?.id, refreshData]);

  const addProject = async (name: string) => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        project_name: name,
        is_default: false,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding project:', error);
      return;
    }
    
    if (data) {
      const newProject: Project = {
        id: data.id,
        name: data.project_name,
        createdAt: data.created_at,
      };
      setProjects(prev => [...prev, newProject]);
      setActiveProjectId(data.id);
    }
  };

  const deleteProject = async (id: string) => {
    if (!user?.id) return;
    
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting project:', error);
      return;
    }
    
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProjectId === id && projects.length > 1) {
      const remaining = projects.filter(p => p.id !== id);
      setActiveProjectId(remaining[0]?.id || '');
    }
  };

  const updateProject = async (id: string, name: string) => {
    if (!user?.id) return;
    
    const { error } = await supabase
      .from('projects')
      .update({ project_name: name })
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error updating project:', error);
      return;
    }
    
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
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

  const addBuyer = async (buyerData: Omit<Buyer, 'id' | 'createdAt' | 'activityCount'>) => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('crm_buyers')
      .insert({
        user_id: user.id,
        project_id: buyerData.projectId || null,
        company_name: buyerData.name,
        country: buyerData.country,
        region: buyerData.region,
        source: 'BL_SEARCH',
        stage: buyerData.status || 'list',
        activity_count: 0,
        bl_destination_country: buyerData.blDestinationCountry || null,
        bl_origin_country: buyerData.blOriginCountry || null,
        bl_hs_code: buyerData.blHsCode || null,
        bl_product_desc: buyerData.blProductDesc || null,
        bl_row_fingerprint: buyerData.blRowFingerprint || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding buyer:', error);
      return;
    }
    
    if (data) {
      const newBuyer: Buyer = {
        id: data.id,
        projectId: data.project_id || '',
        name: data.company_name,
        country: data.country || '',
        countryCode: '',
        region: (data.region as Buyer['region']) || 'asia',
        status: data.stage as BuyerStatus,
        createdAt: data.created_at,
        activityCount: data.activity_count,
        bookmarked: false,
        websiteUrl: '',
        address: '',
        phone: '',
        email: '',
        revenue: '',
        revenueCurrency: 'USD',
        mainProducts: '',
        facebookUrl: '',
        linkedinUrl: '',
        youtubeUrl: '',
        contacts: [],
        blDestinationCountry: (data as any).bl_destination_country,
        blOriginCountry: (data as any).bl_origin_country,
        blHsCode: (data as any).bl_hs_code,
        blProductDesc: (data as any).bl_product_desc,
        blRowFingerprint: (data as any).bl_row_fingerprint,
      };
      setBuyers(prev => [newBuyer, ...prev]);
      
      // Add to move history (local for now)
      const newHistoryItem: MoveHistoryItem = {
        id: moveHistory.length > 0 ? Math.max(...moveHistory.map(h => h.id)) + 1 : 1,
        projectId: buyerData.projectId,
        category: 'funnel',
        description: `${newBuyer.name} 바이어 기업 등록`,
        author: profile?.full_name || '관리자',
        date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', ''),
      };
      setMoveHistory(prev => [newHistoryItem, ...prev]);
    }
  };

  const updateBuyer = async (buyerId: string, updates: Partial<Buyer>) => {
    if (!user?.id) return;
    
    const dbUpdates: Record<string, unknown> = {};
    
    // Basic fields
    if (updates.name !== undefined) dbUpdates.company_name = updates.name;
    if (updates.country !== undefined) dbUpdates.country = updates.country;
    if (updates.region !== undefined) dbUpdates.region = updates.region;
    if (updates.status !== undefined) dbUpdates.stage = updates.status;
    if (updates.activityCount !== undefined) dbUpdates.activity_count = updates.activityCount;
    
    // Company detail fields - map from Buyer type to database column names
    if (updates.websiteUrl !== undefined) dbUpdates.website = updates.websiteUrl;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.phone !== undefined) dbUpdates.company_phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.company_email = updates.email;
    if (updates.facebookUrl !== undefined) dbUpdates.facebook_url = updates.facebookUrl;
    if (updates.linkedinUrl !== undefined) dbUpdates.linkedin_url = updates.linkedinUrl;
    if (updates.youtubeUrl !== undefined) dbUpdates.youtube_url = updates.youtubeUrl;
    
    // Only make DB call if there are actual updates
    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase
        .from('crm_buyers')
        .update(dbUpdates)
        .eq('id', buyerId)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error updating buyer:', error);
        throw new Error('Failed to save buyer information');
      }
    }
    
    // Update local state
    setBuyers(prev => prev.map(b => b.id === buyerId ? { ...b, ...updates } : b));
  };

  const updateBuyerStatus = async (buyerId: string, status: BuyerStatus) => {
    const buyer = buyers.find(b => b.id === buyerId);
    if (!buyer || buyer.status === status || !user?.id) return;
    
    const { error } = await supabase
      .from('crm_buyers')
      .update({ stage: status })
      .eq('id', buyerId)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error updating buyer status:', error);
      return;
    }
    
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    const statusDateField = `${status}Date` as keyof Buyer;
    
    setBuyers(prev => prev.map(b => b.id === buyerId ? { 
      ...b, 
      status,
      [statusDateField]: today.slice(2)
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
    setMoveHistory(prev => [newHistoryItem, ...prev]);
  };

  const toggleBookmark = async (buyerId: string) => {
    setBuyers(prev => prev.map(b => b.id === buyerId ? { ...b, bookmarked: !b.bookmarked } : b));
  };

  const deleteBuyer = async (buyerId: string) => {
    if (!user?.id) return;
    
    const { error } = await supabase
      .from('crm_buyers')
      .delete()
      .eq('id', buyerId)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting buyer:', error);
      return;
    }
    
    setBuyers(prev => prev.filter(b => b.id !== buyerId));
  };

  const addActivity = (activityData: Omit<Activity, 'id'>) => {
    const newActivity: Activity = {
      ...activityData,
      id: String(Date.now()),
    };
    setActivities(prev => [newActivity, ...prev]);
    
    // Update buyer activity count
    setBuyers(prev => prev.map(b => 
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
      setMoveHistory(prev => [newHistoryItem, ...prev]);
    }
  };

  const deleteActivity = (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    if (activity) {
      setActivities(prev => prev.filter(a => a.id !== activityId));
      setBuyers(prev => prev.map(b => 
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
    setDocuments(prev => [newDoc, ...prev]);
  };

  const deleteDocument = (docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
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
      loading,
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
      refreshData,
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
