import React, { useState } from 'react';
import { InventoryProvider, useInventory } from './lib/useInventoryStore';
import { Navbar } from './components/navbar/Navbar';
import { FloorPlanViewer } from './components/floorplan/FloorPlanViewer';
import { AssetManagement } from './components/assets/AssetManagement';
import { AuditView } from './components/audit/AuditView';
import { ExcelImportView } from './components/import/ExcelImportView';
import { LabelGeneratorView } from './components/labels/LabelGeneratorView';
import { AuthModal } from './components/auth/AuthModal';
import { DatabaseStatusModal } from './components/database/DatabaseStatusModal';
import { AssetModal } from './components/assets/AssetModal';
import { MoveAssetModal } from './components/assets/MoveAssetModal';
import { Space, Asset } from './types';
import { AlertTriangle, Database, Sparkles } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, isDemo, supabaseStatus, loading, seedOfficialData } = useInventory();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<string>('floorplan');

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [dbModalOpen, setDbModalOpen] = useState(false);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);
  const [assetModalInitialSpaceId, setAssetModalInitialSpaceId] = useState<string>('');
  const [assetToMove, setAssetToMove] = useState<Asset | null>(null);

  // Targets passed across views
  const [auditTargetSpace, setAuditTargetSpace] = useState<Space | null>(null);
  const [labelTargetAssets, setLabelTargetAssets] = useState<Asset[]>([]);

  // Actions from Floor Plan
  const handleAuditFromFloor = (space: Space) => {
    setAuditTargetSpace(space);
    setActiveTab('audit');
  };

  const handleAddAssetToSpace = (spaceId: string) => {
    setAssetToEdit(null);
    setAssetModalInitialSpaceId(spaceId);
    setAssetModalOpen(true);
  };

  const handleMoveAsset = (asset: Asset) => {
    setAssetToMove(asset);
  };

  const handleEditAsset = (asset: Asset) => {
    setAssetToEdit(asset);
    setAssetModalInitialSpaceId(asset.space_id || '');
    setAssetModalOpen(true);
  };

  const handlePrintLabel = (item: Asset | Space, type: 'asset' | 'space') => {
    if (type === 'asset') {
      setLabelTargetAssets([item as Asset]);
    }
    setActiveTab('labels');
  };

  const handlePrintMultipleAssets = (items: Asset[]) => {
    setLabelTargetAssets(items);
    setActiveTab('labels');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Warning Banner if Supabase tables are not created */}
      {!supabaseStatus.tablesCreated && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-300 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Note de configuration Supabase :</strong> Les tables SQL ne sont pas encore créées dans votre projet. L'application utilise actuellement le stockage local sécurisé.
            </span>
          </div>
          <button
            onClick={() => setDbModalOpen(true)}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] transition shrink-0 ml-3 shadow-sm"
          >
            Créer les tables (1 clic)
          </button>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenDbStatus={() => setDbModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Chargement de votre inventaire...</p>
          </div>
        ) : (
          <>
            {activeTab === 'floorplan' && (
              <FloorPlanViewer
                onAuditSpace={handleAuditFromFloor}
                onAddAsset={handleAddAssetToSpace}
                onMoveAsset={handleMoveAsset}
                onEditAsset={handleEditAsset}
                onPrintLabel={handlePrintLabel}
              />
            )}

            {activeTab === 'inventory' && (
              <AssetManagement onOpenLabelPrinter={handlePrintMultipleAssets} />
            )}

            {activeTab === 'audit' && (
              <AuditView initialSpace={auditTargetSpace} />
            )}

            {activeTab === 'import' && (
              <ExcelImportView />
            )}

            {activeTab === 'labels' && (
              <LabelGeneratorView initialAssets={labelTargetAssets} />
            )}
          </>
        )}
      </main>

      {/* Global Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <DatabaseStatusModal
        isOpen={dbModalOpen}
        onClose={() => setDbModalOpen(false)}
      />

      <AssetModal
        isOpen={assetModalOpen}
        assetToEdit={assetToEdit}
        initialSpaceId={assetModalInitialSpaceId}
        onClose={() => {
          setAssetModalOpen(false);
          setAssetToEdit(null);
          setAssetModalInitialSpaceId('');
        }}
      />

      <MoveAssetModal
        isOpen={!!assetToMove}
        asset={assetToMove}
        onClose={() => setAssetToMove(null)}
      />
    </div>
  );
};

export function App() {
  return (
    <InventoryProvider>
      <MainApp />
    </InventoryProvider>
  );
}

export default App;
