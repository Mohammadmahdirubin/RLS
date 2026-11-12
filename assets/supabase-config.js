// Public browser configuration. The publishable key is intended for frontend use.
window.RLS_SUPABASE_CONFIG = {
  url: "https://tcssggnlvpmravhyqtqd.supabase.co",
  publishableKey: "sb_publishable_Z7vF3QwD-dHaUDSV8a7zbg_rs4BAJ3F"
};

// Initialize when the CDN library is available. The community directory has
// its own fallback loader in case the primary CDN is temporarily unavailable.
if (window.supabase && window.RLS_SUPABASE_CONFIG) {
  window.RLS_SUPABASE_CLIENT = window.supabase.createClient(
    window.RLS_SUPABASE_CONFIG.url,
    window.RLS_SUPABASE_CONFIG.publishableKey,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
}
