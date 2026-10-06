-- ==============================================================================
-- SCHÉMA DE BASE DE DONNÉES SUPABASE - GESTION INVENTAIRE IT & PLANS DE BUREAU
-- Exécutez ce script dans le "SQL Editor" de votre projet Supabase :
-- https://sqbsgtlnupsbvbdjfiry.supabase.co
-- ==============================================================================

-- 1. Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    organization_name TEXT DEFAULT 'Mon Organisation',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table des étages / plans
CREATE TABLE IF NOT EXISTS public.floors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Ex: "Étage 1", "Étage 2"
    floor_number INT DEFAULT 1,
    plan_image_url TEXT NOT NULL,
    dimensions JSONB DEFAULT '{"width": 1920, "height": 1080}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table des espaces (Bureaux fermés, cubicules, salles de réunion, etc.)
CREATE TABLE IF NOT EXISTS public.spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    floor_id UUID REFERENCES public.floors(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Ex: "Bureau 120-25", "Cubicule 1-05"
    code TEXT NOT NULL, -- Ex: "120-25", "1-05", "2-09"
    type TEXT NOT NULL DEFAULT 'bureau', -- 'bureau', 'cubicule', 'reunion', 'informatique', 'stock', 'accueil', 'medic'
    x_percent FLOAT NOT NULL DEFAULT 50.0, -- Coordonnée X en pourcentage (0-100%)
    y_percent FLOAT NOT NULL DEFAULT 50.0, -- Coordonnée Y en pourcentage (0-100%)
    color TEXT DEFAULT '#10b981',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des catégories de matériel
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Ex: "Ordinateur Portable", "Écran", "Imprimante", "Scanner", etc.
    icon TEXT DEFAULT 'laptop',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table du matériel informatique
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_tag TEXT NOT NULL, -- Numéro d'inventaire / Code-barres scanné
    serial_number TEXT,
    name TEXT NOT NULL,
    hostname TEXT, -- Nom de l'ordinateur / Nom réseau
    nsn TEXT, -- Numéro de nomenclature (NSN)
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    brand TEXT, -- "Dell", "HP", "Philips", "Lenovo", "Zebra", etc.
    model TEXT,
    department TEXT, -- Section (Salle de Test, CCM, Medic, Traitement, EM...)
    assigned_user TEXT, -- Utilisateur affecté
    user_grade TEXT, -- Grade militaire / Titre (Sgt, Capt, Cpl, Civ...)
    purchase_price NUMERIC(10,2),
    status TEXT NOT NULL DEFAULT 'en_service', -- 'en_service', 'en_stock', 'en_reparation', 'reforme'
    space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL,
    notes TEXT,
    last_audited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_asset_tag_per_user UNIQUE (user_id, asset_tag)
);

-- 7. Historique des déplacements de matériel
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

-- 8. Sessions d'audit physique
CREATE TABLE IF NOT EXISTS public.audit_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    auditor_name TEXT,
    status TEXT DEFAULT 'en_cours', -- 'en_cours', 'termine'
    notes TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 9. Lignes d'audit (matériel vérifié dans la session)
CREATE TABLE IF NOT EXISTS public.audit_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_session_id UUID NOT NULL REFERENCES public.audit_sessions(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'conforme', 'inattendu', 'manquant'
    scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- SÉCURITÉ AU NIVEAU DES LIGNES (ROW LEVEL SECURITY - RLS)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_items ENABLE ROW LEVEL SECURITY;

-- Politiques RLS : chaque utilisateur a un accès exclusif à ses propres données
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

-- Déclencheur automatique de création du profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, organization_name)
  VALUES (new.id, new.email, 'Mon Organisation');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Bucket Supabase Storage pour les plans d'étage téléversés
INSERT INTO storage.buckets (id, name, public) 
VALUES ('floor-plans', 'floor-plans', true) 
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read for floor-plans" ON storage.objects
FOR SELECT USING (bucket_id = 'floor-plans');

CREATE POLICY "Authenticated users can upload floor-plans" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'floor-plans' AND auth.role() = 'authenticated');
