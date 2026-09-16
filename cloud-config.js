// Supabase's anon key is designed to be public in browser clients. Security is
// enforced by Row Level Security in cloud/supabase.sql. Leave blank for local-only mode.
export const CLOUD_CONFIG = {
  url: '',
  anonKey: '',
};
