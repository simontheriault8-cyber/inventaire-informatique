import React, { useState, useMemo } from 'react';
import { 
  QrCode, 
  Camera, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  ArrowRightLeft, 
  Check, 
  RotateCcw,
  Volume2,
  Barcode
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useInventory } from '../../lib/useInventoryStore';
import { Space, Asset } from '../../types';
import { useBarcodeScanner } from '../../lib/barcodeUtils';
import { sound } from '../../lib/audio';
import { CameraScannerModal } from './CameraScannerModal';

interface AuditViewProps {
  initialSpace?: Space | null;
}

export const AuditView: React.FC<AuditViewProps> = ({ initialSpace }) => {
  const { spaces, assets, floors, completeAuditSession, moveAsset } = useInventory();

  // Espace actuellement en cours d'audit
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(initialSpace?.id || '');

  // Nom de l'auditeur
  const [auditorName, setAuditorName] = useState('Technicien IT');

  // Scanner caméra modal
  const [cameraOpen, setCameraOpen] = useState(false);

  // Saisie manuelle de code-barres
  const [manualCode, setManualCode] = useState('');

  // Liste des IDs d'équipements scannés durant cette session
  const [scannedAssetIds, setScannedAssetIds] = useState<Set<string>>(new Set());

  // Équipement inattendu scanné qui appartient à une autre pièce
  const [unexpectedAsset, setUnexpectedAsset] = useState<Asset | null>(null);

  // Statut de fin d'audit
  const [auditCompleted, setAuditCompleted] = useState(false);

  const currentSpace = spaces.find((s) => s.id === selectedSpaceId);

  // Équipements théoriquement attendus dans ce local
  const expectedAssets = useMemo(() => {
    if (!selectedSpaceId) return [];
    return assets.filter((a) => a.space_id === selectedSpaceId);
  }, [assets, selectedSpaceId]);

  // Traitement d'un code-barres ou QR code scanné
  const handleProcessScan = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // 1. Vérifier s'il s'agit du QR code d'une porte de bureau ("SPACE:CODE")
    if (cleanCode.startsWith('SPACE:')) {
      const spaceCode = cleanCode.replace('SPACE:', '').trim();
      const targetSpace = spaces.find((s) => s.code.toLowerCase() === spaceCode.toLowerCase());
      if (targetSpace) {
        sound.playSuccess();
        setSelectedSpaceId(targetSpace.id);
        setScannedAssetIds(new Set());
        setUnexpectedAsset(null);
        setAuditCompleted(false);
        return;
      }
    }

    // 2. Recherche de l'équipement par Tag d'inventaire OU Numéro de Série
    const foundAsset = assets.find(
      (a) =>
        a.asset_tag.toLowerCase() === cleanCode.toLowerCase() ||
        (a.serial_number && a.serial_number.toLowerCase() === cleanCode.toLowerCase())
    );

    if (!foundAsset) {
      sound.playError();
      alert(`Code scanné "${cleanCode}" introuvable dans l'inventaire.`);
      return;
    }

    // 3. Vérifier si l'équipement appartient bien à ce local
    if (foundAsset.space_id === selectedSpaceId) {
      sound.playSuccess();
      setScannedAssetIds((prev) => new Set(prev).add(foundAsset.id));
      setUnexpectedAsset(null);
    } else {
      // Alerte : matériel scanné dans le mauvais bureau !
      sound.playWarning();
      setUnexpectedAsset(foundAsset);
    }
  };

  // Écouteur global pour douchette code-barres physique USB/Bluetooth
  useBarcodeScanner(handleProcessScan, !cameraOpen);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleProcessScan(manualCode);
    setManualCode('');
  };

  // Confirmer le transfert de l'élément inattendu dans ce local
  const handleTransferUnexpected = async () => {
    if (!unexpectedAsset || !selectedSpaceId) return;
    await moveAsset(unexpectedAsset.id, selectedSpaceId, 'Audit physique : matériel trouvé dans ce local');
    setScannedAssetIds((prev) => new Set(prev).add(unexpectedAsset.id));
    setUnexpectedAsset(null);
    sound.playSuccess();
  };

  // Valider et enregistrer l'audit complet de la pièce
  const handleFinishAudit = async () => {
    if (!selectedSpaceId) return;

    const items = expectedAssets.map((a) => ({
      asset_id: a.id,
      status: (scannedAssetIds.has(a.id) ? 'conforme' : 'manquant') as 'conforme' | 'manquant',
    }));

    await completeAuditSession(selectedSpaceId, auditorName, items);
    setAuditCompleted(true);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const handleResetAudit = () => {
    setScannedAssetIds(new Set());
    setUnexpectedAsset(null);
    setAuditCompleted(false);
  };

  // Statistiques de la session
  const verifiedCount = expectedAssets.filter((a) => scannedAssetIds.has(a.id)).length;
  const missingCount = expectedAssets.length - verifiedCount;
  const progressPercent = expectedAssets.length > 0 ? Math.round((verifiedCount / expectedAssets.length) * 100) : 100;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <QrCode className="w-6 h-6 text-emerald-400" />
            <span>Audit Physique par Scanner (Code 128 & QR)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Vérification physique du matériel avec détection automatique des équipements conformes, manquants et égarés.
          </p>
        </div>

        {/* Douchette listener indicator */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Barcode className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Douchette USB/Bluetooth : <strong>Active</strong></span>
        </div>
      </div>

      {/* Select Space & Auditor Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            1. Sélectionner le Bureau à Auditer *
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <select
              value={selectedSpaceId}
              onChange={(e) => {
                setSelectedSpaceId(e.target.value);
                handleResetAudit();
              }}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="">-- Choisissez un local ou cubicule --</option>
              {floors.map((floor) => {
                const floorSpaces = spaces.filter((s) => s.floor_id === floor.id);
                return (
                  <optgroup key={floor.id} label={floor.name}>
                    {floorSpaces.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            2. Nom de l'Auditeur / Technicien
          </label>
          <input
            type="text"
            value={auditorName}
            onChange={(e) => setAuditorName(e.target.value)}
            placeholder="Ex: Technicien TI"
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {currentSpace && (
        <>
          {/* Scanner Controls Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            {/* Camera Scan Button */}
            <button
              onClick={() => setCameraOpen(true)}
              className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center space-x-2 transition"
            >
              <Camera className="w-4 h-4" />
              <span>Ouvrir Caméra Scanner</span>
            </button>

            {/* Manual input */}
            <form onSubmit={handleManualSubmit} className="flex items-center space-x-2 flex-1 max-w-md">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Scanner ou taper le code-barres / S/N..."
                className="flex-1 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="submit"
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
              >
                Valider
              </button>
            </form>
          </div>

          {/* Unexpected Asset Alert Banner */}
          {unexpectedAsset && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-300 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold text-sm text-white mb-0.5">
                    Équipement inattendu scanné dans ce local !
                  </div>
                  <p className="text-slate-200">
                    <strong>{unexpectedAsset.name}</strong> (Tag: <span className="font-mono">{unexpectedAsset.asset_tag}</span>) est théoriquement enregistré dans le bureau{' '}
                    <strong>
                      {spaces.find((s) => s.id === unexpectedAsset.space_id)?.code || 'Non assigné'}
                    </strong>.
                  </p>
                </div>
              </div>

              <button
                onClick={handleTransferUnexpected}
                className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 shrink-0"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Transférer dans ce bureau ({currentSpace.code})</span>
              </button>
            </div>
          )}

          {/* Audit Completion Card */}
          {auditCompleted && (
            <div className="p-6 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-300 text-center space-y-2 shadow-xl animate-in zoom-in-95">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="font-bold text-lg text-white">Audit de {currentSpace.name} Validé !</h3>
              <p className="text-xs text-slate-300">
                {verifiedCount} équipement{verifiedCount > 1 ? 's' : ''} conforme{verifiedCount > 1 ? 's' : ''} vérifié{verifiedCount > 1 ? 's' : ''}. Horodatage enregistré avec succès dans Supabase.
              </p>
              <button
                onClick={handleResetAudit}
                className="mt-3 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 inline-flex items-center space-x-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Refaire un audit</span>
              </button>
            </div>
          )}

          {/* KPI Checklist Progress */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <div className="flex items-center space-x-3">
                <span className="text-white">Progression de l'audit :</span>
                <span className="text-emerald-400">{verifiedCount} vérifié{verifiedCount > 1 ? 's' : ''}</span>
                <span className="text-rose-400">{missingCount} manquant{missingCount > 1 ? 's' : ''}</span>
              </div>
              <span className="font-mono text-sm text-white">{progressPercent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Checklist of Expected Assets */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white">
                  Équipements attendus dans {currentSpace.name} ({expectedAssets.length})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Scannez chaque étiquette avec la caméra ou la douchette pour valider.
                </p>
              </div>

              {!auditCompleted && (
                <button
                  onClick={handleFinishAudit}
                  disabled={expectedAssets.length === 0}
                  className="py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Terminer et Enregistrer l'Audit</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-800/60">
              {expectedAssets.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Aucun matériel n'est assigné à ce local pour le moment.
                </div>
              ) : (
                expectedAssets.map((asset) => {
                  const isScanned = scannedAssetIds.has(asset.id);
                  return (
                    <div
                      key={asset.id}
                      className={`p-4 flex items-center justify-between transition ${
                        isScanned ? 'bg-emerald-500/10' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isScanned
                              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          {isScanned ? <Check className="w-5 h-5 stroke-[3]" /> : '—'}
                        </div>

                        <div>
                          <div className="font-bold text-xs text-white flex items-center space-x-2">
                            <span>{asset.name}</span>
                            <span className="font-mono text-emerald-400">{asset.asset_tag}</span>
                          </div>

                          <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-0.5">
                            {asset.serial_number && <span>S/N: {asset.serial_number}</span>}
                            {asset.hostname && <span>PC: {asset.hostname}</span>}
                            {asset.assigned_user && <span>{asset.assigned_user}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {isScanned ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Vérifié présent</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-[10px] border border-slate-700">
                            <span>En attente de scan</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onScan={(code) => {
          handleProcessScan(code);
        }}
      />
    </div>
  );
};
