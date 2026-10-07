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
  MapPin,
  Check,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { useInventory } from '../../lib/useInventoryStore';

interface SheetInfo {
  name: string;
  rows: any[];
}

export const ExcelImportView: React.FC = () => {
  const { importBatch, seedOfficialData, assets, spaces } = useInventory();

  const [loading, setLoading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [workbookSheets, setWorkbookSheets] = useState<SheetInfo[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('ALL');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [autoCreateSpaces, setAutoCreateSpaces] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1-clic pour charger les 497 équipements réels fournis
  const handleSeedOfficial = async () => {
    if (confirm('Voulez-vous charger l\'inventaire officiel DA AOLF & AOLE (497 matériels et 54 bureaux pré-cartographiés) ?')) {
      setLoading(true);
      setErrorMsg(null);
      setSuccessCount(null);
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

  // Détecte la véritable ligne d'en-tête et normalise les données
  function detectHeadersAndParseSheet(ws: XLSX.WorkSheet, sheetName: string): any[] {
    const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
    if (!matrix || matrix.length === 0) return [];

    const keywords = [
      'nsn', 'nom du produit', 'description', 'produit', 'ordinateur', 'hostname',
      "numéro d'inventaire", "numero d'inventaire", 'inventaire', 'asset tag', 'tag',
      "numéro de série", "numero de serie", 'série', 'serie', 'ns #', 's/n', 'serial',
      'local', 'bureau', 'section', 'nom', 'grade', 'prix', 'actions', 'commentaires'
    ];

    let headerRowIdx = -1;
    let maxScore = 0;

    // Scan des 25 premières lignes pour trouver la rangée avec le plus de colonnes connues
    for (let r = 0; r < Math.min(25, matrix.length); r++) {
      const row = matrix[r] || [];
      let score = 0;
      for (const cell of row) {
        const cellStr = String(cell).toLowerCase().trim();
        if (keywords.some((kw) => cellStr.includes(kw))) {
          score++;
        }
      }
      if (score > maxScore && score >= 2) {
        maxScore = score;
        headerRowIdx = r;
      }
    }

    if (headerRowIdx === -1) headerRowIdx = 0;

    const headerRow = matrix[headerRowIdx] || [];
    const headers = headerRow.map((h) => String(h || '').trim());

    const parsedRows: any[] = [];
    for (let r = headerRowIdx + 1; r < matrix.length; r++) {
      const row = matrix[r] || [];
      const rowObj: Record<string, any> = {};
      let hasValue = false;
      for (let c = 0; c < headers.length; c++) {
        const h = headers[c];
        if (h) {
          rowObj[h] = row[c];
          if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
            hasValue = true;
          }
        }
      }
      if (hasValue) {
        const normalized = normalizeRow(rowObj, sheetName);
        if (normalized) {
          parsedRows.push(normalized);
        }
      }
    }

    return parsedRows;
  }

  // Normalisation intelligente avec désambiguïsation
  function normalizeRow(row: Record<string, any>, sheetName?: string) {
    const keys = Object.keys(row);

    const findValue = (candidates: string[]) => {
      // 1. Recherche par correspondance exacte (insensible à la casse)
      for (const cand of candidates) {
        for (const k of keys) {
          if (k.trim().toLowerCase() === cand.toLowerCase()) {
            const val = row[k];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              return String(val).trim();
            }
          }
        }
      }
      // 2. Recherche par sous-chaîne
      for (const cand of candidates) {
        for (const k of keys) {
          const cleanK = k.trim().toLowerCase();
          if (cleanK.includes(cand.toLowerCase())) {
            const val = row[k];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              return String(val).trim();
            }
          }
        }
      }
      return undefined;
    };

    // 1. Nom de l'équipement
    let name = findValue(['nom du produit', 'description', 'produit', 'modèle', 'modele', 'designation', 'désignation', 'item', 'equipment']);

    // 2. Hostname / Nom PC
    const hostname = findValue(["nom de l'ordinateur", "nom de l'ordi", 'nom pc', 'hostname', 'computer name', 'nom machine']);

    // 3. Utilisateur assigné (attention : ne pas confondre avec Nom Produit)
    let assigned_user: string | undefined = undefined;
    const rawNom = findValue(["nom de l'employé", 'utilisateur', 'employé', 'personne', 'assigné à', 'détenteur']);
    if (rawNom) {
      assigned_user = rawNom;
    } else {
      const exactNomKey = keys.find((k) => k.trim().toLowerCase() === 'nom');
      if (exactNomKey && row[exactNomKey]) {
        const val = String(row[exactNomKey]).trim();
        if (val) assigned_user = val;
      }
    }

    // 4. Numéros d'inventaire et de série
    const tag = findValue(["numéro d'inventaire", "numero d'inventaire", 'no inventaire', 'asset tag', 'inventaire', 'code barre', 'barcode', 'tag']);
    const serial = findValue(["numéro de série", "numero de serie", 'no série', 'no serie', 'ns #', 's/n', 'serial', 'sn', 'service tag']);
    const nsn = findValue(['nsn', 'nomenclature']);
    const local = findValue(['local', 'bureau', 'pièce', 'piece', 'salle', 'cubicule', 'office', 'room']);
    const department = findValue(['section', 'département', 'departement', 'service', 'division', 'direction']);
    const grade = findValue(['grade', 'rang', 'titre']);

    // 5. Prix
    const priceRaw = findValue(['prix', 'cout', 'coût', 'valeur', 'cost', 'price']);
    let purchase_price: number | undefined = undefined;
    if (priceRaw) {
      const cleanNum = parseFloat(String(priceRaw).replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (!isNaN(cleanNum)) purchase_price = cleanNum;
    }

    // 6. Notes et actions
    const notes = findValue(['actions', 'action', 'commentaires', 'commentaire', 'remarques', 'remarque', 'notes', 'note']);

    // Ignorer les lignes totalement vides ou hors inventaire
    if (!name && !tag && !serial && !hostname && !local) {
      return null;
    }

    if (!name) {
      name = hostname ? `PC ${hostname}` : (nsn ? `Équipement (${nsn})` : 'Équipement');
    }

    const cleanSerial = serial && serial !== 'N/A' && serial !== '-' ? serial : undefined;
    const fullUser = assigned_user ? (grade && !assigned_user.includes(grade) ? `${assigned_user} (${grade})` : assigned_user) : undefined;
    const asset_tag = tag || cleanSerial || (hostname ? `HOST-${hostname}` : `TAG-${Math.floor(100000 + Math.random() * 900000)}`);

    return {
      name,
      asset_tag,
      serial_number: cleanSerial,
      hostname,
      nsn,
      local_code: local,
      department,
      assigned_user: fullUser,
      user_grade: grade,
      purchase_price,
      notes,
      source_sheet: sheetName,
    };
  }

  // Parser un fichier Excel ou CSV
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessCount(null);
    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });

      const sheetsData: SheetInfo[] = [];

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows = detectHeadersAndParseSheet(ws, sheetName);
        if (rows.length > 0) {
          sheetsData.push({ name: sheetName, rows });
        }
      }

      if (sheetsData.length === 0) {
        setErrorMsg('Aucune ligne d\'équipement valide détectée dans le fichier.');
        setWorkbookSheets([]);
        setPreviewRows([]);
        return;
      }

      setWorkbookSheets(sheetsData);
      setSelectedSheetName('ALL');
      const allRows = sheetsData.flatMap((s) => s.rows);
      setPreviewRows(allRows);
    } catch (err: any) {
      console.error('Erreur lecture fichier:', err);
      setErrorMsg('Format de fichier non reconnu : ' + (err?.message || 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  // Filtrer la prévisualisation par feuille
  const handleSelectSheet = (sheetName: string) => {
    setSelectedSheetName(sheetName);
    if (sheetName === 'ALL') {
      const allRows = workbookSheets.flatMap((s) => s.rows);
      setPreviewRows(allRows);
    } else {
      const found = workbookSheets.find((s) => s.name === sheetName);
      setPreviewRows(found ? found.rows : []);
    }
  };

  // Télécharger depuis Google Sheet URL (format export CSV)
  const handleFetchGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessCount(null);

    try {
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
      const rows = detectHeadersAndParseSheet(ws, 'Google Sheet');

      if (rows.length === 0) {
        throw new Error('Aucune ligne de matériel reconnue dans cette feuille.');
      }

      setWorkbookSheets([{ name: 'Google Sheet', rows }]);
      setSelectedSheetName('ALL');
      setPreviewRows(rows);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la lecture du Google Sheet');
    } finally {
      setLoading(false);
    }
  };

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
      setWorkbookSheets([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Erreur importBatch:', err);
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
          Peuplez votre base de données à partir de vos fichiers existants ou chargez directement votre inventaire officiel pré-configuré.
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
              Charge instantanément les <strong>497 équipements informatiques réels</strong> (Laptops Dell/Dynabook/HP, Écrans Philips, Scanners...) et associe automatiquement chaque matériel aux <strong>54 bureaux et cubicules</strong> de vos 2 plans d'étage.
            </p>
          </div>

          <button
            onClick={handleSeedOfficial}
            disabled={loading}
            className="py-3 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{loading ? 'Chargement en cours...' : 'Charger l\'Inventaire Officiel'}</span>
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
                className="text-[11px] text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Modèle .xlsx</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Prend en charge vos classeurs multi-feuilles (ex: <code>A0LF</code>, <code>A0LE</code>) avec détection intelligente des colonnes même si des lignes de titre existent au début.
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
              {loading ? 'Analyse du fichier...' : 'Cliquez pour sélectionner votre fichier Excel / CSV'}
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
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition disabled:opacity-50 cursor-pointer"
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
          {spaces.length} bureaux existants actuellement dans le plan
        </span>
      </div>

      {/* Multi-sheet switcher tabs if multiple sheets detected */}
      {workbookSheets.length > 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 mb-1">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span>Feuilles détectées dans votre classeur :</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSelectSheet('ALL')}
              className={`px-3 py-1.5 text-xs rounded-xl font-bold transition flex items-center space-x-1.5 ${
                selectedSheetName === 'ALL'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>Toutes les feuilles combinées</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-950/40 text-[10px]">
                {workbookSheets.reduce((acc, s) => acc + s.rows.length, 0)}
              </span>
            </button>

            {workbookSheets.map((s) => (
              <button
                key={s.name}
                onClick={() => handleSelectSheet(s.name)}
                className={`px-3 py-1.5 text-xs rounded-xl font-bold transition flex items-center space-x-1.5 ${
                  selectedSheetName === s.name
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>Feuille {s.name}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-950/40 text-[10px]">
                  {s.rows.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview Table if rows loaded */}
      {previewRows.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/40">
            <div>
              <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                <span>Aperçu des données à importer</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                  {previewRows.length} équipements détectés
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Vérifiez les correspondances avant de valider l'insertion dans la base de données.
              </p>
            </div>
            <button
              onClick={handleExecuteImport}
              disabled={loading}
              className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <span>{loading ? 'Importation...' : `Valider et Importer ${previewRows.length} Équipements`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Tag / Inventaire</th>
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
                {previewRows.slice(0, 20).map((row, idx) => (
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
          {previewRows.length > 20 && (
            <div className="p-3 text-center text-xs text-slate-500 border-t border-slate-800">
              ... et {previewRows.length - 20} autres équipements prêts à être importés
            </div>
          )}
        </div>
      )}
    </div>
  );
};
