// Public browser configuration. The publishable key is intended for frontend use.
window.RLS_SUPABASE_CONFIG = {
  url: "https://tcssggnlvpmravhyqtqd.supabase.co",
  publishableKey: "sb_publishable_Z7vF3QwD-dHaUDSV8a7zbg_rs4BAJ3F"
};

// One shared client prevents competing Auth instances from losing the active session.
window.RLS_SUPABASE_CLIENT = window.supabase.createClient(
  window.RLS_SUPABASE_CONFIG.url,
  window.RLS_SUPABASE_CONFIG.publishableKey,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);
