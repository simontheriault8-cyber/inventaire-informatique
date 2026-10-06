import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Plus, 
  Edit3, 
  Eye, 
  Search, 
  Upload, 
  FileText,
  Layers, 
  MapPin, 
  Laptop, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useInventory } from '../../lib/useInventoryStore';
import { Space, Asset } from '../../types';
import { convertPdfPageToImage } from '../../lib/pdfRenderer';
import { SpaceDrawer } from './SpaceDrawer';
import { SpaceModal } from './SpaceModal';

interface FloorPlanViewerProps {
  onAuditSpace: (space: Space) => void;
  onAddAsset: (spaceId: string) => void;
  onMoveAsset: (asset: Asset) => void;
  onEditAsset: (asset: Asset) => void;
  onPrintLabel: (item: Asset | Space, type: 'asset' | 'space') => void;
}

export const FloorPlanViewer: React.FC<FloorPlanViewerProps> = ({
  onAuditSpace,
  onAddAsset,
  onMoveAsset,
  onEditAsset,
  onPrintLabel,
}) => {
  const { 
    currentFloor, 
    floors, 
    spaces, 
    assets, 
    setCurrentFloorId, 
    updateSpacePosition, 
    deleteSpace,
    addFloor 
  } = useInventory();

  // Mode: consultation vs édition
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [spaceModalOpen, setSpaceModalOpen] = useState(false);
  const [spaceToEdit, setSpaceToEdit] = useState<Space | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number } | null>(null);

  // Recherche rapide sur la carte
  const [searchQuery, setSearchQuery] = useState('');

  // Zoom et Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Dragging a space button in edit mode
  const [draggingSpaceId, setDraggingSpaceId] = useState<string | null>(null);

  // File upload (PDF / PNG)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPlan, setUploadingPlan] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const planImageRef = useRef<HTMLImageElement>(null);

  const currentSpaces = spaces.filter((s) => s.floor_id === currentFloor?.id);

  // Recherche & mise en surbrillance
  const matchingSpaceIds = React.useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const query = searchQuery.toLowerCase().trim();
    const set = new Set<string>();

    // Recherche par code ou nom de local
    currentSpaces.forEach((s) => {
      if (s.code.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)) {
        set.add(s.id);
      }
    });

    // Recherche par matériel situé dans ce local
    assets.forEach((a) => {
      if (!a.space_id) return;
      if (
        a.name.toLowerCase().includes(query) ||
        a.asset_tag.toLowerCase().includes(query) ||
        (a.serial_number && a.serial_number.toLowerCase().includes(query)) ||
        (a.assigned_user && a.assigned_user.toLowerCase().includes(query)) ||
        (a.brand && a.brand.toLowerCase().includes(query)) ||
        (a.hostname && a.hostname.toLowerCase().includes(query))
      ) {
        set.add(a.space_id);
      }
    });

    return set;
  }, [searchQuery, currentSpaces, assets]);

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.4));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY * -0.002;
      setZoom((prev) => Math.min(Math.max(prev + delta, 0.4), 4));
    }
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Si clic avec bouton gauche sur le fond (pas sur un bouton de bureau)
    if (e.button === 0 && !draggingSpaceId) {
      const target = e.target as HTMLElement;
      if (target.classList.contains('plan-surface') || target.tagName === 'IMG') {
        setIsPanning(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else if (draggingSpaceId && planImageRef.current) {
      // Repositionnement de l'espace en cours de déplacement
      const rect = planImageRef.current.getBoundingClientRect();
      const xPercent = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 0), 100);
      const yPercent = Math.min(Math.max(((e.clientY - rect.top) / rect.height) * 100, 0), 100);

      updateSpacePosition(draggingSpaceId, Math.round(xPercent * 10) / 10, Math.round(yPercent * 10) / 10);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingSpaceId(null);
  };

  // Clic sur le plan pour ajouter un bureau en mode édition
  const handlePlanClick = (e: React.MouseEvent) => {
    if (!isEditMode || isPanning || draggingSpaceId) return;
    if (!planImageRef.current) return;

    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG' || target.classList.contains('plan-surface')) {
      const rect = planImageRef.current.getBoundingClientRect();
      const xPercent = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 0), 100);
      const yPercent = Math.min(Math.max(((e.clientY - rect.top) / rect.height) * 100, 0), 100);

      setPendingCoords({ x: Math.round(xPercent * 10) / 10, y: Math.round(yPercent * 10) / 10 });
      setSpaceToEdit(null);
      setSpaceModalOpen(true);
    }
  };

  // Upload d'un nouveau plan (PDF ou Image)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPlan(true);
    try {
      let imageUrl = '';
      if (file.type === 'application/pdf') {
        imageUrl = await convertPdfPageToImage(file, 1);
      } else {
        imageUrl = URL.createObjectURL(file);
      }

      await addFloor({
        name: file.name.replace(/\.[^/.]+$/, ''),
        floor_number: floors.length + 1,
        plan_image_url: imageUrl,
      });
    } catch (err) {
      console.error('Erreur import plan:', err);
    } finally {
      setUploadingPlan(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-105px)] bg-slate-950 flex flex-col overflow-hidden select-none">
      {/* Top Controls Overlay */}
      <div className="absolute top-4 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Quick Search */}
        <div className="pointer-events-auto flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 ml-2.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Localiser un bureau, tag, PC, personne..."
            className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none pr-3"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              ×
            </button>
          )}
        </div>

        {/* Right: Mode Toggle & Plan Upload */}
        <div className="pointer-events-auto flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          {/* Mode Toggle Button */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              isEditMode
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {isEditMode ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isEditMode ? 'Mode Édition Activé' : 'Mode Consultation'}</span>
          </button>

          {/* Add Space button in Edit Mode */}
          {isEditMode && (
            <button
              onClick={() => {
                setSpaceToEdit(null);
                setPendingCoords({ x: 50, y: 50 });
                setSpaceModalOpen(true);
              }}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Bureau</span>
            </button>
          )}

          {/* Upload Floor Plan File */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPlan}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition"
            title="Importer un plan PNG, JPG ou document PDF"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">
              {uploadingPlan ? 'Conversion...' : 'Ajouter Plan (PDF/Image)'}
            </span>
          </button>
        </div>
      </div>

      {/* Mode helper pill */}
      {isEditMode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-amber-500/90 text-slate-950 font-bold text-xs px-4 py-1.5 rounded-full shadow-lg backdrop-blur-md flex items-center space-x-2 animate-bounce">
          <Edit3 className="w-3.5 h-3.5" />
          <span>Glissez les boutons pour les repositionner, ou cliquez sur le plan pour en créer un nouveau</span>
        </div>
      )}

      {/* Main Interactive Map Viewport */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`flex-1 relative overflow-hidden flex items-center justify-center cursor-grab ${
          isPanning ? 'cursor-grabbing' : ''
        }`}
      >
        {/* Transformable Canvas Container */}
        <div
          className="relative transition-transform duration-75 ease-out select-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
          onClick={handlePlanClick}
        >
          {currentFloor?.plan_image_url ? (
            <div className="relative inline-block shadow-2xl rounded-xl overflow-hidden border border-slate-800 bg-white plan-surface">
              <img
                ref={planImageRef}
                src={currentFloor.plan_image_url}
                alt={currentFloor.name}
                draggable={false}
                className="max-w-none max-h-[82vh] object-contain block opacity-95 pointer-events-auto"
              />

              {/* Space Buttons Overlay */}
              {currentSpaces.map((space) => {
                const spaceAssetsCount = assets.filter((a) => a.space_id === space.id).length;
                const isMatched = matchingSpaceIds.has(space.id);
                const isSelected = selectedSpace?.id === space.id;

                return (
                  <div
                    key={space.id}
                    style={{
                      left: `${space.x_percent}%`,
                      top: `${space.y_percent}%`,
                    }}
                    onMouseDown={(e) => {
                      if (isEditMode) {
                        e.stopPropagation();
                        setDraggingSpaceId(space.id);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isEditMode) {
                        setSelectedSpace(space);
                      }
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group transition-all duration-150 ${
                      isEditMode ? 'cursor-move' : 'cursor-pointer hover:scale-115'
                    } ${isSelected ? 'scale-125 z-30' : ''}`}
                  >
                    {/* Pulsing Highlight ring if matching search */}
                    {isMatched && (
                      <span className="absolute -inset-1.5 rounded-xl bg-amber-400/60 animate-ping" />
                    )}

                    {/* Button Badge */}
                    <div
                      className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl shadow-lg border text-white font-bold text-xs transition whitespace-nowrap ${
                        isSelected
                          ? 'ring-4 ring-white shadow-2xl scale-110'
                          : isMatched
                          ? 'ring-3 ring-amber-400 bg-amber-600 border-amber-300'
                          : 'border-white/20'
                      }`}
                      style={{
                        backgroundColor: isMatched ? '#d97706' : space.color || '#10b981',
                      }}
                    >
                      <span className="font-mono tracking-tight">{space.code}</span>

                      {/* Equipment count badge */}
                      {spaceAssetsCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-950/70 text-white text-[10px] font-bold">
                          {spaceAssetsCount}
                        </span>
                      )}
                    </div>

                    {/* Tooltip on hover */}
                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 bg-slate-900 text-slate-100 text-[11px] rounded-lg shadow-xl border border-slate-700 whitespace-nowrap pointer-events-none z-40">
                      <div className="font-bold text-white">{space.name}</div>
                      <div className="text-slate-400">
                        {spaceAssetsCount} équipement{spaceAssetsCount > 1 ? 's' : ''} affecté{spaceAssetsCount > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50 max-w-md">
              <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="font-bold text-slate-200 text-base">Aucun plan d'étage sélectionné</h4>
              <p className="text-xs text-slate-400 mt-1">
                Importez une image ou un fichier PDF pour commencer la cartographie.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition"
              >
                Téléverser un plan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Zoom Controls Bar */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-800 shadow-2xl">
        <button
          onClick={handleZoomOut}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
          title="Zoom Arrière"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="text-xs font-mono font-bold text-slate-300 px-2 min-w-[50px] text-center">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
          title="Zoom Avant"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-800 mx-1" />

        <button
          onClick={handleResetZoom}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
          title="Réinitialiser la vue"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Lateral Space Drawer when a space is selected */}
      <SpaceDrawer
        space={selectedSpace}
        onClose={() => setSelectedSpace(null)}
        onAuditSpace={(sp) => {
          setSelectedSpace(null);
          onAuditSpace(sp);
        }}
        onAddAsset={(spId) => {
          onAddAsset(spId);
        }}
        onMoveAsset={(asset) => {
          onMoveAsset(asset);
        }}
        onEditAsset={(asset) => {
          onEditAsset(asset);
        }}
        onPrintLabel={(item, type) => {
          onPrintLabel(item, type);
        }}
        onEditSpace={(sp) => {
          setSpaceToEdit(sp);
          setSpaceModalOpen(true);
        }}
        onDeleteSpace={async (spId) => {
          if (confirm('Voulez-vous vraiment supprimer cet espace ?')) {
            await deleteSpace(spId);
            setSelectedSpace(null);
          }
        }}
      />

      {/* Space Modal for creating or editing space */}
      <SpaceModal
        isOpen={spaceModalOpen}
        spaceToEdit={spaceToEdit}
        initialCoords={pendingCoords}
        onClose={() => {
          setSpaceModalOpen(false);
          setSpaceToEdit(null);
          setPendingCoords(null);
        }}
      />
    </div>
  );
};
