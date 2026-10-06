import React, { useState } from 'react';
import { X, Database, CheckCircle2, AlertTriangle, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { useInventory } from '../../lib/useInventoryStore';
import { checkSupabaseConnection } from '../../lib/supabase';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({ isOpen, onClose }) => {
  const { supabaseStatus, refreshData } = useInventory();
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    const sql = `-- ==============================================================================
-- SCHÉMA DE BASE DE DONNÉES SUPABASE - GESTION INVENTAIRE IT & PLANS DE BUREAU
-- Exécutez ce script dans le "SQL Editor" de votre projet Supabase :
-- https://sqbsgtlnupsbvbdjfiry.supabase.co
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    organization_name TEXT DEFAULT 'Mon Organisation',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.floors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    floor_number INT DEFAULT 1,
    plan_image_url TEXT NOT NULL,
    dimensions JSONB DEFAULT '{"width": 1920, "height": 1080}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    floor_id UUID REFERENCES public.floors(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'bureau',
    x_percent FLOAT NOT NULL DEFAULT 50.0,
    y_percent FLOAT NOT NULL DEFAULT 50.0,
    color TEXT DEFAULT '#10b981',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'laptop',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_tag TEXT NOT NULL,
    serial_number TEXT,
    name TEXT NOT NULL,
    hostname TEXT,
    nsn TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    brand TEXT,
    model TEXT,
    department TEXT,
    assigned_user TEXT,
    user_grade TEXT,
    purchase_price NUMERIC(10,2),
    status TEXT NOT NULL DEFAULT 'en_service',
    space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL,
    notes TEXT,
    last_audited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_asset_tag_per_user UNIQUE (user_id, asset_tag)
);

CREATE TABLE IF NOT EXISTS public.asset_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    from_space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL,
    to_space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL,
    moved_by TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    auditor_name TEXT,
    status TEXT DEFAULT 'en_cours',
    notes TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.audit_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_session_id UUID NOT NULL REFERENCES public.audit_sessions(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    scanned_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own profile" ON public.profiles;
CREATE POLICY "Users access own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users access own floors" ON public.floors;
CREATE POLICY "Users access own floors" ON public.floors FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own spaces" ON public.spaces;
CREATE POLICY "Users access own spaces" ON public.spaces FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own categories" ON public.categories;
CREATE POLICY "Users access own categories" ON public.categories FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own assets" ON public.assets;
CREATE POLICY "Users access own assets" ON public.assets FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own movements" ON public.asset_movements;
CREATE POLICY "Users access own movements" ON public.asset_movements FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own audits" ON public.audit_sessions;
CREATE POLICY "Users access own audits" ON public.audit_sessions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own audit items" ON public.audit_items;
CREATE POLICY "Users access own audit items" ON public.audit_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.audit_sessions WHERE id = audit_session_id AND user_id = auth.uid())
);
`;

    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = async () => {
    setChecking(true);
    await checkSupabaseConnection();
    await refreshData();
    setChecking(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative text-slate-100">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Connexion Supabase</h3>
              <p className="text-xs text-slate-400">Projet sqbsgtlnupsbvbdjfiry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Status Box */}
          <div
            className={`p-4 rounded-xl border flex items-start space-x-3 ${
              supabaseStatus.tablesCreated
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            {supabaseStatus.tablesCreated ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <div className="font-bold text-sm mb-1">
                {supabaseStatus.tablesCreated
                  ? 'Base de données Supabase opérationnelle'
                  : 'Projet Supabase connecté - Tables SQL à initialiser'}
              </div>
              <p className="text-slate-300 leading-relaxed">
                {supabaseStatus.tablesCreated
                  ? 'Toutes les tables (floors, spaces, assets, movements, audits) et les politiques de sécurité Row Level Security (RLS) sont actives.'
                  : 'Votre projet Supabase est connecté mais les tables n’ont pas encore été créées. En attendant, l’application utilise un stockage local isolé.'}
              </p>
            </div>
          </div>

          {/* Connection params */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Supabase URL:</span>
              <span className="text-slate-300">https://sqbsgtlnupsbvbdjfiry.supabase.co</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Clé Publishable:</span>
              <span className="text-slate-300 truncate max-w-[240px]">sb_publishable_Kxt-Mm...</span>
            </div>
          </div>

          {/* Action 1-clic pour copier le SQL */}
          {!supabaseStatus.tablesCreated && (
            <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl space-y-3">
              <div className="font-semibold text-xs text-white flex items-center justify-between">
                <span>Comment créer les tables en 1 minute :</span>
              </div>
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4">
                <li>Cliquez sur le bouton ci-dessous pour copier le script SQL.</li>
                <li>
                  Ouvrez l'éditeur SQL de votre projet dans la console Supabase.
                </li>
                <li>Collez le script et cliquez sur <strong>Run</strong>.</li>
              </ol>

              <div className="flex space-x-2 pt-1">
                <button
                  onClick={handleCopySql}
                  className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copié dans le presse-papier !' : 'Copier le Script SQL'}</span>
                </button>
                <a
                  href="https://supabase.com/dashboard/project/sqbsgtlnupsbvbdjfiry/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition"
                >
                  <span>Ouvrir Supabase</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={handleTestConnection}
            disabled={checking}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center space-x-2 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>Tester à nouveau la connexion</span>
          </button>
        </div>
      </div>
    </div>
  );
};
