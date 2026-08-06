import { supabase } from "./supabaseClient";

// ============================================================================
// Remplace window.storage.get/set pour chaque type de donnée. Contrairement à
// l'ancien système (relire/réécrire tout le tableau JSON à chaque changement),
// ici chaque action ne touche que la ligne concernée — plus sûr en cas
// d'utilisation simultanée par plusieurs personnes (fini le "dernier qui
// enregistre écrase les autres").
// ============================================================================

// ---------------------------------------------------------------------------
// ABSENCES (+ volontaires imbriqués, pour garder la même forme de données que
// l'ancien code : { id, prenom, date, heureDebut, heureFin, volunteers: [...] })
// ---------------------------------------------------------------------------

export async function loadAbsences() {
  const { data: absences, error: e1 } = await supabase
    .from("absences")
    .select("*")
    .order("date", { ascending: true });
  if (e1) throw e1;

  const { data: volunteers, error: e2 } = await supabase.from("absence_volunteers").select("*");
  if (e2) throw e2;

  return absences.map((a) => ({
    id: a.id,
    prenom: a.prenom,
    date: a.date,
    heureDebut: a.heure_debut.slice(0, 5),
    heureFin: a.heure_fin.slice(0, 5),
    createdAt: a.created_at,
    volunteers: volunteers
      .filter((v) => v.absence_id === a.id)
      .map((v) => ({
        id: v.id,
        prenom: v.prenom,
        heureDebut: v.heure_debut.slice(0, 5),
        heureFin: v.heure_fin.slice(0, 5),
        status: v.status,
      })),
  }));
}

export async function addAbsence({ prenom, date, heureDebut, heureFin }) {
  const { data, error } = await supabase
    .from("absences")
    .insert({ prenom, date, heure_debut: heureDebut, heure_fin: heureFin })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAbsence(id, { prenom, date, heureDebut, heureFin }) {
  const { error } = await supabase
    .from("absences")
    .update({ prenom, date, heure_debut: heureDebut, heure_fin: heureFin })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAbsence(id) {
  // La suppression des volontaires liés se fait automatiquement (ON DELETE CASCADE).
  const { error } = await supabase.from("absences").delete().eq("id", id);
  if (error) throw error;
}

export async function addVolunteer(absenceId, { prenom, heureDebut, heureFin }) {
  const { error } = await supabase
    .from("absence_volunteers")
    .insert({ absence_id: absenceId, prenom, heure_debut: heureDebut, heure_fin: heureFin, status: "pending" });
  if (error) throw error;
}

export async function updateVolunteerStatus(volunteerId, status) {
  const { error } = await supabase.from("absence_volunteers").update({ status }).eq("id", volunteerId);
  if (error) throw error;
}

export async function removeVolunteer(volunteerId) {
  const { error } = await supabase.from("absence_volunteers").delete().eq("id", volunteerId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// PLANNING DE L'ÉQUIPE
// ---------------------------------------------------------------------------

export async function loadPlanning() {
  const { data, error } = await supabase.from("planning_shifts").select("*");
  if (error) throw error;
  return data.map((s) => ({
    id: s.id,
    prenom: s.prenom,
    jour: s.jour,
    heureDebut: s.heure_debut.slice(0, 5),
    heureFin: s.heure_fin.slice(0, 5),
  }));
}

export async function addShift({ prenom, jour, heureDebut, heureFin }) {
  const { data, error } = await supabase
    .from("planning_shifts")
    .insert({ prenom, jour, heure_debut: heureDebut, heure_fin: heureFin })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateShift(id, { prenom, jour, heureDebut, heureFin }) {
  const { error } = await supabase
    .from("planning_shifts")
    .update({ prenom, jour, heure_debut: heureDebut, heure_fin: heureFin })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteShift(id) {
  const { error } = await supabase.from("planning_shifts").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// ÉCHANGES
// ---------------------------------------------------------------------------

export async function loadExchanges() {
  const { data, error } = await supabase.from("exchanges").select("*").order("date", { ascending: true });
  if (error) throw error;
  return data.map((ex) => ({
    id: ex.id,
    prenom: ex.prenom,
    date: ex.date,
    heureDebut: ex.heure_debut.slice(0, 5),
    heureFin: ex.heure_fin.slice(0, 5),
    collegue: ex.collegue || "",
    collegueDate: ex.collegue_date || "",
    collegueHeureDebut: ex.collegue_heure_debut ? ex.collegue_heure_debut.slice(0, 5) : "",
    collegueHeureFin: ex.collegue_heure_fin ? ex.collegue_heure_fin.slice(0, 5) : "",
    status: ex.status,
    createdAt: ex.created_at,
  }));
}

export async function addExchange(exchange) {
  const { data, error } = await supabase
    .from("exchanges")
    .insert({
      prenom: exchange.prenom,
      date: exchange.date,
      heure_debut: exchange.heureDebut,
      heure_fin: exchange.heureFin,
      collegue: exchange.collegue || null,
      collegue_date: exchange.collegueDate || null,
      collegue_heure_debut: exchange.collegueHeureDebut || null,
      collegue_heure_fin: exchange.collegueHeureFin || null,
      status: exchange.status,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateExchange(id, fields) {
  const payload = {};
  if ("collegue" in fields) payload.collegue = fields.collegue;
  if ("collegueDate" in fields) payload.collegue_date = fields.collegueDate;
  if ("collegueHeureDebut" in fields) payload.collegue_heure_debut = fields.collegueHeureDebut;
  if ("collegueHeureFin" in fields) payload.collegue_heure_fin = fields.collegueHeureFin;
  if ("status" in fields) payload.status = fields.status;
  const { error } = await supabase.from("exchanges").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteExchange(id) {
  const { error } = await supabase.from("exchanges").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// AJUSTEMENTS MANUELS (tickets restaurant et heures)
// period_key est la même chaîne que celle déjà utilisée dans l'app,
// ex. "Sylvain|2026-8" ou "Sylvain|2026-toutes".
// ---------------------------------------------------------------------------

export async function loadTicketAdjustments() {
  const { data, error } = await supabase.from("ticket_adjustments").select("*");
  if (error) throw error;
  const map = {};
  for (const row of data) map[`${row.prenom}|${row.period_key}`] = { plus: row.plus, minus: row.minus };
  return map;
}

export async function setTicketAdjustment(prenom, periodKey, field, value) {
  const { error } = await supabase
    .from("ticket_adjustments")
    .upsert({ prenom, period_key: periodKey, [field]: value }, { onConflict: "prenom,period_key" });
  if (error) throw error;
}

export async function loadHoursAdjustments() {
  const { data, error } = await supabase.from("hours_adjustments").select("*");
  if (error) throw error;
  const map = {};
  for (const row of data) map[`${row.prenom}|${row.period_key}`] = { plus: row.plus, minus: row.minus };
  return map;
}

export async function setHoursAdjustment(prenom, periodKey, field, value) {
  const { error } = await supabase
    .from("hours_adjustments")
    .upsert({ prenom, period_key: periodKey, [field]: value }, { onConflict: "prenom,period_key" });
  if (error) throw error;
}
