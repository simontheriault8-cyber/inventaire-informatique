export type SpaceType = 'bureau' | 'cubicule' | 'reunion' | 'informatique' | 'stock' | 'accueil' | 'medic';

export type AssetStatus = 'en_service' | 'en_stock' | 'en_reparation' | 'reforme';

export interface Floor {
  id: string;
  user_id: string;
  name: string;
  floor_number: number;
  plan_image_url: string;
  created_at?: string;
}

export interface Space {
  id: string;
  user_id: string;
  floor_id?: string;
  name: string;
  code: string;
  type: SpaceType;
  x_percent: number;
  y_percent: number;
  color?: string;
  created_at?: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon?: string;
  created_at?: string;
}

export interface Asset {
  id: string;
  user_id: string;
  asset_tag: string;
  serial_number?: string;
  name: string;
  hostname?: string;
  nsn?: string;
  category_id?: string;
  brand?: string;
  model?: string;
  department?: string;
  assigned_user?: string;
  user_grade?: string;
  purchase_price?: number;
  status: AssetStatus;
  space_id?: string;
  notes?: string;
  last_audited_at?: string;
  created_at?: string;
}

export interface AssetMovement {
  id: string;
  user_id: string;
  asset_id: string;
  from_space_id?: string;
  to_space_id?: string;
  moved_by?: string;
  reason?: string;
  created_at?: string;
  asset_name?: string;
  from_space_name?: string;
  to_space_name?: string;
}

export interface AuditSession {
  id: string;
  user_id: string;
  space_id: string;
  auditor_name?: string;
  status: 'en_cours' | 'termine';
  notes?: string;
  started_at?: string;
  completed_at?: string;
}

export interface AuditItem {
  id: string;
  audit_session_id: string;
  asset_id: string;
  status: 'conforme' | 'inattendu' | 'manquant';
  scanned_at?: string;
  asset?: Asset;
}
