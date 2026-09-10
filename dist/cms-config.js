// بيانات الاتصال العامة فقط. لا تضع service_role key هنا أبداً.
export const SUPABASE_URL = "https://rblayfmwowcruxvokxqr.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_l5f7QzJeWvB8K5lXFuaZ7Q_I8zBESs7";

export const cmsConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR_") &&
  SUPABASE_ANON_KEY.length > 40;
