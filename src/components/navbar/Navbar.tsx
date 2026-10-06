import React from 'react';
import { 
  Layers, 
  MapPin, 
  Package, 
  QrCode, 
  UploadCloud, 
  Printer, 
  Database, 
  LogOut, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useInventory } from '../../lib/useInventoryStore';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: () => void;
  onOpenDbStatus: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAuth,
  onOpenDbStatus,
}) => {
  const { 
    user, 
    isDemo, 
    logout, 
    floors, 
    currentFloor, 
    setCurrentFloorId, 
    assets,
    supabaseStatus,
    seedOfficialData,
    loading
  } = useInventory();

  const navItems = [
    { id: 'floorplan', label: 'Plan Interactif', icon: MapPin },
    { id: 'inventory', label: 'Inventaire IT', icon: Package, badge: assets.length },
    { id: 'audit', label: 'Audit Scanner', icon: QrCode },
    { id: 'import', label: 'Import Excel / Sheets', icon: UploadCloud },
    { id: 'labels', label: 'Étiquettes Barcode/QR', icon: Printer },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 select-none">
      {/* Top Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800/80">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Layers className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">IT Asset Mapper</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                v1.0 Pro
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {user ? user.organization_name || user.email : 'Inventaire & Cartographie Visuelle'}
            </p>
          </div>
        </div>

        {/* Center: Floor Switcher */}
        {floors.length > 0 && (
          <div className="hidden md:flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/60">
            <span className="text-xs text-slate-400 px-2.5 font-medium flex items-center">
              <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Étage :
            </span>
            <div className="flex space-x-1">
              {floors.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCurrentFloorId(f.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    currentFloor?.id === f.id
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Right controls */}
        <div className="flex items-center space-x-2.5">
          {/* Quick Seed Button if empty */}
          {assets.length === 0 && (
            <button
              onClick={seedOfficialData}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-semibold transition"
              title="Charger l'inventaire officiel DA AOLF & AOLE (données réelles)"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Charger l'inventaire officiel</span>
            </button>
          )}

          {/* Database status pill */}
          <button
            onClick={onOpenDbStatus}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
              supabaseStatus.tablesCreated
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                : supabaseStatus.connected
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {supabaseStatus.tablesCreated
                ? 'Supabase Connecté'
                : supabaseStatus.connected
                ? 'Tables à Créer'
                : 'Mode Déconnecté'}
            </span>
          </button>

          {/* User state */}
          {user ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">{user.email}</div>
                <div className="text-[10px] text-slate-400">
                  {isDemo ? 'Compte Local' : 'Supabase Auth'}
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg shadow-sm transition"
            >
              Connexion / Compte
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <nav className="px-4 flex items-center space-x-1 overflow-x-auto scrollbar-none py-1.5 bg-slate-950/40">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-slate-800 text-emerald-400 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Mobile floor selector dropdown */}
        {floors.length > 0 && (
          <div className="md:hidden ml-auto flex items-center">
            <select
              value={currentFloor?.id || ''}
              onChange={(e) => setCurrentFloorId(e.target.value)}
              className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2 py-1.5 outline-none"
            >
              {floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </nav>
    </header>
  );
};
