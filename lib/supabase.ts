import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase EXCLUSIVO de servidor (service role).
 * Nunca importe este módulo em componentes client.
 * Retorna null se as variáveis de ambiente não estiverem configuradas —
 * a API de leads trata esse caso com uma mensagem clara.
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
