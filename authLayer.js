import { supabase } from "./supabaseClient";

// ============================================================================
// Remplace tout le système "fait main" (simpleHash, comptes stockés dans
// window.storage, code de réinitialisation affiché à l'écran). Supabase Auth
// gère : le hash sécurisé des mots de passe, les sessions, et l'envoi réel
// d'email pour la réinitialisation.
// ============================================================================

// Création de compte. Aucune restriction de domaine d'email : les administrateurs
// utilisent @citygo.me, mais les agents peuvent avoir n'importe quelle adresse.
export async function signUp(email, password, prenom) {
  if (!prenom || !prenom.trim()) {
    return { error: "Indiquez votre prénom." };
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { prenom: prenom.trim(), display_name: prenom.trim() } },
  });
  if (error) return { error: error.message };
  return { data };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email ou mot de passe incorrect." };
  return { data };
}

export async function signOut() {
  await supabase.auth.signOut();
}

// Envoie un vrai email avec un lien de réinitialisation (contrairement à
// l'ancien système qui affichait le code à l'écran).
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) return { error: error.message };
  return { success: true };
}

// Appelé une fois que la personne a cliqué sur
// le lien reçu par email (Supabase la reconnecte automatiquement à ce moment-là).
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return { success: true };
}

// Récupère la session actuelle (à appeler au chargement de l'app).
export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Récupère le profil (email + rôle admin/agent) de l'utilisateur connecté.
export async function getCurrentProfile() {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("email, prenom, role")
    .eq("id", session.session.user.id)
    .single();
  if (error) return null;
  return { email: data.email, prenom: data.prenom || "", isAdmin: data.role === "admin" };
}

// S'abonne aux changements de connexion (connexion / déconnexion / expiration
// de session), pour garder l'interface synchronisée automatiquement.
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return data.subscription; // pensez à appeler .unsubscribe() si besoin
}
