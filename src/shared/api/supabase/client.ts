import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Public browser client. Administrative keys must never be passed here.
export function createSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error("Укажите публичные настройки Supabase в .env.");
  if (key.startsWith("sb_secret_"))
    throw new Error("Во фронтенде разрешён только публичный ключ Supabase.");
  if (key.startsWith("eyJ")) {
    try {
      if (JSON.parse(atob(key.split(".")[1])).role !== "anon")
        throw new Error();
    } catch {
      throw new Error(
        "Укажите publishable или anon ключ, без прав администратора.",
      );
    }
  }
  return createClient<Database>(url, key);
}
