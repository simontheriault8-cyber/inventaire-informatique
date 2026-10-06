import { Floor, Space, Category, Asset } from '../types';
import seedAssetsRaw from './seedAssets.json';

export const DEFAULT_CATEGORIES: Array<{ name: string; icon: string }> = [
  { name: 'Ordinateur Portable', icon: 'laptop' },
  { name: 'Poste Fixe / Desktop', icon: 'monitor' },
  { name: 'Écran / Moniteur', icon: 'tv' },
  { name: 'Imprimante', icon: 'printer' },
  { name: 'Scanner', icon: 'scan' },
  { name: 'Projecteur', icon: 'projector' },
  { name: 'Audio / Casque / Webcam', icon: 'headphones' },
  { name: 'Équipement Réseau & UPS', icon: 'server' },
  { name: 'Mobilier & Sécurité', icon: 'shield' },
];

export function getInitialCategories(userId: string): Category[] {
  return DEFAULT_CATEGORIES.map((c, i) => ({
    id: `${userId}-cat-${i + 1}`,
    user_id: userId,
    name: c.name,
    icon: c.icon,
  }));
}

export function getInitialFloors(userId: string): Floor[] {
  return [
    {
      id: `${userId}-floor-1`,
      user_id: userId,
      name: 'Étage 1 (Bureaux & Cubicules)',
      floor_number: 1,
      plan_image_url: './plans/etage-1.png',
      created_at: new Date().toISOString()
    },
    {
      id: `${userId}-floor-2`,
      user_id: userId,
      name: 'Étage 2 (Plateau & Soutien)',
      floor_number: 2,
      plan_image_url: './plans/etage-2.png',
      created_at: new Date().toISOString()
    }
  ];
}

