import React, { useState, useEffect } from 'react';
import { X, MapPin, Tag, Palette } from 'lucide-react';
import { Space, SpaceType } from '../../types';
import { useInventory } from '../../lib/useInventoryStore';

interface SpaceModalProps {
  isOpen: boolean;
  spaceToEdit?: Space | null;
  onClose: () => void;
  initialCoords?: { x: number; y: number } | null;
}

const SPACE_TYPES: Array<{ type: SpaceType; label: string; defaultColor: string }> = [
  { type: 'bureau', label: '🏢 Bureau fermé', defaultColor: '#10b981' },
  { type: 'cubicule', label: '🗄️ Cubicule', defaultColor: '#06b6d4' },
  { type: 'reunion', label: '👥 Salle de réunion / Conférence', defaultColor: '#8b5cf6' },
  { type: 'informatique', label: '🖥️ Salle Serveurs / Local TI', defaultColor: '#3b82f6' },
  { type: 'medic', label: '🩺 Médical & Soins', defaultColor: '#ec4899' },
  { type: 'accueil', label: '🛎️ Réception & Accueil', defaultColor: '#14b8a6' },
  { type: 'stock', label: '📦 Réserve & Entreposage', defaultColor: '#64748b' },
];

export const SpaceModal: React.FC<SpaceModalProps> = ({
  isOpen,
  spaceToEdit,
  onClose,
  initialCoords,
}) => {
  const { currentFloor, saveSpace } = useInventory();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<SpaceType>('bureau');
  const [color, setColor] = useState('#10b981');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (spaceToEdit) {
      setName(spaceToEdit.name);
      setCode(spaceToEdit.code);
      setType(spaceToEdit.type);
      setColor(spaceToEdit.color || '#10b981');
    } else {
      setName('');
      setCode('');
      setType('bureau');
      setColor('#10b981');
    }
  }, [spaceToEdit, isOpen]);

  if (!isOpen) return null;

  const handleTypeChange = (selectedType: SpaceType) => {
    setType(selectedType);
    const found = SPACE_TYPES.find((t) => t.type === selectedType);
    if (found) setColor(found.defaultColor);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;
    setLoading(true);

    try {
      await saveSpace({
        id: spaceToEdit?.id,
        name,
        code,
        type,
        color,
        floor_id: spaceToEdit?.floor_id || currentFloor?.id,
        x_percent: spaceToEdit ? spaceToEdit.x_percent : initialCoords?.x ?? 50,
        y_percent: spaceToEdit ? spaceToEdit.y_percent : initialCoords?.y ?? 50,
      });
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
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {spaceToEdit ? 'Modifier l’Espace' : 'Ajouter un Nouvel Espace'}
              </h3>
              <p className="text-xs text-slate-400">Position sur {currentFloor?.name || 'le plan'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Code du Local / Numéro de Bureau *
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (!name || name.startsWith('Bureau ') || name.startsWith('Cubicule ')) {
                    setName(type === 'cubicule' ? `Cubicule ${e.target.value}` : `Bureau ${e.target.value}`);
                  }
                }}
                placeholder="Ex: 120-25 ou 1-05"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nom / Libellé de l’Espace *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Bureau 120-25 (Salle Informatique)"
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Type d'Espace
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SPACE_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => handleTypeChange(t.type)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-medium transition flex items-center space-x-2 ${
                    type === t.type
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
              <span>Couleur du Bouton</span>
              <div className="flex items-center space-x-1.5">
                {['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#64748b'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-4 h-4 rounded-full transition ${color === c ? 'ring-2 ring-white scale-110' : 'opacity-70'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </label>
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
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : spaceToEdit ? 'Enregistrer' : 'Créer l’Espace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
