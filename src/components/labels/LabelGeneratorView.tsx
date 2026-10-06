import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  QrCode, 
  Barcode, 
  Layers, 
  Settings2, 
  CheckSquare, 
  Square, 
  DoorClosed,
  Laptop
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { useInventory } from '../../lib/useInventoryStore';
import { Asset, Space } from '../../types';

interface LabelGeneratorViewProps {
  initialAssets?: Asset[];
}

export const LabelGeneratorView: React.FC<LabelGeneratorViewProps> = ({ initialAssets }) => {
  const { assets, spaces } = useInventory();

  // Mode d'étiquette : 'assets' (matériel) ou 'doors' (portes de bureaux)
  const [targetType, setTargetType] = useState<'assets' | 'doors'>('assets');

  // Format du code : 'code128' | 'qrcode' | 'both'
  const [codeFormat, setCodeFormat] = useState<'code128' | 'qrcode' | 'both'>('both');

  // Mise en page : 'single' (étiqueteuse Dymo/Zebra) | 'sheet' (planche A4) | 'placard' (affiche porte)
  const [layoutMode, setLayoutMode] = useState<'single' | 'sheet' | 'placard'>('sheet');

  // Sélection des items à imprimer
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    new Set(initialAssets?.map((a) => a.id) || assets.slice(0, 12).map((a) => a.id))
  );

  const [selectedSpaceIds, setSelectedSpaceIds] = useState<Set<string>>(
    new Set(spaces.slice(0, 8).map((s) => s.id))
  );

  // Génération des codes 128 dans le DOM
  useEffect(() => {
    if (codeFormat === 'qrcode') return;

    // Timeout pour attendre le rendu du DOM
    const timer = setTimeout(() => {
      document.querySelectorAll('.barcode-svg-target').forEach((svg) => {
        const value = svg.getAttribute('data-barcode-val');
        if (value) {
          try {
            JsBarcode(svg, value, {
              format: 'CODE128',
              lineColor: '#000000',
              width: 1.4,
              height: 38,
              displayValue: true,
              fontSize: 11,
              font: 'monospace',
              margin: 4,
            });
          } catch (e) {
            // Ignorer si code invalide
          }
        }
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [codeFormat, selectedAssetIds, selectedSpaceIds, targetType, layoutMode]);

  const handlePrint = () => {
    window.print();
  };

  const handleToggleAsset = (id: string) => {
    const next = new Set(selectedAssetIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAssetIds(next);
  };

  const handleToggleSpace = (id: string) => {
    const next = new Set(selectedSpaceIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSpaceIds(next);
  };

  const handleSelectAllAssets = () => {
    if (selectedAssetIds.size === assets.length) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(assets.map((a) => a.id)));
    }
  };

  const handleSelectAllSpaces = () => {
    if (selectedSpaceIds.size === spaces.length) {
      setSelectedSpaceIds(new Set());
    } else {
      setSelectedSpaceIds(new Set(spaces.map((s) => s.id)));
    }
  };

  const itemsToPrintAssets = assets.filter((a) => selectedAssetIds.has(a.id));
  const itemsToPrintSpaces = spaces.filter((s) => selectedSpaceIds.has(s.id));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Title & Print button (hidden during print) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Printer className="w-6 h-6 text-emerald-400" />
            <span>Générateur & Impression d'Étiquettes (Code 128 / QR)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Imprimez des étiquettes individuelles (Dymo/Brother) ou des planches A4 pour votre parc et vos portes.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition"
        >
          <Printer className="w-4 h-4" />
          <span>Lancer l'Impression ({targetType === 'assets' ? itemsToPrintAssets.length : itemsToPrintSpaces.length})</span>
        </button>
      </div>

      {/* Configuration Controls Card (hidden during print) */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Target type */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              1. Type d'étiquettes
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setTargetType('assets')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                  targetType === 'assets'
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Matériel IT</span>
              </button>

              <button
                onClick={() => setTargetType('doors')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                  targetType === 'doors'
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <DoorClosed className="w-3.5 h-3.5" />
                <span>Portes de Bureaux</span>
              </button>
            </div>
          </div>

          {/* Code format */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              2. Format du code
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setCodeFormat('code128')}
                className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1 transition ${
                  codeFormat === 'code128'
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <Barcode className="w-3.5 h-3.5" />
                <span>Code 128</span>
              </button>
              <button
                onClick={() => setCodeFormat('qrcode')}
                className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1 transition ${
                  codeFormat === 'qrcode'
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code</span>
              </button>
              <button
                onClick={() => setCodeFormat('both')}
                className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1 transition ${
                  codeFormat === 'both'
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <span>Les Deux</span>
              </button>
            </div>
          </div>

          {/* Layout mode */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              3. Format d'impression
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setLayoutMode('sheet')}
                className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-semibold transition ${
                  layoutMode === 'sheet'
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                Planche A4 (Grille)
              </button>
              <button
                onClick={() => setLayoutMode('single')}
                className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-semibold transition ${
                  layoutMode === 'single'
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                Étiquette Seule
              </button>
            </div>
          </div>
        </div>

        {/* Selection items toggle */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <button
              onClick={targetType === 'assets' ? handleSelectAllAssets : handleSelectAllSpaces}
              className="text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <span>Tout sélectionner / Désélectionner</span>
            </button>
          </div>
          <span>
            {targetType === 'assets'
              ? `${selectedAssetIds.size} / ${assets.length} matériels sélectionnés`
              : `${selectedSpaceIds.size} / ${spaces.length} locaux sélectionnés`}
          </span>
        </div>
      </div>

      {/* PRINTABLE AREA */}
      <div id="print-section" className="bg-white text-slate-900 rounded-2xl p-6 shadow-2xl">
        {targetType === 'assets' ? (
          /* Matériel Labels */
          <div
            className={`grid gap-4 ${
              layoutMode === 'sheet'
                ? 'grid-cols-2 md:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2'
            }`}
          >
            {itemsToPrintAssets.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs italic">
                Aucun équipement sélectionné pour l'impression.
              </div>
            ) : (
              itemsToPrintAssets.map((asset) => {
                const space = spaces.find((s) => s.id === asset.space_id);
                return (
                  <div
                    key={asset.id}
                    className="border-2 border-slate-900 rounded-xl p-3 bg-white flex flex-col justify-between shadow-sm relative overflow-hidden"
                    style={{ minHeight: '140px' }}
                  >
                    {/* Header of label */}
                    <div className="border-b border-slate-300 pb-1.5 mb-1.5 flex items-center justify-between">
                      <div className="font-extrabold text-[11px] uppercase tracking-wider text-slate-900 truncate">
                        {asset.name}
                      </div>
                      <div className="font-mono font-bold text-xs bg-slate-900 text-white px-1.5 py-0.2 rounded">
                        {space ? space.code : 'STOCK'}
                      </div>
                    </div>

                    {/* Codes Display */}
                    <div className="flex items-center justify-around py-1">
                      {/* Code 128 */}
                      {(codeFormat === 'code128' || codeFormat === 'both') && (
                        <div className="flex flex-col items-center">
                          <svg
                            className="barcode-svg-target"
                            data-barcode-val={asset.asset_tag}
                          />
                        </div>
                      )}

                      {/* QR Code */}
                      {(codeFormat === 'qrcode' || codeFormat === 'both') && (
                        <div className="p-1 border border-slate-200 rounded bg-white">
                          <QRCodeSVG
                            value={asset.asset_tag}
                            size={codeFormat === 'both' ? 56 : 72}
                            level="M"
                          />
                        </div>
                      )}
                    </div>

                    {/* Metadata Footer */}
                    <div className="border-t border-slate-200 pt-1 text-[10px] text-slate-600 flex items-center justify-between font-mono">
                      <span>TAG: <strong>{asset.asset_tag}</strong></span>
                      {asset.serial_number && <span>S/N: {asset.serial_number}</span>}
                      {asset.assigned_user && <span className="font-sans truncate max-w-[80px]">{asset.assigned_user}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Door Placard / Badges */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {itemsToPrintSpaces.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs italic">
                Aucun local sélectionné.
              </div>
            ) : (
              itemsToPrintSpaces.map((space) => {
                const spaceAssetsCount = assets.filter((a) => a.space_id === space.id).length;
                return (
                  <div
                    key={space.id}
                    className="border-4 border-slate-950 rounded-2xl p-5 bg-white flex flex-col items-center text-center justify-between shadow-md"
                    style={{ minHeight: '220px' }}
                  >
                    <div className="w-full border-b-2 border-slate-900 pb-2 mb-3">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Bureau & Inventaire IT
                      </div>
                      <div className="text-2xl font-black text-slate-950 tracking-tight">
                        {space.name}
                      </div>
                      <div className="font-mono text-sm font-bold text-emerald-700 mt-0.5">
                        Local {space.code}
                      </div>
                    </div>

                    {/* QR Code de porte format SPACE:CODE */}
                    <div className="p-2 border-2 border-slate-900 rounded-xl bg-white shadow-inner my-2">
                      <QRCodeSVG
                        value={`SPACE:${space.code}`}
                        size={110}
                        level="H"
                      />
                    </div>

                    <div className="text-[10px] text-slate-500 mt-2 font-medium">
                      Scanner à la porte pour ouvrir et auditer ce bureau • {spaceAssetsCount} équipement{spaceAssetsCount > 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
