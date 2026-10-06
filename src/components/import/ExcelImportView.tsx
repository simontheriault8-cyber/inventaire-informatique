import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Database,
  Layers,
  MapPin
} from 'lucide-react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { useInventory } from '../../lib/useInventoryStore';

export const ExcelImportView: React.FC = () => {
  const { importBatch, seedOfficialData, assets, spaces } = useInventory();

  const [loading, setLoading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [autoCreateSpaces, setAutoCreateSpaces] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1-clic pour charger les 497 équipements réels fournis
  const handleSeedOfficial = async () => {
    if (confirm('Voulez-vous charger l\'inventaire officiel DA AOLF & AOLE (497 matériels et 54 bureaux pré-cartographiés) ?')) {
      setLoading(true);
      setErrorMsg(null);
      try {
        await seedOfficialData();
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setSuccessCount(497);
      } catch (e: any) {
        setErrorMsg(e?.message || 'Erreur lors du chargement initial');
      } finally {
        setLoading(false);
      }
    }
  };

  // Télécharger le modèle Excel pré-formaté
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Nom du produit': 'Laptop Dell Latitude 5520',
        'numéro d\'inventaire': 'ARM0022312616',
        'numéro de série': '4BBWY93',
        'Nom de l\'ordinateur': '2VA-DMV-LRCT096',
        'NSN': '7010-20-013-2691',
        'LOCAL': '120-25',
        'SECTION': 'Salle Informatique',
        'NOM': 'Gagnon.sp',
        'GRADE': 'Sgt',
        'PRIX': 1120.55,
        'Actions': 'En service régulier'
      },
      {
        'Nom du produit': 'Monitor Philips 23',
        'numéro d\'inventaire': 'TAG-0042',
        'numéro de série': 'UHBA1601005991',
        'Nom de l\'ordinateur': '',
        'NSN': '7025-20-001-3162',
        'LOCAL': '1-05',
        'SECTION': 'Traitement',
        'NOM': 'Charette.jbp',
        'GRADE': 'Capt',
        'PRIX': 775.26,
        'Actions': 'Vérifié'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventaire');
    XLSX.writeFile(wb, 'modele_import_inventaire_it.xlsx');
  };

  // Parser un fichier Excel ou CSV
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessCount(null);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { raw: false }) as any[];

        if (data.length === 0) {
          setErrorMsg('Le fichier ne contient aucune ligne valide.');
          return;
        }

        // Normalisation des colonnes
        const parsed = data.map((row) => normalizeRow(row));
        setPreviewRows(parsed);
      } catch (err: any) {
        setErrorMsg('Format de fichier non reconnu : ' + err.message);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Télécharger depuis Google Sheet URL (format export CSV)
  const handleFetchGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessCount(null);

    try {
      // Transformation de l'URL Google Sheet en URL d'exportation CSV si nécessaire
      let csvUrl = googleSheetUrl.trim();
      if (csvUrl.includes('docs.google.com/spreadsheets/d/')) {
        const match = csvUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
        }
      }

      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error('Impossible d\'accéder à la feuille Google Sheet. Assurez-vous qu\'elle est partagée publiquement.');
      const csvText = await res.text();

      const wb = XLSX.read(csvText, { type: 'string' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { raw: false }) as any[];

      const parsed = data.map((row) => normalizeRow(row));
      setPreviewRows(parsed);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la lecture du Google Sheet');
    } finally {
      setLoading(false);
    }
  };

  function normalizeRow(row: any) {
    const keys = Object.keys(row);
    const getVal = (targetNames: string[]) => {
      for (const k of keys) {
        const cleanK = k.toLowerCase().trim();
        for (const t of targetNames) {
          if (cleanK === t.toLowerCase() || cleanK.includes(t.toLowerCase())) {
            return row[k];
          }
        }
      }
      return undefined;
    };

    const name = getVal(['nom du produit', 'description', 'nom']) || 'Équipement sans nom';
    const tag = getVal(['numéro d\'inventaire', 'numero d\'inventaire', 'asset tag', 'tag', 'inventaire']);
    const serial = getVal(['numéro de série', 'numero de serie', 'serial', 'ns #', 's/n']);
    const hostname = getVal(['nom de l\'ordinateur', 'nom pc', 'hostname']);
    const nsn = getVal(['nsn', 'nomenclature']);
    const local = getVal(['local', 'bureau', 'cubicule', 'salle', 'location']);
    const person = getVal(['nom', 'personne', 'utilisateur', 'employe']);
    const grade = getVal(['grade', 'titre', 'rang']);
    const department = getVal(['section', 'departement', 'service']);
    const priceRaw = getVal(['prix', 'valeur', 'price']);
    const notes = getVal(['actions', 'commentaires', 'remarques', 'notes']);

    const cleanPrice = priceRaw ? parseFloat(String(priceRaw).replace(/[^\d.]/g, '')) : undefined;

    return {
      name,
      asset_tag: tag || serial || `TAG-${Math.floor(100000 + Math.random() * 900000)}`,
      serial_number: serial,
      hostname,
      nsn,
      local_code: local,
      department,
      assigned_user: person ? `${person}${grade ? ` (${grade})` : ''}` : undefined,
      user_grade: grade,
      purchase_price: cleanPrice,
      notes,
    };
  }

  // Valider et importer les lignes prévisualisées
  const handleExecuteImport = async () => {
    if (previewRows.length === 0) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await importBatch(previewRows, autoCreateSpaces);
      setSuccessCount(res.importedCount);
      confetti({ particleCount: 80, spread: 60 });
      setPreviewRows([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          <span>Importation de l'Inventaire (Excel & Google Sheets)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Peuplez votre base de données Supabase à partir d'un fichier existant ou chargez votre inventaire officiel pré-configuré.
        </p>
      </div>

      {/* Prominent Card : Seed Données Réelles DA AOLF & AOLE */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/30 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Inventaire Officiel Disponible</span>
            </div>
            <h3 className="text-base font-bold text-white">
              Amorcer avec mon inventaire DA AOLF-3600 & AOLE-3600
            </h3>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Charge instantanément les <strong>497 équipements informatiques réels</strong> (Laptops Dell/Dynabook/HP, Écrans Philips, Scanners Fujitsu/Kodak...) et associe automatiquement chaque matériel aux <strong>54 bureaux et cubicules</strong> de vos 2 plans d'étage.
            </p>
          </div>

          <button
            onClick={handleSeedOfficial}
            disabled={loading}
            className="py-3 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition shrink-0 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{loading ? 'Chargement...' : 'Charger l\'Inventaire Officiel'}</span>
          </button>
        </div>
      </div>

      {/* Success alert */}
      {successCount !== null && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center space-x-3 text-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-sm">Importation réussie !</div>
            <span>{successCount} équipements ont été insérés avec succès dans votre base de données.</span>
          </div>
        </div>
      )}

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center space-x-3 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Two Column Import Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* File Dropzone */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                <span>Téléverser un fichier Excel ou CSV</span>
              </h4>
              <button
                onClick={handleDownloadTemplate}
                className="text-[11px] text-emerald-400 hover:underline flex items-center space-x-1"
              >
                <Download className="w-3 h-3" />
                <span>Modèle .xlsx</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Prend en charge les formats <code>.xlsx</code>, <code>.xls</code> et <code>.csv</code> avec détection automatique des colonnes.
            </p>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-950/40 hover:bg-slate-950/70"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <FileSpreadsheet className="w-10 h-10 text-slate-500 mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-200">
              Cliquez pour sélectionner votre fichier
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Glissez-déposez votre fichier ici</div>
          </div>
        </div>

        {/* Google Sheet URL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <h4 className="font-bold text-sm text-white flex items-center space-x-2 mb-3">
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <span>Lier une Google Sheet</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Collez l'URL de votre feuille Google Sheets partagée (avec accès "Tous les utilisateurs disposant du lien").
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="url"
              value={googleSheetUrl}
              onChange={(e) => setGoogleSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleFetchGoogleSheet}
              disabled={loading || !googleSheetUrl.trim()}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition disabled:opacity-50"
            >
              {loading ? 'Chargement...' : 'Récupérer les données Google Sheet'}
            </button>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
        <label className="flex items-center space-x-2.5 cursor-pointer text-slate-300">
          <input
            type="checkbox"
            checked={autoCreateSpaces}
            onChange={(e) => setAutoCreateSpaces(e.target.checked)}
            className="rounded border-slate-700 text-emerald-500 focus:ring-0"
          />
          <span>Créer automatiquement les bureaux/locaux manquants trouvés dans le fichier</span>
        </label>
        <span className="text-slate-500">
          {spaces.length} bureaux existants actuellement
        </span>
      </div>

      {/* Preview Table if rows loaded */}
      {previewRows.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div>
              <h4 className="font-bold text-sm text-white">
                Aperçu des données à importer ({previewRows.length} lignes)
              </h4>
              <p className="text-xs text-slate-400">
                Vérifiez les correspondances avant de valider l'insertion dans la base.
              </p>
            </div>
            <button
              onClick={handleExecuteImport}
              disabled={loading}
              className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? 'Importation...' : `Valider et Importer ${previewRows.length} Équipements`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Tag</th>
                  <th className="py-2.5 px-4">Nom Produit</th>
                  <th className="py-2.5 px-4">S/N</th>
                  <th className="py-2.5 px-4">Nom PC</th>
                  <th className="py-2.5 px-4">Local</th>
                  <th className="py-2.5 px-4">Utilisateur</th>
                  <th className="py-2.5 px-4">Section</th>
                  <th className="py-2.5 px-4">Prix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {previewRows.slice(0, 15).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2 px-4 font-mono font-bold text-emerald-400">{row.asset_tag}</td>
                    <td className="py-2 px-4 font-semibold text-white">{row.name}</td>
                    <td className="py-2 px-4 font-mono text-slate-400">{row.serial_number || '—'}</td>
                    <td className="py-2 px-4 font-mono text-slate-300">{row.hostname || '—'}</td>
                    <td className="py-2 px-4 font-bold text-amber-400">{row.local_code || '—'}</td>
                    <td className="py-2 px-4 text-slate-300">{row.assigned_user || '—'}</td>
                    <td className="py-2 px-4 text-slate-400">{row.department || '—'}</td>
                    <td className="py-2 px-4 font-mono">{row.purchase_price ? `${row.purchase_price} $` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewRows.length > 15 && (
            <div className="p-3 text-center text-xs text-slate-500 border-t border-slate-800">
              ... et {previewRows.length - 15} autres lignes
            </div>
          )}
        </div>
      )}
    </div>
  );
};