export function getInitialSpaces(userId: string, floor1Id: string, floor2Id: string): Space[] {
  const spaces: Space[] = [];

  // ========================== ÉTAGE 1 ==========================
  // Cubicules Étage 1 (Aile droite supérieure)
  const cube1Coords: Array<{ code: string; x: number; y: number }> = [
    { code: '1-39', x: 64, y: 6 },
    { code: '1-38', x: 64, y: 10 },
    { code: '1-37', x: 64, y: 14 },
    { code: '1-35', x: 64, y: 23 },
    { code: '1-31', x: 73, y: 6 },
    { code: '1-32', x: 73, y: 10 },
    { code: '1-33', x: 73, y: 14 },
    { code: '1-34', x: 73, y: 19 },
    { code: '1-29', x: 79, y: 10 },
    { code: '1-28', x: 79, y: 14 },
    { code: '1-27', x: 79, y: 19 },
    { code: '1-23', x: 87, y: 6 },
    { code: '1-22', x: 93, y: 6 },
    { code: '1-24', x: 87, y: 10 },
    { code: '1-21', x: 93, y: 10 },
    { code: '1-25', x: 87, y: 14 },
    { code: '1-20', x: 93, y: 14 },
    { code: '1-26', x: 87, y: 19 },
    { code: '1-19', x: 93, y: 19 },
    { code: '1-13', x: 87, y: 27 },
    { code: '1-12', x: 93, y: 27 },
    { code: '1-14', x: 87, y: 31 },
    { code: '1-11', x: 93, y: 31 },
    { code: '1-15', x: 87, y: 35 },
    { code: '1-10', x: 93, y: 35 },
    { code: '1-16', x: 87, y: 39 },
    { code: '1-09', x: 93, y: 39 },
    { code: '1-06', x: 89, y: 53 },
    { code: '1-07', x: 94, y: 53 },
    { code: '1-05', x: 89, y: 58 },
    { code: '1-04', x: 94, y: 58 },
  ];

  cube1Coords.forEach((c) => {
    spaces.push({
      id: `${userId}-space-${c.code}`,
      user_id: userId,
      floor_id: floor1Id,
      name: `Cubicule ${c.code}`,
      code: c.code,
      type: 'cubicule',
      x_percent: c.x,
      y_percent: c.y,
      color: '#06b6d4', // Cyan
    });
  });

  // Bureaux fermés et salles techniques Étage 1
  const rooms1Coords: Array<{ code: string; name: string; type: Space['type']; x: number; y: number; color?: string }> = [
    { code: '120-17', name: 'Bureau 120-17 (Médical)', type: 'medic', x: 25, y: 29, color: '#ec4899' },
    { code: '120-16', name: 'Bureau 120-16 (Médical)', type: 'medic', x: 36, y: 29, color: '#ec4899' },
    { code: '120-15', name: 'Bureau 120-15 (Médical)', type: 'medic', x: 46, y: 29, color: '#ec4899' },
    { code: '120-14', name: 'Bureau 120-14 (Médical)', type: 'medic', x: 55, y: 29, color: '#ec4899' },
    { code: '120-23', name: 'Salle de Test 120-23', type: 'informatique', x: 50, y: 13, color: '#8b5cf6' },
    { code: '120-24', name: 'Personnel Instruction 120-24', type: 'reunion', x: 38, y: 13, color: '#a855f7' },
    { code: '120-25', name: 'Salle Informatique 120-25', type: 'informatique', x: 76, y: 46, color: '#3b82f6' },
    { code: '120-11', name: 'Bureau 120-11', type: 'bureau', x: 69, y: 46, color: '#10b981' },
    { code: '120-10', name: 'Bureau 120-10 (CCM)', type: 'bureau', x: 69, y: 53, color: '#10b981' },
    { code: '120-27', name: 'Bureau 120-27', type: 'bureau', x: 76, y: 53, color: '#10b981' },
    { code: '120-08', name: 'Bureau 120-08 (CCM)', type: 'bureau', x: 69, y: 61, color: '#10b981' },
    { code: '120-28', name: 'Salle Biométrique 120-28', type: 'informatique', x: 76, y: 61, color: '#6366f1' },
    { code: '120-29', name: 'Bureau 120-29', type: 'bureau', x: 76, y: 64, color: '#10b981' },
    { code: '120-09', name: 'Bureau 120-09 (CCM)', type: 'bureau', x: 59, y: 55, color: '#10b981' },
    { code: '120-07', name: 'Bureau 120-07 (CCM)', type: 'bureau', x: 58, y: 64, color: '#10b981' },
    { code: '120-06', name: 'Bureau 120-06 (CCM)', type: 'bureau', x: 69, y: 70, color: '#10b981' },
    { code: '120-05', name: 'Bureau 120-05 (CCM)', type: 'bureau', x: 58, y: 70, color: '#10b981' },
    { code: '120-03', name: 'Bureau 120-03', type: 'bureau', x: 76, y: 70, color: '#10b981' },
    { code: 'R-1', name: 'Accueil R-1', type: 'accueil', x: 58, y: 78, color: '#14b8a6' },
    { code: 'R-2', name: 'Accueil R-2', type: 'accueil', x: 68, y: 76, color: '#14b8a6' },
    { code: 'R-3', name: 'Accueil R-3', type: 'accueil', x: 73, y: 76, color: '#14b8a6' },
    { code: 'R-4', name: 'Accueil R-4', type: 'accueil', x: 78, y: 76, color: '#14b8a6' },
  ];

  rooms1Coords.forEach((r) => {
    spaces.push({
      id: `${userId}-space-${r.code}`,
      user_id: userId,
      floor_id: floor1Id,
      name: r.name,
      code: r.code,
      type: r.type,
      x_percent: r.x,
      y_percent: r.y,
      color: r.color || '#10b981',
    });
  });

  // ========================== ÉTAGE 2 ==========================
  // Cubicules Étage 2
  const cube2Coords: Array<{ code: string; x: number; y: number }> = [
    { code: '2-19', x: 16, y: 65 },
    { code: '2-20', x: 16, y: 73 },
    { code: '2-21', x: 16, y: 81 },
    { code: '2-18', x: 32, y: 67 },
    { code: '2-11', x: 45, y: 67 },
    { code: '2-17', x: 32, y: 74 },
    { code: '2-12', x: 45, y: 74 },
    { code: '2-16', x: 32, y: 81 },
    { code: '2-13', x: 45, y: 81 },
    { code: '2-15', x: 32, y: 88 },
    { code: '2-14', x: 45, y: 88 },
    { code: '2-01', x: 65, y: 67 },
    { code: '2-02', x: 78, y: 67 },
    { code: '2-08', x: 65, y: 73 },
    { code: '2-03', x: 78, y: 73 },
    { code: '2-07', x: 65, y: 81 },
    { code: '2-04', x: 78, y: 81 },
    { code: '2-09', x: 65, y: 88 },
    { code: '2-05', x: 78, y: 88 },
  ];

  cube2Coords.forEach((c) => {
    spaces.push({
      id: `${userId}-space-${c.code}`,
      user_id: userId,
      floor_id: floor2Id,
      name: `Cubicule ${c.code}`,
      code: c.code,
      type: 'cubicule',
      x_percent: c.x,
      y_percent: c.y,
      color: '#06b6d4',
    });
  });

  // Salles et bureaux Étage 2
  const rooms2Coords: Array<{ code: string; name: string; type: Space['type']; x: number; y: number; color?: string }> = [
    { code: '210-05', name: 'Salle Conférence', type: 'reunion', x: 38, y: 50, color: '#8b5cf6' },
    { code: '2-10-04', name: 'Local Soutien 2-10-04', type: 'informatique', x: 60, y: 48, color: '#f59e0b' },
    { code: '2-10-03', name: 'Bureau 2-10-03', type: 'bureau', x: 78, y: 53, color: '#10b981' },
    { code: '210-01', name: 'Coffre & Bureau 210-01', type: 'stock', x: 76, y: 45, color: '#64748b' },
  ];

  rooms2Coords.forEach((r) => {
    spaces.push({
      id: `${userId}-space-${r.code}`,
      user_id: userId,
      floor_id: floor2Id,
      name: r.name,
      code: r.code,
      type: r.type,
      x_percent: r.x,
      y_percent: r.y,
      color: r.color || '#10b981',
    });
  });

  return spaces;
}

