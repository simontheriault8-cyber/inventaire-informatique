import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Filter, 
  ArrowRightLeft, 
  Printer, 
  Edit3, 
  Trash2, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  History, 
  User, 
  Laptop, 
  Tv, 
  Scan,
  Printer as PrinterIcon,
  Server
} from 'lucide-react';
import { useInventory } from '../../lib/useInventoryStore';
import { Asset, Space } from '../../types';
import { AssetModal } from './AssetModal';
import { MoveAssetModal } from './MoveAssetModal';

interface AssetManagementProps {
  onOpenLabelPrinter: (items: Asset[]) => void;
}

export const AssetManagement: React.FC<AssetManagementProps> = ({ onOpenLabelPrinter }) => {
  const { assets, spaces, movements, deleteAsset } = useInventory();

  // Navigation tab: 'catalog' | 'movements'
  const [activeTab, setActiveTab] = useState<'catalog' | 'movements'>('catalog');

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [spaceFilter, setSpaceFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Modals state
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);
  const [assetToMove, setAssetToMove] = useState<Asset | null>(null);

  // Selection pour impression groupée
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((a) => {
      if (a.department) set.add(a.department);
    });
    return Array.from(set).sort();
  }, [assets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matches =
          asset.name.toLowerCase().includes(q) ||
          asset.asset_tag.toLowerCase().includes(q) ||
          (asset.serial_number && asset.serial_number.toLowerCase().includes(q)) ||
          (asset.hostname && asset.hostname.toLowerCase().includes(q)) ||
          (asset.assigned_user && asset.assigned_user.toLowerCase().includes(q)) ||
          (asset.brand && asset.brand.toLowerCase().includes(q)) ||
          (asset.nsn && asset.nsn.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Status
      if (statusFilter !== 'all' && asset.status !== statusFilter) return false;

      // Space
      if (spaceFilter !== 'all') {
        if (spaceFilter === 'unassigned') {
          if (asset.space_id) return false;
        } else if (asset.space_id !== spaceFilter) {
          return false;
        }
      }

      // Department
      if (departmentFilter !== 'all' && asset.department !== departmentFilter) return false;

      return true;
    });
  }, [assets, search, statusFilter, spaceFilter, departmentFilter]);

  // Statistics
  const totalValue = useMemo(() => {
    return assets.reduce((sum, a) => sum + (a.purchase_price || 0), 0);
  }, [assets]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedAssetIds(new Set(filteredAssets.map((a) => a.id)));
    } else {
      setSelectedAssetIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedAssetIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAssetIds(next);
  };

  const handlePrintSelected = () => {
    const selected = assets.filter((a) => selectedAssetIds.has(a.id));
    if (selected.length > 0) {
      onOpenLabelPrinter(selected);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{assets.length}</div>
            <div className="text-xs text-slate-400 font-medium">Total Équipements</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {assets.filter((a) => a.status === 'en_service').length}
            </div>
            <div className="text-xs text-slate-400 font-medium">En Service Actif</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {assets.filter((a) => !a.space_id || a.status === 'en_stock').length}
            </div>
            <div className="text-xs text-slate-400 font-medium">En Stock / Réserve</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {totalValue.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-slate-400 font-medium">Valeur d'Inventaire</div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Navigation Bar inside card */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-950/40">
          {/* Sub-tabs */}
          <div className="flex space-x-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'catalog'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Catalogue ({assets.length})
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeTab === 'movements'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historique Transferts ({movements.length})</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {selectedAssetIds.size > 0 && (
              <button
                onClick={handlePrintSelected}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer ({selectedAssetIds.size})</span>
              </button>
            )}

            <button
              onClick={() => {
                setAssetToEdit(null);
                setIsAssetModalOpen(true);
              }}
              className="py-2 px-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Matériel</span>
            </button>
          </div>
        </div>

        {activeTab === 'catalog' ? (
          <>
            {/* Filter Toolbar */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="flex-1 min-w-[240px] relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par nom, tag, numéro de série, hostname, utilisateur..."
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="en_service">En service</option>
                <option value="en_stock">En stock</option>
                <option value="en_reparation">En réparation</option>
                <option value="reforme">Réformé</option>
              </select>

              {/* Space filter */}
              <select
                value={spaceFilter}
                onChange={(e) => setSpaceFilter(e.target.value)}
                className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 max-w-[200px]"
              >
                <option value="all">Tous les bureaux</option>
                <option value="unassigned">Non assigné</option>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>

              {/* Department filter */}
              {departments.length > 0 && (
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 max-w-[180px]"
                >
                  <option value="all">Toutes les sections</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={
                          filteredAssets.length > 0 &&
                          selectedAssetIds.size === filteredAssets.length
                        }
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                      />
                    </th>
                    <th className="py-3 px-4">Tag Inventaire</th>
                    <th className="py-3 px-4">Produit & S/N</th>
                    <th className="py-3 px-4">Nom PC (Hostname)</th>
                    <th className="py-3 px-4">Localisation (Bureau)</th>
                    <th className="py-3 px-4">Utilisateur & Grade</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4">Prix</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500">
                        Aucun équipement trouvé avec ces filtres.
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset) => {
                      const space = spaces.find((s) => s.id === asset.space_id);
                      const isSelected = selectedAssetIds.has(asset.id);

                      return (
                        <tr
                          key={asset.id}
                          className={`hover:bg-slate-800/40 transition ${
                            isSelected ? 'bg-emerald-500/5' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(asset.id)}
                              className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                            {asset.asset_tag}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{asset.name}</div>
                            {asset.serial_number && (
                              <div className="text-[11px] font-mono text-slate-400">
                                S/N: {asset.serial_number}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {asset.hostname || <span className="text-slate-600">—</span>}
                          </td>
                          <td className="py-3 px-4">
                            {space ? (
                              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 font-medium text-slate-200">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: space.color || '#10b981' }}
                                />
                                <span>{space.code}</span>
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">Non assigné</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {asset.assigned_user ? (
                              <div className="text-slate-200 flex items-center space-x-1">
                                <User className="w-3.5 h-3.5 text-slate-500" />
                                <span>{asset.assigned_user}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {asset.department || <span className="text-slate-600">—</span>}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {asset.purchase_price
                              ? asset.purchase_price.toLocaleString('fr-CA', {
                                  style: 'currency',
                                  currency: 'CAD',
                                })
                              : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                asset.status === 'en_service'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : asset.status === 'en_stock'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : asset.status === 'en_reparation'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {asset.status === 'en_service'
                                ? 'En service'
                                : asset.status === 'en_stock'
                                ? 'En stock'
                                : asset.status === 'en_reparation'
                                ? 'En panne'
                                : 'Réformé'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => setAssetToMove(asset)}
                                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                                title="Déplacer de bureau"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onOpenLabelPrinter([asset])}
                                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                                title="Imprimer étiquette"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setAssetToEdit(asset);
                                  setIsAssetModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                title="Modifier"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(`Supprimer le matériel "${asset.name}" (${asset.asset_tag}) ?`)) {
                                    await deleteAsset(asset.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Historique des mouvements */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Matériel</th>
                  <th className="py-3 px-4">Ancien Local</th>
                  <th className="py-3 px-4">Nouveau Local</th>
                  <th className="py-3 px-4">Déplacé par</th>
                  <th className="py-3 px-4">Motif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Aucun historique de déplacement enregistré pour le moment.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {m.created_at ? new Date(m.created_at).toLocaleString('fr-CA') : '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {m.asset_name || 'Équipement'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {m.from_space_name || 'Non assigné'}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400">
                        {m.to_space_name || 'Non assigné'}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{m.moved_by || 'Système'}</td>
                      <td className="py-3 px-4 text-slate-400 italic">{m.reason || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Asset Modal */}
      <AssetModal
        isOpen={isAssetModalOpen}
        assetToEdit={assetToEdit}
        onClose={() => {
          setIsAssetModalOpen(false);
          setAssetToEdit(null);
        }}
      />

      {/* Move Asset Modal */}
      <MoveAssetModal
        isOpen={!!assetToMove}
        asset={assetToMove}
        onClose={() => setAssetToMove(null)}
      />
    </div>
  );
};
