import React from 'react';
import { 
  X, 
  MapPin, 
  QrCode, 
  Plus, 
  ArrowRightLeft, 
  Printer, 
  Edit3, 
  Trash2, 
  Laptop, 
  Tv, 
  Printer as PrinterIcon, 
  Scan, 
  Server, 
  CheckCircle, 
  Clock, 
  User,
  Hash
} from 'lucide-react';
import { Space, Asset } from '../../types';
import { useInventory } from '../../lib/useInventoryStore';

interface SpaceDrawerProps {
  space: Space | null;
  onClose: () => void;
  onAuditSpace: (space: Space) => void;
  onAddAsset: (spaceId: string) => void;
  onMoveAsset: (asset: Asset) => void;
  onEditAsset: (asset: Asset) => void;
  onPrintLabel: (item: Asset | Space, type: 'asset' | 'space') => void;
  onEditSpace: (space: Space) => void;
  onDeleteSpace: (spaceId: string) => void;
}

export const SpaceDrawer: React.FC<SpaceDrawerProps> = ({
  space,
  onClose,
  onAuditSpace,
  onAddAsset,
  onMoveAsset,
  onEditAsset,
  onPrintLabel,
  onEditSpace,
  onDeleteSpace,
}) => {
  const { assets } = useInventory();

  if (!space) return null;

  const spaceAssets = assets.filter((a) => a.space_id === space.id);

  // Détermination de l'icône par type d'espace
  const getSpaceTypeLabel = (type: Space['type']) => {
    switch (type) {
      case 'cubicule': return 'Cubicule de travail';
      case 'bureau': return 'Bureau fermé';
      case 'reunion': return 'Salle de réunion / conférence';
      case 'informatique': return 'Local TI / Salle serveurs';
      case 'medic': return 'Bureau médical / Soins';
      case 'stock': return 'Réserve & Stockage';
      case 'accueil': return 'Réception & Accueil';
      default: return 'Espace';
    }
  };

  const getAssetIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('laptop') || lower.includes('portable') || lower.includes('thinkpad') || lower.includes('elitebook')) return Laptop;
    if (lower.includes('monitor') || lower.includes('ecran') || lower.includes('écran')) return Tv;
    if (lower.includes('printer') || lower.includes('imprimante') || lower.includes('dymo') || lower.includes('zebra')) return PrinterIcon;
    if (lower.includes('scanner') || lower.includes('fujitsu') || lower.includes('kodak')) return Scan;
    return Server;
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-250">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md shrink-0"
            style={{ backgroundColor: space.color || '#10b981' }}
          >
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-lg text-white">{space.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono font-semibold border border-slate-700">
                {space.code}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {getSpaceTypeLabel(space.type)} • {spaceAssets.length} équipement{spaceAssets.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onPrintLabel(space, 'space')}
            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
            title="Imprimer l'étiquette QR de porte pour ce bureau"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEditSpace(space)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Modifier cet espace"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDeleteSpace(space.id)}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
            title="Supprimer cet espace"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex items-center space-x-2">
        <button
          onClick={() => onAuditSpace(space)}
          className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-2 transition"
        >
          <QrCode className="w-4 h-4" />
          <span>Auditer ce bureau (Scanner)</span>
        </button>

        <button
          onClick={() => onAddAsset(space.id)}
          className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center space-x-1.5 transition"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Ajouter Matériel</span>
        </button>
      </div>

      {/* Equipment List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
          <span>MATÉRIEL AFFECTÉ ({spaceAssets.length})</span>
          <span>TAG / CODE-BARRES</span>
        </div>

        {spaceAssets.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/30">
            <Laptop className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">Aucun équipement dans ce local</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Utilisez le bouton "Ajouter Matériel" ou déplacez du matériel depuis un autre bureau.
            </p>
            <button
              onClick={() => onAddAsset(space.id)}
              className="mt-4 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold rounded-xl border border-slate-700 inline-flex items-center space-x-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Associer un équipement</span>
            </button>
          </div>
        ) : (
          spaceAssets.map((asset) => {
            const Icon = getAssetIcon(asset.name);
            return (
              <div
                key={asset.id}
                className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/80 transition group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-slate-800 text-emerald-400 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-100 flex items-center space-x-1.5">
                        <span>{asset.name}</span>
                        {asset.brand && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
                            {asset.brand}
                          </span>
                        )}
                      </div>

                      {/* Identifiers */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                        {asset.serial_number && (
                          <span className="flex items-center space-x-1">
                            <span className="text-slate-500">S/N:</span>
                            <span className="text-slate-300 font-mono">{asset.serial_number}</span>
                          </span>
                        )}
                        {asset.hostname && (
                          <span className="flex items-center space-x-1">
                            <span className="text-slate-500">Nom PC:</span>
                            <span className="text-emerald-300 font-mono">{asset.hostname}</span>
                          </span>
                        )}
                      </div>

                      {/* User & Rank */}
                      {asset.assigned_user && (
                        <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-slate-300">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span>{asset.assigned_user}</span>
                        </div>
                      )}

                      {/* Last audit or notes */}
                      {asset.last_audited_at && (
                        <div className="flex items-center space-x-1 mt-1 text-[11px] text-emerald-400">
                          <CheckCircle className="w-3 h-3" />
                          <span>Audité le {new Date(asset.last_audited_at).toLocaleDateString('fr-CA')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Asset Tag & Actions */}
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20">
                      {asset.asset_tag}
                    </span>

                    <div className="flex items-center justify-end space-x-1 mt-3">
                      <button
                        onClick={() => onMoveAsset(asset)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                        title="Déplacer vers un autre bureau"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onPrintLabel(asset, 'asset')}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                        title="Imprimer l'étiquette Code 128 / QR"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEditAsset(asset)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                        title="Modifier le matériel"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
