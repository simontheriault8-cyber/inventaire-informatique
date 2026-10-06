import React, { useState } from 'react';
import { X, ArrowRightLeft, MapPin, Building } from 'lucide-react';
import { Asset } from '../../types';
import { useInventory } from '../../lib/useInventoryStore';

interface MoveAssetModalProps {
  isOpen: boolean;
  asset: Asset | null;
  onClose: () => void;
}

export const MoveAssetModal: React.FC<MoveAssetModalProps> = ({
  isOpen,
  asset,
  onClose,
}) => {
  const { spaces, floors, moveAsset } = useInventory();
  const [targetSpaceId, setTargetSpaceId] = useState('');
  const [reason, setReason] = useState('Changement d’affectation');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !asset) return null;

  const currentSpace = spaces.find((s) => s.id === asset.space_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSpaceId) return;
    setLoading(true);

    try {
      await moveAsset(asset.id, targetSpaceId, reason);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Déplacer un Équipement</h3>
              <p className="text-xs text-slate-400">Transfert et traçabilité des mouvements</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Asset Summary */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="text-xs font-bold text-white">{asset.name}</div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-emerald-400">{asset.asset_tag}</span>
              <span>Emplacement actuel : <strong className="text-white">{currentSpace ? currentSpace.code : 'Non assigné'}</strong></span>
            </div>
          </div>

          {/* Destination */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nouvel Emplacement / Bureau de Destination *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <select
                required
                value={targetSpaceId}
                onChange={(e) => setTargetSpaceId(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Choisir le bureau de destination --</option>
                {floors.map((floor) => {
                  const floorSpaces = spaces.filter((s) => s.floor_id === floor.id);
                  return (
                    <optgroup key={floor.id} label={floor.name}>
                      {floorSpaces.map((s) => (
                        <option key={s.id} value={s.id} disabled={s.id === asset.space_id}>
                          {s.code} - {s.name} {s.id === asset.space_id ? '(Actuel)' : ''}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Motif du Déplacement
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Déménagement bureau, Réattribution, Maintenance..."
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !targetSpaceId}
              className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Déplacement...' : 'Confirmer le transfert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