export function getInitialAssets(userId: string, spacesMap: Record<string, string>): Asset[] {
  return seedAssetsRaw.map((raw: any, index: number) => {
    // Si raw.local_code existe et correspond à un espace connu, on lie space_id
    const spaceId = raw.local_code ? spacesMap[raw.local_code] : undefined;

    return {
      id: `${userId}-asset-${index + 1}`,
      user_id: userId,
      asset_tag: raw.asset_tag || `TAG-${1000 + index}`,
      name: raw.name || 'Équipement non spécifié',
      serial_number: raw.serial_number,
      hostname: raw.hostname,
      nsn: raw.nsn,
      brand: extractBrand(raw.name),
      model: raw.name,
      department: raw.department,
      assigned_user: raw.assigned_user,
      user_grade: raw.user_grade,
      purchase_price: raw.purchase_price,
      status: 'en_service',
      space_id: spaceId,
      notes: raw.notes,
      created_at: new Date().toISOString()
    };
  });
}

function extractBrand(name?: string): string | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  if (lower.includes('dell')) return 'Dell';
  if (lower.includes('hp') || lower.includes('elitebook') || lower.includes('probook')) return 'HP';
  if (lower.includes('lenovo') || lower.includes('thinkpad')) return 'Lenovo';
  if (lower.includes('philips')) return 'Philips';
  if (lower.includes('canon')) return 'Canon';
  if (lower.includes('fujitsu')) return 'Fujitsu';
  if (lower.includes('benq')) return 'BenQ';
  if (lower.includes('zebra')) return 'Zebra';
  if (lower.includes('dymo')) return 'Dymo';
  if (lower.includes('samsung')) return 'Samsung';
  if (lower.includes('kodak')) return 'Kodak';
  if (lower.includes('logitech')) return 'Logitech';
  if (lower.includes('epson')) return 'Epson';
  if (lower.includes('infocus')) return 'InFocus';
  if (lower.includes('dynabook')) return 'Dynabook';
  if (lower.includes('ciara')) return 'Ciara';
  if (lower.includes('apple') || lower.includes('ipad')) return 'Apple';
  return undefined;
}
