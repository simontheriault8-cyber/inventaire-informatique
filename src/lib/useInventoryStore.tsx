import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, checkSupabaseConnection } from './supabase';
import { Floor, Space, Category, Asset, AssetMovement, AuditSession } from '../types';
import { getInitialFloors, getInitialSpaces, getInitialCategories, getInitialAssets, DEFAULT_CATEGORIES } from './initialData';

interface UserProfile {
  id: string;
  email: string;
  organization_name?: string;
}

interface InventoryContextType {
  user: UserProfile | null;
  isDemo: boolean;
  loading: boolean;
  supabaseStatus: { connected: boolean; tablesCreated: boolean; error?: string };
  floors: Floor[];
  currentFloor: Floor | null;
  spaces: Space[];
  assets: Asset[];
  categories: Category[];
  movements: AssetMovement[];
  auditSessions: AuditSession[];
  
  // Auth
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, pass: string, orgName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  enterDemoMode: () => void;
  
  // Floor navigation & editing
  setCurrentFloorId: (id: string) => void;
  addFloor: (floor: Omit<Floor, 'id' | 'user_id'>) => Promise<Floor>;
  
  // Spaces
  saveSpace: (space: Partial<Space> & { name: string; code: string; type: Space['type'] }) => Promise<Space>;
  updateSpacePosition: (spaceId: string, xPercent: number, yPercent: number) => Promise<void>;
  deleteSpace: (spaceId: string) => Promise<void>;
  
  // Assets
  saveAsset: (asset: Partial<Asset> & { name: string; asset_tag: string; status: Asset['status'] }) => Promise<Asset>;
  deleteAsset: (assetId: string) => Promise<void>;
  moveAsset: (assetId: string, toSpaceId: string, reason?: string) => Promise<void>;
  
  // Import & Seed
  importBatch: (newAssets: Partial<Asset>[], autoCreateSpaces?: boolean) => Promise<{ importedCount: number; errors: string[] }>;
  seedOfficialData: () => Promise<void>;
  
  // Audit
  completeAuditSession: (spaceId: string, auditorName: string, items: Array<{ asset_id: string; status: 'conforme' | 'inattendu' | 'manquant' }>) => Promise<void>;
  
  refreshData: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [supabaseStatus, setSupabaseStatus] = useState<{ connected: boolean; tablesCreated: boolean; error?: string }>({
    connected: false,
    tablesCreated: false,
  });

  const [floors, setFloors] = useState<Floor[]>([]);
  const [currentFloorId, setCurrentFloorId] = useState<string>('');
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<AssetMovement[]>([]);
  const [auditSessions, setAuditSessions] = useState<AuditSession[]>([]);

