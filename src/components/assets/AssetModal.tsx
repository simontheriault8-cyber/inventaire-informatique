import React, { useState, useEffect } from 'react';
import { X, Tag, Laptop, Hash, User, Building, DollarSign, FileText, Sparkles } from 'lucide-react';
import { Asset, AssetStatus } from '../../types';
import { useInventory } from '../../lib/useInventoryStore';

interface AssetModalProps {
  isOpen: boolean;
  assetToEdit?: Asset | null;
  initialSpaceId?: string;
  onClose: () => void;
}

export const AssetModal: React.FC<AssetModalProps> = ({
  isOpen,
  assetToEdit,
  initialSpaceId,
  onClose,
}) => {
  const { spaces, categories, saveAsset } = useInventory();

  const [name, setName] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [hostname, setHostname] = useState('');
  const [nsn, setNsn] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [department, setDepartment] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [assignedUser, setAssignedUser] = useState('');
  const [userGrade, setUserGrade] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [status, setStatus] = useState<AssetStatus>('en_service');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (assetToEdit) {
      setName(assetToEdit.name || '');
      setAssetTag(assetToEdit.asset_tag || '');
      setSerialNumber(assetToEdit.serial_number || '');
      setHostname(assetToEdit.hostname || '');
      setNsn(assetToEdit.nsn || '');
      setCategoryId(assetToEdit.category_id || '');
      setBrand(assetToEdit.brand || '');
      setModel(assetToEdit.model || '');
      setDepartment(assetToEdit.department || '');
      setSpaceId(assetToEdit.space_id || '');
      setAssignedUser(assetToEdit.assigned_user || '');
      setUserGrade(assetToEdit.user_grade || '');
      setPurchasePrice(assetToEdit.purchase_price !== undefined ? String(assetToEdit.purchase_price) : '');
      setStatus(assetToEdit.status || 'en_service');
      setNotes(assetToEdit.notes || '');
    } else {
      setName('');
      setAssetTag(`TAG-${Math.floor(100000 + Math.random() * 900000)}`);
      setSerialNumber('');
      setHostname('');
      setNsn('');
      setCategoryId(categories[0]?.id || '');
      setBrand('');
      setModel('');
      setDepartment('');
      setSpaceId(initialSpaceId || '');
      setAssignedUser('');
      setUserGrade('');
      setPurchasePrice('');
      setStatus('en_service');
      setNotes('');
    }
  }, [assetToEdit, initialSpaceId, isOpen, categories]);

  if (!isOpen) return null;

  const generateRandomTag = () => {
    setAssetTag(`ARM${Math.floor(10000000 + Math.random() * 90000000)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !assetTag) return;
    setLoading(true);

    try {
      await saveAsset({
        id: assetToEdit?.id,
        name,
        asset_tag: assetTag.trim(),
        serial_number: serialNumber.trim() || undefined,
        hostname: hostname.trim() || undefined,
        nsn: nsn.trim() || undefined,
        category_id: categoryId || undefined,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        department: department.trim() || undefined,
        space_id: spaceId || undefined,
        assigned_user: assignedUser.trim() || undefined,
        user_grade: userGrade.trim() || undefined,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
        status,
        notes: notes.trim() || undefined,
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {assetToEdit ? 'Modifier la Fiche Matériel' : 'Ajouter un Nouvel Équipement'}
              </h3>
              <p className="text-xs text-slate-400">Catalogue d'inventaire informatique</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nom */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nom du Produit / Équipement *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Laptop Dell Latit.5520, Monitor Philips 23"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Asset Tag */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Numéro d'Inventaire / Code-barres *</span>
                <button
                  type="button"
                  onClick={generateRandomTag}
                  className="text-[10px] text-emerald-400 hover:underline flex items-center space-x-0.5"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Générer Tag</span>
                </button>
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                  placeholder="Ex: ARM0022312616 ou TAG-1049"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
              </div>
            </div>

            {/* Numéro de Série */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Numéro de Série Constructeur (S/N)
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Ex: 4BBWY93, UHBA1601005991"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Nom Ordinateur (Hostname) */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nom Réseau PC (Hostname)
              </label>
              <input
                type="text"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                placeholder="Ex: 2VA-DMV-LRCT096"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* NSN */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Numéro de Nomenclature (NSN)
              </label>
              <input
                type="text"
                value={nsn}
                onChange={(e) => setNsn(e.target.value)}
                placeholder="Ex: 7010-20-013-2691"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Localisation / Bureau */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Bureau / Local Affecté
              </label>
              <select
                value={spaceId}
                onChange={(e) => setSpaceId(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Non assigné / En stock --</option>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Statut */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Statut du Matériel
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AssetStatus)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="en_service">🟢 En service</option>
                <option value="en_stock">🔵 En réserve / Stock</option>
                <option value="en_reparation">🟠 En maintenance / Réparation</option>
                <option value="reforme">🔴 Réformé / Déclassé</option>
              </select>
            </div>

            {/* Marque */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Marque Constructeur
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex: Dell, Lenovo, HP, Philips, Canon..."
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Section / Département */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Section / Département
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Ex: Salle de Test, CCM, Medic, Traitement..."
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Utilisateur Assigné */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Utilisateur Affecté (Nom)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={assignedUser}
                  onChange={(e) => setAssignedUser(e.target.value)}
                  placeholder="Ex: Gagnon.sp, Charette.jbp"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Grade militaire */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Grade / Titre
              </label>
              <input
                type="text"
                value={userGrade}
                onChange={(e) => setUserGrade(e.target.value)}
                placeholder="Ex: Sgt, Capt, Cpl, Civ, Maj..."
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Prix d'achat */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Prix d'Inventaire ($ CAD)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="number"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="Ex: 1120.55"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Commentaires & Notes d'audit
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Vérifié le 2025-08-19, écran à la maison, power supply manquant..."
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex space-x-2">
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
              {loading ? 'Enregistrement...' : assetToEdit ? 'Mettre à jour' : 'Ajouter au catalogue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
