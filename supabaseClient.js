import { createClient } from "@supabase/supabase-js";

// Ces deux valeurs viennent des variables d'environnement (jamais écrites en dur
// dans le code). En local, mettez-les dans un fichier .env.local à la racine du
// projet ; sur Vercel, dans Project Settings → Environment Variables.
//
// VITE_SUPABASE_URL=https://xxxxx.supabase.co
// VITE_SUPABASE_ANON_KEY=votre_anon_key

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Variables Supabase manquantes. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