  // Vérification de la connexion Supabase et restauration de session
  useEffect(() => {
    async function init() {
      setLoading(true);
      const status = await checkSupabaseConnection();
      setSupabaseStatus(status);

      // Vérifie session Supabase Auth existante
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        const u = sessionData.session.user;
        setUser({ id: u.id, email: u.email || '', organization_name: u.user_metadata?.organization_name || 'Mon Organisation' });
        setIsDemo(false);
      } else {
        // Regarder si une session démo locale existe
        const storedDemo = localStorage.getItem('inventory_demo_user');
        if (storedDemo) {
          try {
            setUser(JSON.parse(storedDemo));
            setIsDemo(true);
          } catch (e) {
            // Ignorer
          }
        }
      }
      setLoading(false);
    }
    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          organization_name: session.user.user_metadata?.organization_name || 'Mon Organisation'
        });
        setIsDemo(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Chargement des données dès que l'utilisateur change
  const refreshData = useCallback(async () => {
    if (!user) {
      setFloors([]);
      setSpaces([]);
      setAssets([]);
      setCategories([]);
      setMovements([]);
      setAuditSessions([]);
      return;
    }

    setLoading(true);

    if (isDemo || !supabaseStatus.tablesCreated) {
      // Stockage local isolé par ID utilisateur
      const storageKey = `inventory_data_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setFloors(parsed.floors || []);
          setSpaces(parsed.spaces || []);
          setAssets(parsed.assets || []);
          setCategories(parsed.categories || []);
          setMovements(parsed.movements || []);
          setAuditSessions(parsed.auditSessions || []);
          if (parsed.floors?.length && !currentFloorId) {
            setCurrentFloorId(parsed.floors[0].id);
          }
          setLoading(false);
          return;
        } catch (e) {
          console.error('Erreur lecture localStorage:', e);
        }
      }

      // Si rien en cache local pour cet utilisateur, on génère la structure initiale
      const initF = getInitialFloors(user.id);
      const initS = getInitialSpaces(user.id, initF[0].id, initF[1].id);
      const spacesMap: Record<string, string> = {};
      initS.forEach(s => { spacesMap[s.code] = s.id; });
      const initA = getInitialAssets(user.id, spacesMap);
      const initC: Category[] = DEFAULT_CATEGORIES.map((c, i) => ({
        id: `${user.id}-cat-${i + 1}`,
        user_id: user.id,
        name: c.name,
        icon: c.icon
      }));

      setFloors(initF);
      setSpaces(initS);
      setAssets(initA);
      setCategories(initC);
      setCurrentFloorId(initF[0].id);

      saveToLocalStorage(user.id, {
        floors: initF,
        spaces: initS,
        assets: initA,
        categories: initC,
        movements: [],
        auditSessions: []
      });
      setLoading(false);
      return;
    }

    // Chargement réel depuis Supabase
    try {
      const [fRes, sRes, aRes, cRes, mRes, audRes] = await Promise.all([
        supabase.from('floors').select('*').order('floor_number', { ascending: true }),
        supabase.from('spaces').select('*').order('name', { ascending: true }),
        supabase.from('assets').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
        supabase.from('asset_movements').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('audit_sessions').select('*').order('started_at', { ascending: false }).limit(50),
      ]);

      let loadedFloors = fRes.data || [];
      let loadedSpaces = sRes.data || [];
      let loadedAssets = aRes.data || [];
      let loadedCategories = cRes.data || [];

      // Si l'utilisateur n'a encore aucun étage créé dans Supabase, amorcer automatiquement avec les 2 étages fournis
      if (loadedFloors.length === 0) {
        const initF = getInitialFloors(user.id);
        const { data: insertedFloors } = await supabase.from('floors').insert(initF).select();
        if (insertedFloors?.length) {
          loadedFloors = insertedFloors;
          const initS = getInitialSpaces(user.id, loadedFloors[0].id, loadedFloors[1].id);
          const { data: insertedSpaces } = await supabase.from('spaces').insert(initS).select();
          if (insertedSpaces) loadedSpaces = insertedSpaces;

          // Catégories
          const initC = DEFAULT_CATEGORIES.map(c => ({ user_id: user.id, name: c.name, icon: c.icon }));
          const { data: insertedCats } = await supabase.from('categories').insert(initC).select();
          if (insertedCats) loadedCategories = insertedCats;
        }
      }

      setFloors(loadedFloors);
      setSpaces(loadedSpaces);
      setAssets(loadedAssets);
      setCategories(loadedCategories);
      setMovements(mRes.data || []);
      setAuditSessions(audRes.data || []);

      if (loadedFloors.length > 0 && (!currentFloorId || !loadedFloors.find(f => f.id === currentFloorId))) {
        setCurrentFloorId(loadedFloors[0].id);
      }
    } catch (err) {
      console.error('Erreur chargement Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isDemo, supabaseStatus.tablesCreated, currentFloorId]);

  useEffect(() => {
    refreshData();
  }, [user, isDemo]);

  function saveToLocalStorage(userId: string, data: any) {
    localStorage.setItem(`inventory_data_${userId}`, JSON.stringify(data));
  }

  // Auth Methods
  const login = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return { success: false, error: error.message };
    if (data.user) {
      setUser({ id: data.user.id, email: data.user.email || '', organization_name: data.user.user_metadata?.organization_name });
      setIsDemo(false);
      return { success: true };
    }
    return { success: false, error: 'Connexion échouée' };
  };

  const signup = async (email: string, pass: string, orgName: string = 'Mon Organisation') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { organization_name: orgName } }
    });
    if (error) return { success: false, error: error.message };
    if (data.user) {
      setUser({ id: data.user.id, email: data.user.email || '', organization_name: orgName });
      setIsDemo(false);
      return { success: true };
    }
    return { success: false, error: 'Inscription échouée' };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('inventory_demo_user');
    setUser(null);
    setIsDemo(false);
  };

  const enterDemoMode = () => {
    const demoU: UserProfile = {
      id: 'demo-user-local',
      email: 'demo@organisation.local',
      organization_name: 'Organisation Démo (Local)'
    };
    localStorage.setItem('inventory_demo_user', JSON.stringify(demoU));
    setUser(demoU);
    setIsDemo(true);
  };

  // Floor
  const addFloor = async (floorData: Omit<Floor, 'id' | 'user_id'>): Promise<Floor> => {
    if (!user) throw new Error('Non connecté');
    const newFloor: Floor = {
      id: isDemo || !supabaseStatus.tablesCreated ? `floor-${Date.now()}` : undefined as any,
      user_id: user.id,
      ...floorData,
      created_at: new Date().toISOString()
    };

    if (isDemo || !supabaseStatus.tablesCreated) {
      const updated = [...floors, newFloor];
      setFloors(updated);
      saveToLocalStorage(user.id, { floors: updated, spaces, assets, categories, movements, auditSessions });
      return newFloor;
    } else {
      const { data, error } = await supabase.from('floors').insert(newFloor).select().single();
      if (error) throw error;
      setFloors(prev => [...prev, data]);
      return data;
    }
  };

  // Spaces
  const saveSpace = async (spaceData: Partial<Space> & { name: string; code: string; type: Space['type'] }): Promise<Space> => {
    if (!user) throw new Error('Non connecté');
    const spaceToSave: Space = {
      id: spaceData.id || `${user.id}-space-${Date.now()}`,
      user_id: user.id,
      floor_id: spaceData.floor_id || currentFloorId,
      name: spaceData.name,
      code: spaceData.code,
      type: spaceData.type,
      x_percent: spaceData.x_percent ?? 50,
      y_percent: spaceData.y_percent ?? 50,
      color: spaceData.color || '#10b981',
      created_at: spaceData.created_at || new Date().toISOString()
    };

    if (isDemo || !supabaseStatus.tablesCreated) {
      const exists = spaces.some(s => s.id === spaceToSave.id);
      const updated = exists ? spaces.map(s => s.id === spaceToSave.id ? spaceToSave : s) : [...spaces, spaceToSave];
      setSpaces(updated);
      saveToLocalStorage(user.id, { floors, spaces: updated, assets, categories, movements, auditSessions });
      return spaceToSave;
    } else {
      if (spaceData.id) {
        const { data, error } = await supabase.from('spaces').update(spaceToSave).eq('id', spaceData.id).select().single();
        if (error) throw error;
        setSpaces(prev => prev.map(s => s.id === data.id ? data : s));
        return data;
      } else {
        const { data, error } = await supabase.from('spaces').insert(spaceToSave).select().single();
        if (error) throw error;
        setSpaces(prev => [...prev, data]);
        return data;
      }
    }
  };

  const updateSpacePosition = async (spaceId: string, xPercent: number, yPercent: number) => {
    const updated = spaces.map(s => s.id === spaceId ? { ...s, x_percent: xPercent, y_percent: yPercent } : s);
    setSpaces(updated);

    if (isDemo || !supabaseStatus.tablesCreated) {
      if (user) saveToLocalStorage(user.id, { floors, spaces: updated, assets, categories, movements, auditSessions });
    } else {
      await supabase.from('spaces').update({ x_percent: xPercent, y_percent: yPercent }).eq('id', spaceId);
    }
  };

  const deleteSpace = async (spaceId: string) => {
    const updated = spaces.filter(s => s.id !== spaceId);
    setSpaces(updated);
    // Dé-affecte le matériel de ce bureau
    const updatedAssets = assets.map(a => a.space_id === spaceId ? { ...a, space_id: undefined } : a);
    setAssets(updatedAssets);

    if (isDemo || !supabaseStatus.tablesCreated) {
      if (user) saveToLocalStorage(user.id, { floors, spaces: updated, assets: updatedAssets, categories, movements, auditSessions });
    } else {
      await supabase.from('spaces').delete().eq('id', spaceId);
    }
  };

  // Assets
  const saveAsset = async (assetData: Partial<Asset> & { name: string; asset_tag: string; status: Asset['status'] }): Promise<Asset> => {
    if (!user) throw new Error('Non connecté');
    const assetToSave: Asset = {
      id: assetData.id || `${user.id}-asset-${Date.now()}`,
      user_id: user.id,
      asset_tag: assetData.asset_tag,
      name: assetData.name,
      serial_number: assetData.serial_number,
      hostname: assetData.hostname,
      nsn: assetData.nsn,
      category_id: assetData.category_id,
      brand: assetData.brand,
      model: assetData.model,
      department: assetData.department,
      assigned_user: assetData.assigned_user,
      user_grade: assetData.user_grade,
      purchase_price: assetData.purchase_price,
      status: assetData.status,
      space_id: assetData.space_id,
      notes: assetData.notes,
      last_audited_at: assetData.last_audited_at,
      created_at: assetData.created_at || new Date().toISOString()
    };

    if (isDemo || !supabaseStatus.tablesCreated) {
      const exists = assets.some(a => a.id === assetToSave.id);
      const updated = exists ? assets.map(a => a.id === assetToSave.id ? assetToSave : a) : [assetToSave, ...assets];
      setAssets(updated);
      saveToLocalStorage(user.id, { floors, spaces, assets: updated, categories, movements, auditSessions });
      return assetToSave;
    } else {
      if (assetData.id) {
        const { data, error } = await supabase.from('assets').update(assetToSave).eq('id', assetData.id).select().single();
        if (error) throw error;
        setAssets(prev => prev.map(a => a.id === data.id ? data : a));
        return data;
      } else {
        const { data, error } = await supabase.from('assets').insert(assetToSave).select().single();
        if (error) throw error;
        setAssets(prev => [data, ...prev]);
        return data;
      }
    }
  };

  const deleteAsset = async (assetId: string) => {
    const updated = assets.filter(a => a.id !== assetId);
    setAssets(updated);
    if (isDemo || !supabaseStatus.tablesCreated) {
      if (user) saveToLocalStorage(user.id, { floors, spaces, assets: updated, categories, movements, auditSessions });
    } else {
      await supabase.from('assets').delete().eq('id', assetId);
    }
  };

  const moveAsset = async (assetId: string, toSpaceId: string, reason?: string) => {
    if (!user) return;
    const targetAsset = assets.find(a => a.id === assetId);
    if (!targetAsset) return;

    const fromSpace = spaces.find(s => s.id === targetAsset.space_id);
    const toSpace = spaces.find(s => s.id === toSpaceId);

    const movement: AssetMovement = {
      id: `${user.id}-mov-${Date.now()}`,
      user_id: user.id,
      asset_id: assetId,
      from_space_id: targetAsset.space_id,
      to_space_id: toSpaceId,
      moved_by: user.email,
      reason: reason || 'Déplacement manuel',
      created_at: new Date().toISOString(),
      asset_name: targetAsset.name,
      from_space_name: fromSpace?.name || 'Non assigné',
      to_space_name: toSpace?.name || 'Non assigné'
    };

    const updatedAssets = assets.map(a => a.id === assetId ? { ...a, space_id: toSpaceId } : a);
    const updatedMovements = [movement, ...movements];

    setAssets(updatedAssets);
    setMovements(updatedMovements);

    if (isDemo || !supabaseStatus.tablesCreated) {
      saveToLocalStorage(user.id, { floors, spaces, assets: updatedAssets, categories, movements: updatedMovements, auditSessions });
    } else {
      await Promise.all([
        supabase.from('assets').update({ space_id: toSpaceId }).eq('id', assetId),
        supabase.from('asset_movements').insert({
          user_id: user.id,
          asset_id: assetId,
          from_space_id: targetAsset.space_id,
          to_space_id: toSpaceId,
          moved_by: user.email,
          reason: reason || 'Déplacement manuel'
        })
      ]);
    }
  };

  // Seed officiel 1-clic
  const seedOfficialData = async () => {
    if (!user) return;
    setLoading(true);

    const initF = getInitialFloors(user.id);
    const initS = getInitialSpaces(user.id, initF[0].id, initF[1].id);
    const spacesMap: Record<string, string> = {};
    initS.forEach(s => { spacesMap[s.code] = s.id; });
    const initA = getInitialAssets(user.id, spacesMap);
    const initC: Category[] = DEFAULT_CATEGORIES.map((c, i) => ({
      id: `${user.id}-cat-${i + 1}`,
      user_id: user.id,
      name: c.name,
      icon: c.icon
    }));

    if (isDemo || !supabaseStatus.tablesCreated) {
      setFloors(initF);
      setSpaces(initS);
      setAssets(initA);
      setCategories(initC);
      setCurrentFloorId(initF[0].id);
      saveToLocalStorage(user.id, { floors: initF, spaces: initS, assets: initA, categories: initC, movements: [], auditSessions: [] });
    } else {
      // Nettoyer et ré-insérer dans Supabase
      try {
        await supabase.from('assets').delete().eq('user_id', user.id);
        await supabase.from('spaces').delete().eq('user_id', user.id);
        await supabase.from('floors').delete().eq('user_id', user.id);
        await supabase.from('categories').delete().eq('user_id', user.id);

        await supabase.from('floors').insert(initF);
        await supabase.from('spaces').insert(initS);
        await supabase.from('categories').insert(initC);
        
        // Chunk d'insertion par paquets de 100 pour assets
        for (let i = 0; i < initA.length; i += 100) {
          const chunk = initA.slice(i, i + 100);
          await supabase.from('assets').insert(chunk);
        }

        await refreshData();
      } catch (e) {
        console.error('Erreur seed Supabase:', e);
      }
    }
    setLoading(false);
  };

  // Import Batch
  const importBatch = async (newAssetsData: any[], autoCreateSpaces = true) => {
    if (!user) return { importedCount: 0, errors: ['Non connecté'] };
    const errors: string[] = [];
    const spacesMap: Record<string, string> = {};
    spaces.forEach(s => { spacesMap[s.code.toLowerCase()] = s.id; });

    const newSpacesToAdd: Space[] = [];
    const assetsToInsert: Asset[] = [];

    newAssetsData.forEach((item, idx) => {
      if (!item.name && !item.asset_tag) return;

      const tag = item.asset_tag || `TAG-IMP-${Date.now()}-${idx}`;
      let assignedSpaceId = item.space_id;

      if (item.local_code) {
        const normalized = item.local_code.trim().toLowerCase();
        if (spacesMap[normalized]) {
          assignedSpaceId = spacesMap[normalized];
        } else if (autoCreateSpaces) {
          const newSp: Space = {
            id: `${user.id}-space-${Date.now()}-${idx}`,
            user_id: user.id,
            floor_id: currentFloorId || floors[0]?.id,
            name: `Espace ${item.local_code}`,
            code: item.local_code.trim(),
            type: 'bureau',
            x_percent: Math.floor(Math.random() * 60) + 20,
            y_percent: Math.floor(Math.random() * 60) + 20,
            color: '#10b981'
          };
          newSpacesToAdd.push(newSp);
          spacesMap[normalized] = newSp.id;
          assignedSpaceId = newSp.id;
        }
      }

      assetsToInsert.push({
        id: `${user.id}-asset-${Date.now()}-${idx}`,
        user_id: user.id,
        asset_tag: tag,
        name: item.name || 'Équipement importé',
        serial_number: item.serial_number,
        hostname: item.hostname,
        nsn: item.nsn,
        brand: item.brand,
        model: item.model,
        department: item.department,
        assigned_user: item.assigned_user,
        user_grade: item.user_grade,
        purchase_price: item.purchase_price,
        status: item.status || 'en_service',
        space_id: assignedSpaceId,
        notes: item.notes,
        created_at: new Date().toISOString()
      });
    });

    const updatedSpaces = [...spaces, ...newSpacesToAdd];
    const updatedAssets = [...assetsToInsert, ...assets];

    if (isDemo || !supabaseStatus.tablesCreated) {
      setSpaces(updatedSpaces);
      setAssets(updatedAssets);
      saveToLocalStorage(user.id, { floors, spaces: updatedSpaces, assets: updatedAssets, categories, movements, auditSessions });
    } else {
      if (newSpacesToAdd.length > 0) {
        await supabase.from('spaces').insert(newSpacesToAdd);
      }
      for (let i = 0; i < assetsToInsert.length; i += 100) {
        await supabase.from('assets').insert(assetsToInsert.slice(i, i + 100));
      }
      await refreshData();
    }

    return { importedCount: assetsToInsert.length, errors };
  };

  // Complete Audit Session
  const completeAuditSession = async (
    spaceId: string,
    auditorName: string,
    items: Array<{ asset_id: string; status: 'conforme' | 'inattendu' | 'manquant' }>
  ) => {
    if (!user) return;
    const now = new Date().toISOString();
    const session: AuditSession = {
      id: `${user.id}-aud-${Date.now()}`,
      user_id: user.id,
      space_id: spaceId,
      auditor_name: auditorName,
      status: 'termine',
      started_at: now,
      completed_at: now
    };

    // Met à jour la date de dernier audit des équipements conformes
    const verifiedAssetIds = items.filter(i => i.status === 'conforme').map(i => i.asset_id);
    const updatedAssets = assets.map(a => verifiedAssetIds.includes(a.id) ? { ...a, last_audited_at: now } : a);
    const updatedSessions = [session, ...auditSessions];

    setAssets(updatedAssets);
    setAuditSessions(updatedSessions);

    if (isDemo || !supabaseStatus.tablesCreated) {
      saveToLocalStorage(user.id, { floors, spaces, assets: updatedAssets, categories, movements, auditSessions: updatedSessions });
    } else {
      const { data: createdSession } = await supabase.from('audit_sessions').insert({
        user_id: user.id,
        space_id: spaceId,
        auditor_name: auditorName,
        status: 'termine',
        started_at: now,
        completed_at: now
      }).select().single();

      if (createdSession && items.length > 0) {
        const auditItemsData = items.map(it => ({
          audit_session_id: createdSession.id,
          asset_id: it.asset_id,
          status: it.status,
          scanned_at: now
        }));
        await supabase.from('audit_items').insert(auditItemsData);
      }

      if (verifiedAssetIds.length > 0) {
        await supabase.from('assets').update({ last_audited_at: now }).in('id', verifiedAssetIds);
      }
    }
  };

  const currentFloor = floors.find(f => f.id === currentFloorId) || floors[0] || null;

  return (
    <InventoryContext.Provider value={{
      user,
      isDemo,
      loading,
      supabaseStatus,
      floors,
      currentFloor,
      spaces,
      assets,
      categories,
      movements,
      auditSessions,
      login,
      signup,
      logout,
      enterDemoMode,
      setCurrentFloorId,
      addFloor,
      saveSpace,
      updateSpacePosition,
      deleteSpace,
      saveAsset,
      deleteAsset,
      moveAsset,
      importBatch,
      seedOfficialData,
      completeAuditSession,
      refreshData,
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory doit être utilisé au sein de InventoryProvider');
  return context;
}
