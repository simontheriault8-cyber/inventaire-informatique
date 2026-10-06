import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sqbsgtlnupsbvbdjfiry.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Kxt-Mm_Hoz023adaExgcsQ_aGWcworT';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Vérifie si la table public.spaces ou public.assets existe dans le projet Supabase
export async function checkSupabaseConnection(): Promise<{ connected: boolean; tablesCreated: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('spaces').select('id').limit(1);
    if (!error) {
      return { connected: true, tablesCreated: true };
    }
    // Si l'erreur est 42P01 (relation "spaces" does not exist), la connexion marche mais le script SQL n'a pas été exécuté
    if (error.code === '42P01' || error.message.includes('relation "public.spaces" does not exist') || error.message.includes('not found')) {
      return { connected: true, tablesCreated: false, error: 'Les tables SQL ne sont pas encore créées dans Supabase.' };
    }
    return { connected: false, tablesCreated: false, error: error.message };
  } catch (err: any) {
    return { connected: false, tablesCreated: false, error: err?.message || 'Erreur inconnue de connexion à Supabase' };
  }
}
