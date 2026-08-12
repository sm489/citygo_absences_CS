import { useState, useEffect, useMemo, useRef } from "react";
import { Calendar, Clock, Trash2, AlertCircle, Loader2, HandHelping, X, CheckCircle2, Pencil, Save, Settings, ArrowLeft, Archive, Repeat, Plus, Users, ListTodo, BarChart3, ArrowLeftRight, Utensils, Info, Eye, EyeOff } from "lucide-react";
import {
  signUp,
  signIn,
  signOut,
  requestPasswordReset,
  updatePassword,
  getCurrentSession,
  getCurrentProfile,
  onAuthStateChange,
} from "./authLayer";
import {
  loadAbsences,
  addAbsence,
  updateAbsence,
  deleteAbsence,
  addVolunteer,
  updateVolunteerStatus,
  removeVolunteer,
  loadPlanning,
  addShift,
  updateShift,
  deleteShift,
  loadExchanges,
  addExchange,
  updateExchange,
  deleteExchange,
  loadTicketAdjustments,
  setTicketAdjustment,
  loadHoursAdjustments,
  setHoursAdjustment,
} from "./dataLayer";

function formatDateLong(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

// Personnes en freelance, mises en avant visuellement dans les tableaux de l'administration.
const FREELANCE_NAMES = new Set(["Aurore", "Yann", "Gabrielle", "Hamza", "Corolla", "Khalid", "Camille"]);
const TICKETS_EXCLUDED_NAMES = new Set(["Boris"]);

// Réunion CS récurrente : le mardi de 15h à 16h.
const MEETING_DAY = "Mardi";
const MEETING_START = 15 * 60;
const MEETING_END = 16 * 60;
const MEETING_ATTENDEES = new Set(["Boris", "Capucine", "Clémence", "Sylvain", "Hamza"]);

// Découpe un créneau [start,end) en sous-parties, en isolant la portion qui tombe dans la réunion CS.
function splitSegmentForMeeting(start, end, isMeetingDay) {
  if (!isMeetingDay) return [{ start, end, isMeeting: false }];
  const chunks = [];
  if (start < MEETING_START) chunks.push({ start, end: Math.min(end, MEETING_START), isMeeting: false });
  const overlapStart = Math.max(start, MEETING_START);
  const overlapEnd = Math.min(end, MEETING_END);
  if (overlapStart < overlapEnd) chunks.push({ start: overlapStart, end: overlapEnd, isMeeting: true });
  if (end > MEETING_END) chunks.push({ start: Math.max(start, MEETING_END), end, isMeeting: false });
  return chunks.filter((c) => c.end > c.start);
}

const SEED_PLANNING = [
  { id: "seed-0", prenom: "Astrid", jour: "Lundi", heureDebut: "13:00", heureFin: "17:00" },
  { id: "seed-1", prenom: "Astrid", jour: "Lundi", heureDebut: "18:00", heureFin: "19:00" },
  { id: "seed-2", prenom: "Aurore", jour: "Lundi", heureDebut: "00:00", heureFin: "01:00" },
  { id: "seed-3", prenom: "Boris", jour: "Lundi", heureDebut: "14:00", heureFin: "17:00" },
  { id: "seed-4", prenom: "Boris", jour: "Lundi", heureDebut: "18:00", heureFin: "19:00" },
  { id: "seed-5", prenom: "Boris", jour: "Lundi", heureDebut: "23:00", heureFin: "23:59" },
  { id: "seed-6", prenom: "Capucine", jour: "Lundi", heureDebut: "09:00", heureFin: "13:00" },
  { id: "seed-7", prenom: "Capucine", jour: "Lundi", heureDebut: "14:00", heureFin: "17:00" },
  { id: "seed-8", prenom: "Clémence", jour: "Lundi", heureDebut: "09:00", heureFin: "14:00" },
  { id: "seed-9", prenom: "Clémence", jour: "Lundi", heureDebut: "15:00", heureFin: "17:00" },
  { id: "seed-10", prenom: "Corolla", jour: "Lundi", heureDebut: "01:00", heureFin: "07:00" },
  { id: "seed-11", prenom: "Emeline", jour: "Lundi", heureDebut: "09:00", heureFin: "13:00" },
  { id: "seed-12", prenom: "Gabrielle", jour: "Lundi", heureDebut: "02:00", heureFin: "08:00" },
  { id: "seed-13", prenom: "Hamza", jour: "Lundi", heureDebut: "19:00", heureFin: "23:59" },
  { id: "seed-14", prenom: "Sylvain", jour: "Lundi", heureDebut: "09:00", heureFin: "13:00" },
  { id: "seed-15", prenom: "Sylvain", jour: "Lundi", heureDebut: "14:00", heureFin: "17:00" },
  { id: "seed-16", prenom: "Victoria", jour: "Lundi", heureDebut: "19:00", heureFin: "22:00" },
  { id: "seed-17", prenom: "Astrid", jour: "Mardi", heureDebut: "19:00", heureFin: "22:00" },
  { id: "seed-18", prenom: "Astrid", jour: "Mardi", heureDebut: "23:00", heureFin: "23:59" },
  { id: "seed-19", prenom: "Aurore", jour: "Mardi", heureDebut: "08:00", heureFin: "11:00" },
  { id: "seed-20", prenom: "Boris", jour: "Mardi", heureDebut: "00:00", heureFin: "04:00" },
  { id: "seed-21", prenom: "Boris", jour: "Mardi", heureDebut: "14:00", heureFin: "15:00" },
  { id: "seed-22", prenom: "Boris", jour: "Mardi", heureDebut: "16:00", heureFin: "17:00" },
  { id: "seed-23", prenom: "Capucine", jour: "Mardi", heureDebut: "09:00", heureFin: "13:00" },
  { id: "seed-24", prenom: "Capucine", jour: "Mardi", heureDebut: "14:00", heureFin: "15:00" },
  { id: "seed-25", prenom: "Capucine", jour: "Mardi", heureDebut: "16:00", heureFin: "17:00" },
  { id: "seed-26", prenom: "Clémence", jour: "Mardi", heureDebut: "09:30", heureFin: "17:30" },
  { id: "seed-28", prenom: "Clémence", jour: "Mardi", heureDebut: "21:00", heureFin: "23:00" },
  { id: "seed-29", prenom: "Corolla", jour: "Mardi", heureDebut: "03:00", heureFin: "08:00" },
  { id: "seed-30", prenom: "Emeline", jour: "Mardi", heureDebut: "09:00", heureFin: "13:00" },
  { id: "seed-31", prenom: "Hamza", jour: "Mardi", heureDebut: "13:00", heureFin: "15:00" },
  { id: "seed-32", prenom: "Hamza", jour: "Mardi", heureDebut: "16:00", heureFin: "18:00" },
  { id: "seed-33", prenom: "Khalid", jour: "Mardi", heureDebut: "19:00", heureFin: "21:00" },
  { id: "seed-34", prenom: "Sylvain", jour: "Mardi", heureDebut: "10:00", heureFin: "13:00" },
  { id: "seed-35", prenom: "Sylvain", jour: "Mardi", heureDebut: "14:00", heureFin: "15:00" },
  { id: "seed-36", prenom: "Sylvain", jour: "Mardi", heureDebut: "16:00", heureFin: "18:00" },
  { id: "seed-37", prenom: "Astrid", jour: "Mercredi", heureDebut: "14:00", heureFin: "17:00" },
  { id: "seed-38", prenom: "Astrid", jour: "Mercredi", heureDebut: "19:00", heureFin: "22:00" },
  { id: "seed-39", prenom: "Astrid", jour: "Mercredi", heureDebut: "23:00", heureFin: "23:59" },
  { id: "seed-40", prenom: "Aurore", jour: "Mercredi", heureDebut: "08:00", heureFin: "13:00" },
  { id: "seed-41", prenom: "Capucine", jour: "Mercredi", heureDebut: "09:00", heureFin: "13:00" },
  { id: "seed-42", prenom: "Capucine", jour: "Mercredi", heureDebut: "14:00", heureFin: "17:00" },
  { id: "seed-43", prenom: "Clémence", jour: "Mercredi", heureDebut: "10:00", heureFin: "18:00" },
  { id: "seed-45", prenom: "Clémence", jour: "Mercredi", heureDebut: "21:00", heureFin: "23:00" },
  { id: "seed-46", prenom: "Corolla", jour: "Mercredi", heureDebut: "03:00", heureFin: "08:00" },
  { id: "seed-47", prenom: "Hamza", jour: "Mercredi", heureDebut: "13:00", heureFin: "18:00" },
  { id: "seed-48", prenom: "Khalid", jour: "Mercredi", heureDebut: "19:00", heureFin: "21:00" },
  { id: "seed-49", prenom: "Sylvain", jour: "Mercredi", heureDebut: "09:00", heureFin: "13:00" },
  { id: "seed-50", prenom: "Sylvain", jour: "Mercredi", heureDebut: "14:00", heureFin: "17:00" },
  { id: "seed-51", prenom: "Yann", jour: "Mercredi", heureDebut: "00:00", heureFin: "04:00" },
  { id: "seed-52", prenom: "Astrid", jour: "Jeudi", heureDebut: "13:00", heureFin: "16:00" },
  { id: "seed-53", prenom: "Aurore", jour: "Jeudi", heureDebut: "16:00", heureFin: "18:00" },
  { id: "seed-54", prenom: "Capucine", jour: "Jeudi", heureDebut: "09:00", heureFin: "13:00" },
  { id: "seed-55", prenom: "Capucine", jour: "Jeudi", heureDebut: "14:00", heureFin: "17:00" },
  { id: "seed-56", prenom: "Clémence", jour: "Jeudi", heureDebut: "10:00", heureFin: "14:00" },
  { id: "seed-57", prenom: "Clémence", jour: "Jeudi", heureDebut: "15:00", heureFin: "18:00" },
  { id: "seed-58", prenom: "Corolla", jour: "Jeudi", heureDebut: "03:00", heureFin: "08:00" },
  { id: "seed-59", prenom: "Emeline", jour: "Jeudi", heureDebut: "10:00", heureFin: "13:00" },
  { id: "seed-60", prenom: "Hamza", jour: "Jeudi", heureDebut: "13:00", heureFin: "18:00" },
  { id: "seed-61", prenom: "Romane", jour: "Jeudi", heureDebut: "19:00", heureFin: "23:59" },
  { id: "seed-62", prenom: "Sylvain", jour: "Jeudi", heureDebut: "09:00", heureFin: "13:00" },
  { id: "seed-63", prenom: "Sylvain", jour: "Jeudi", heureDebut: "14:00", heureFin: "17:00" },
  { id: "seed-64", prenom: "Victoria", jour: "Jeudi", heureDebut: "19:00", heureFin: "23:59" },
  { id: "seed-65", prenom: "Yann", jour: "Jeudi", heureDebut: "00:00", heureFin: "04:00" },
  { id: "seed-66", prenom: "Yann", jour: "Jeudi", heureDebut: "18:00", heureFin: "21:00" },
  { id: "seed-67", prenom: "Astrid", jour: "Vendredi", heureDebut: "13:00", heureFin: "17:00" },
  { id: "seed-68", prenom: "Aurore", jour: "Vendredi", heureDebut: "17:00", heureFin: "23:59" },
  { id: "seed-69", prenom: "Boris", jour: "Vendredi", heureDebut: "23:00", heureFin: "23:59" },
  { id: "seed-70", prenom: "Capucine", jour: "Vendredi", heureDebut: "09:00", heureFin: "13:00" },
  { id: "seed-71", prenom: "Capucine", jour: "Vendredi", heureDebut: "15:00", heureFin: "17:00" },
  { id: "seed-72", prenom: "Clémence", jour: "Vendredi", heureDebut: "09:00", heureFin: "14:00" },
  { id: "seed-73", prenom: "Clémence", jour: "Vendredi", heureDebut: "15:00", heureFin: "18:00" },
  { id: "seed-74", prenom: "Corolla", jour: "Vendredi", heureDebut: "02:00", heureFin: "08:00" },
  { id: "seed-75", prenom: "Gabrielle", jour: "Vendredi", heureDebut: "08:00", heureFin: "13:00" },
  { id: "seed-76", prenom: "Khalid", jour: "Vendredi", heureDebut: "19:00", heureFin: "22:00" },
  { id: "seed-77", prenom: "Romane", jour: "Vendredi", heureDebut: "18:00", heureFin: "20:00" },
  { id: "seed-78", prenom: "Sylvain", jour: "Vendredi", heureDebut: "09:00", heureFin: "13:00" },
  { id: "seed-79", prenom: "Sylvain", jour: "Vendredi", heureDebut: "14:00", heureFin: "17:00" },
  { id: "seed-80", prenom: "Yann", jour: "Vendredi", heureDebut: "00:00", heureFin: "02:00" },
  { id: "seed-81", prenom: "Yann", jour: "Vendredi", heureDebut: "15:00", heureFin: "19:00" },
  { id: "seed-82", prenom: "Alice", jour: "Samedi", heureDebut: "14:00", heureFin: "19:00" },
  { id: "seed-83", prenom: "Aurore", jour: "Samedi", heureDebut: "09:00", heureFin: "14:00" },
  { id: "seed-84", prenom: "Boris", jour: "Samedi", heureDebut: "00:00", heureFin: "04:00" },
  { id: "seed-85", prenom: "Boris", jour: "Samedi", heureDebut: "22:00", heureFin: "23:59" },
  { id: "seed-86", prenom: "Gabrielle", jour: "Samedi", heureDebut: "02:00", heureFin: "08:00" },
  { id: "seed-87", prenom: "Khalid", jour: "Samedi", heureDebut: "19:00", heureFin: "23:59" },
  { id: "seed-88", prenom: "Victoria", jour: "Samedi", heureDebut: "08:00", heureFin: "11:00" },
  { id: "seed-89", prenom: "Alice", jour: "Dimanche", heureDebut: "14:00", heureFin: "19:00" },
  { id: "seed-90", prenom: "Astrid", jour: "Dimanche", heureDebut: "12:00", heureFin: "15:00" },
  { id: "seed-91", prenom: "Aurore", jour: "Dimanche", heureDebut: "21:00", heureFin: "23:59" },
  { id: "seed-92", prenom: "Boris", jour: "Dimanche", heureDebut: "00:00", heureFin: "04:00" },
  { id: "seed-93", prenom: "Gabrielle", jour: "Dimanche", heureDebut: "02:00", heureFin: "08:00" },
  { id: "seed-94", prenom: "Khalid", jour: "Dimanche", heureDebut: "09:00", heureFin: "14:00" },
  { id: "seed-95", prenom: "Romane", jour: "Dimanche", heureDebut: "19:00", heureFin: "23:59" },
  { id: "seed-96", prenom: "Victoria", jour: "Dimanche", heureDebut: "09:00", heureFin: "11:00" },
  { id: "seed-97", prenom: "Victoria", jour: "Dimanche", heureDebut: "18:00", heureFin: "21:00" },
];

// Personnes à temps plein dont la pause déjeuner n'est pas fixe : on affiche leur journée
// comme un seul créneau continu plutôt que deux créneaux séparés par un trou.
const FULLTIME_CONTINUOUS_NAMES = new Set(["Clémence", "Sylvain"]);

function mergeFullDayShifts(planningArr) {
  const MAX_GAP_MINUTES = 120; // pause déjeuner irrégulière : on fusionne. Une vraie coupure (soir) reste séparée.
  const minutesOf = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  const kept = [];
  const groups = new Map(); // "prenom|jour" -> liste de créneaux

  for (const s of planningArr) {
    if (!FULLTIME_CONTINUOUS_NAMES.has(s.prenom)) {
      kept.push(s);
      continue;
    }
    const key = `${s.prenom}|${s.jour}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  const result = [...kept];
  for (const shifts of groups.values()) {
    const ordered = [...shifts].sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
    let current = null;
    for (const s of ordered) {
      if (current && minutesOf(s.heureDebut) - minutesOf(current.heureFin) <= MAX_GAP_MINUTES) {
        if (s.heureFin > current.heureFin) current.heureFin = s.heureFin;
      } else {
        if (current) result.push(current);
        current = { ...s };
      }
    }
    if (current) result.push(current);
  }

  return result;
}

// Correction ponctuelle : remet les créneaux exacts de Clémence le mardi et le mercredi,
// qui avaient pu être mal fusionnés par une version précédente de la fusion "journée continue".
function fixClemenceShifts(planningArr) {
  const withoutOldEntries = planningArr.filter(
    (s) => s.prenom !== "Clémence" && s.prenom !== "Sylvain"
  );
  return [
    ...withoutOldEntries,
    // Clémence : un seul créneau continu par jour (pause déjeuner non affichée dans le planning).
    // Les créneaux du soir (mardi/mercredi 21h-23h) sont de vraies coupures distinctes, gardées à part.
    { id: "clemence-lun", prenom: "Clémence", jour: "Lundi", heureDebut: "09:00", heureFin: "17:00" },
    { id: "clemence-mar-1", prenom: "Clémence", jour: "Mardi", heureDebut: "09:30", heureFin: "17:30" },
    { id: "clemence-mar-2", prenom: "Clémence", jour: "Mardi", heureDebut: "21:00", heureFin: "23:00" },
    { id: "clemence-mer-1", prenom: "Clémence", jour: "Mercredi", heureDebut: "10:00", heureFin: "18:00" },
    { id: "clemence-mer-2", prenom: "Clémence", jour: "Mercredi", heureDebut: "21:00", heureFin: "23:00" },
    { id: "clemence-jeu", prenom: "Clémence", jour: "Jeudi", heureDebut: "10:00", heureFin: "18:00" },
    { id: "clemence-ven", prenom: "Clémence", jour: "Vendredi", heureDebut: "09:00", heureFin: "18:00" },
    // Sylvain : un seul créneau continu par jour, même logique.
    { id: "sylvain-lun", prenom: "Sylvain", jour: "Lundi", heureDebut: "09:00", heureFin: "17:00" },
    { id: "sylvain-mar", prenom: "Sylvain", jour: "Mardi", heureDebut: "10:00", heureFin: "18:00" },
    { id: "sylvain-mer", prenom: "Sylvain", jour: "Mercredi", heureDebut: "09:00", heureFin: "17:00" },
    { id: "sylvain-jeu", prenom: "Sylvain", jour: "Jeudi", heureDebut: "09:00", heureFin: "17:00" },
    { id: "sylvain-ven", prenom: "Sylvain", jour: "Vendredi", heureDebut: "09:00", heureFin: "17:00" },
  ];
}

// Créneaux "tickets" pris en compte dans les Heures travaillées pour Clémence et Sylvain,
// indépendamment de leur planning réel (qui reste inchangé, cf. fixClemenceShifts ci-dessus).
const TICKETING_HOURS_OVERRIDE = {
  Clémence: [
    { jour: "Lundi", heureDebut: "09:00", heureFin: "17:00" },
    { jour: "Mercredi", heureDebut: "10:00", heureFin: "14:00" },
    { jour: "Jeudi", heureDebut: "10:00", heureFin: "14:00" },
  ],
  Sylvain: [
    { jour: "Mercredi", heureDebut: "09:00", heureFin: "13:00" },
    { jour: "Jeudi", heureDebut: "09:00", heureFin: "13:00" },
  ],
};

// Calcule le dimanche de Pâques (algorithme de Gauss) pour en déduire les jours fériés mobiles.
function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Jours fériés français (métropole) pour une année donnée, au format "YYYY-MM-DD".
function getFrenchHolidays(year) {
  const holidays = new Set([
    `${year}-01-01`,
    `${year}-05-01`,
    `${year}-05-08`,
    `${year}-07-14`,
    `${year}-08-15`,
    `${year}-11-01`,
    `${year}-11-11`,
    `${year}-12-25`,
  ]);
  const easter = getEasterSunday(year);
  const addDays = (d, n) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + n);
    return nd;
  };
  holidays.add(toDateStr(addDays(easter, 1))); // lundi de Pâques
  holidays.add(toDateStr(addDays(easter, 39))); // Ascension
  holidays.add(toDateStr(addDays(easter, 50))); // lundi de Pentecôte
  return holidays;
}

function isPast(entry) {
  const today = new Date().toISOString().slice(0, 10);
  return entry.date < today;
}

// Vérifie si une date "YYYY-MM-DD" est un jour férié français.
function isFrenchHoliday(dateStr) {
  return getFrenchHolidays(Number(dateStr.slice(0, 4))).has(dateStr);
}

// Un échange n'est archivé qu'une fois les deux créneaux passés (le plus tardif des deux dates).
function isExchangePast(ex) {
  const today = new Date().toISOString().slice(0, 10);
  const laterDate = ex.date > ex.collegueDate ? ex.date : ex.collegueDate;
  return laterDate < today;
}

// Calcule les créneaux de l'absence qui ne sont couverts par aucun remplaçant validé.
// Les heures sont au format "HH:MM", donc la comparaison de chaînes suffit à les ordonner.
function getUncoveredRanges(entry, approvedVolunteers) {
  const intervals = [...approvedVolunteers]
    .map((v) => [v.heureDebut, v.heureFin])
    .sort((a, b) => a[0].localeCompare(b[0]));

  const gaps = [];
  let current = entry.heureDebut;

  for (const [debut, fin] of intervals) {
    if (debut > current) gaps.push([current, debut]);
    if (fin > current) current = fin;
  }
  if (current < entry.heureFin) gaps.push([current, entry.heureFin]);

  return gaps;
}

// Statut global d'une absence, utilisé pour les filtres de la liste.
function getEntryStatus(entry) {
  const approved = entry.volunteers.filter((v) => v.status === "approved" || !v.status);
  const uncovered = getUncoveredRanges(entry, approved);
  if (uncovered.length === 0) return "complet";
  if (approved.length > 0) return "partiel";
  return "a_pourvoir";
}

// Convertit "HH:MM" en minutes depuis minuit.
function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// "23:59" est utilisé comme fin de créneau à minuit (limite du champ <input type="time">).
// Pour l'affichage et le calcul de durée, on le traite comme minuit (00:00 / 24h00).
function formatHeureAffichage(hhmm) {
  return hhmm === "23:59" ? "00:00" : hhmm;
}

function effectiveEndMinutes(hhmm) {
  return hhmm === "23:59" ? 24 * 60 : timeToMinutes(hhmm);
}

// Chevauchement en minutes entre [aStart,aEnd) et [bStart,bEnd).
function overlapMinutes(aStart, aEnd, bStart, bEnd) {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

// Formate une durée en minutes sous la forme "3h30" ou "2h".
function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

// Met une majuscule après le début de chaîne, un espace ou un tiret (ex. "jean-pierre" -> "Jean-Pierre").
function capitalizeName(s) {
  return s.replace(/(^|[\s-])(\p{L})/gu, (_, sep, letter) => sep + letter.toUpperCase());
}

// --- Aide au calcul des tickets restaurant (intervalles en minutes depuis minuit) ---
function mergeIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [s, e] of sorted) {
    if (merged.length && s <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
    } else {
      merged.push([s, e]);
    }
  }
  return merged;
}

function subtractInterval(intervals, subStart, subEnd) {
  const result = [];
  for (const [s, e] of intervals) {
    if (e <= subStart || s >= subEnd) {
      result.push([s, e]);
    } else {
      if (s < subStart) result.push([s, subStart]);
      if (e > subEnd) result.push([subEnd, e]);
    }
  }
  return result;
}

function coversSlot(intervals, slotStart, slotEnd) {
  return mergeIntervals(intervals).some(([s, e]) => s <= slotStart && e >= slotEnd);
}

export default function AbsenceTracker() {
  // Charge les polices de la charte Citygo (Poppins en remplacement de ClashDisplay,
  // une police propriétaire non disponible via Google Fonts).
  useEffect(() => {
    const id = "citygo-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  const [entries, setEntries] = useState(null); // null = chargement
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // formulaire (manager)
  const [prenom, setPrenom] = useState("");
  const [date, setDate] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [formError, setFormError] = useState("");
  const [invalidFields, setInvalidFields] = useState({});
  const formTopRef = useRef(null);

  // positionnement en cours (id d'entrée -> { prenom, heureDebut, heureFin })
  const [volunteerDraft, setVolunteerDraft] = useState({});
  const [volunteerFormError, setVolunteerFormError] = useState({});
  const [openVolunteerFor, setOpenVolunteerFor] = useState(null);

  // édition d'une absence existante
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ prenom: "", date: "", heureDebut: "", heureFin: "" });
  const [editError, setEditError] = useState("");

  // filtre de statut pour la liste des absences
  const [statusFilter, setStatusFilter] = useState("toutes");

  // navigation : page principale ou page d'administration
  const [page, setPage] = useState("main");

  // filtres année / mois indépendants pour chacune des 3 cartes de l'administration
  const today = new Date();
  const [statsYearFilter, setStatsYearFilter] = useState(today.getFullYear());
  const [statsMonthFilter, setStatsMonthFilter] = useState(today.getMonth() + 1);
  const [hoursYearFilter, setHoursYearFilter] = useState(today.getFullYear());
  const [hoursMonthFilter, setHoursMonthFilter] = useState(today.getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(today.getFullYear());
  const [monthFilter, setMonthFilter] = useState(today.getMonth() + 1);

  // ajustements manuels des tickets restaurant (par personne et par période sélectionnée)
  const [ticketAdjustments, setTicketAdjustments] = useState({});
  const [showTicketInfo, setShowTicketInfo] = useState(false);
  const [showHoursInfo, setShowHoursInfo] = useState(false);


  // ajustements manuels des heures hebdomadaires (par personne et par période sélectionnée)
  const [hoursAdjustments, setHoursAdjustments] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const map = await loadHoursAdjustments();
        setHoursAdjustments(map);
      } catch (e) {
        console.error("Erreur de chargement des ajustements d'heures:", e);
        setHoursAdjustments({});
      }
    })();
  }, []);

  function hoursAdjustmentKeyFor(prenom) {
    return `${prenom}|${hoursYearFilter}-${hoursMonthFilter}`;
  }

  async function updateHoursAdjustment(prenom, field, value) {
    const periodKey = `${hoursYearFilter}-${hoursMonthFilter}`;
    const key = `${prenom}|${periodKey}`;
    const n = Math.max(0, parseFloat(value) || 0);
    setHoursAdjustments((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { plus: 0, minus: 0 }), [field]: n },
    }));
    try {
      await setHoursAdjustment(prenom, periodKey, field, n);
    } catch (e) {
      console.error("Erreur de sauvegarde de l'ajustement:", e);
    }
  }
  const [showPlanningInfo, setShowPlanningInfo] = useState(false);
  const [showGhostInfo, setShowGhostInfo] = useState(false);

  // Authentification réelle via Supabase Auth (remplace l'ancien système "fait
  // main" : mots de passe hashés côté serveur, sessions gérées automatiquement,
  // vrais emails envoyés pour la réinitialisation du mot de passe).
  const [authUser, setAuthUser] = useState(null); // { email, isAdmin } | null
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    (async () => {
      // Si la personne arrive depuis le lien "mot de passe oublié" reçu par email,
      // Supabase la reconnecte automatiquement et on affiche l'écran "nouveau mot de passe".
      if (window.location.hash.includes("type=recovery")) {
        setAuthView("reset");
      }
      const session = await getCurrentSession();
      if (session) {
        let remembered = true;
        let sameBrowserSession = false;
        try {
          remembered = localStorage.getItem("citygo_remember") !== "false";
          sameBrowserSession = sessionStorage.getItem("citygo_active") === "1";
        } catch (e) {
          // stockage indisponible : on garde le comportement par défaut (rester connecté)
        }
        if (!remembered && !sameBrowserSession) {
          // "Rester connecté" n'était pas cochée et le navigateur a été complètement
          // fermé puis rouvert depuis : on déconnecte, comme demandé.
          await signOut();
          setAuthUser(null);
        } else {
          try {
            sessionStorage.setItem("citygo_active", "1");
          } catch (e) {}
          const profile = await getCurrentProfile();
          setAuthUser(profile);
        }
      }
      setCheckingSession(false);
    })();

    const subscription = onAuthStateChange(async (session) => {
      if (session) {
        const profile = await getCurrentProfile();
        setAuthUser(profile);
      } else {
        setAuthUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Vue de la page de connexion : "login" | "signup" | "forgot" | "reset"
  const [authView, setAuthView] = useState("login");
  const [authError, setAuthError] = useState("");
  const [authInfo, setAuthInfo] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const [signupPrenom, setSignupPrenom] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetNewPasswordConfirm, setResetNewPasswordConfirm] = useState("");

  // visibilité des champs mot de passe (afficher/masquer)
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetNewPasswordConfirm, setShowResetNewPasswordConfirm] = useState(false);

  async function handleSignup() {
    if (signupPassword.length < 6) {
      setAuthError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (signupPassword !== signupConfirm) {
      setAuthError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    const result = await signUp(signupEmail.trim().toLowerCase(), signupPassword, signupPrenom);
    if (result.error) {
      setAuthError(result.error);
      return;
    }
    setAuthError("");
    setSignupPrenom("");
    setSignupPassword("");
    setSignupConfirm("");
    if (result.data.session) {
      // Confirmation par email désactivée dans les réglages Supabase : connecté directement.
      const profile = await getCurrentProfile();
      setAuthUser(profile);
    } else {
      // Cas normal : un email de confirmation vient d'être envoyé.
      setAuthInfo("Compte créé ! Vérifiez votre boîte email pour confirmer votre adresse avant de vous connecter.");
      setAuthView("login");
    }
  }

  async function handleLogin() {
    if (!loginEmail || !loginPassword) {
      setAuthError("Renseignez votre email et votre mot de passe.");
      return;
    }
    const result = await signIn(loginEmail.trim().toLowerCase(), loginPassword);
    if (result.error) {
      setAuthError(result.error);
      return;
    }
    setAuthError("");
    setLoginPassword("");
    try {
      localStorage.setItem("citygo_remember", rememberMe ? "true" : "false");
      sessionStorage.setItem("citygo_active", "1");
    } catch (e) {
      // stockage indisponible (navigation privée très restrictive) : on continue sans "se souvenir"
    }
    const profile = await getCurrentProfile();
    setAuthUser(profile);
  }

  async function handleLogout() {
    await signOut();
    setAuthUser(null);
    setLoginEmail("");
    setLoginPassword("");
    setAuthView("login");
    setAuthError("");
    setAuthInfo("");
    try {
      localStorage.removeItem("citygo_remember");
      sessionStorage.removeItem("citygo_active");
    } catch (e) {}
  }

  async function handleRequestReset() {
    const result = await requestPasswordReset(forgotEmail.trim().toLowerCase());
    if (result.error) {
      setAuthError(result.error);
      return;
    }
    setAuthError("");
    setAuthInfo("Un email avec un lien de réinitialisation vient d'être envoyé, s'il existe un compte avec cette adresse.");
    setAuthView("login");
  }

  async function handleResetPassword() {
    if (resetNewPassword.length < 6) {
      setAuthError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (resetNewPassword !== resetNewPasswordConfirm) {
      setAuthError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    const result = await updatePassword(resetNewPassword);
    if (result.error) {
      setAuthError(result.error);
      return;
    }
    setAuthError("");
    setAuthInfo("Mot de passe mis à jour. Vous êtes connecté(e).");
    setResetNewPassword("");
    setResetNewPasswordConfirm("");
    const profile = await getCurrentProfile();
    setAuthUser(profile);
  }

  const isAdmin = !!authUser?.isAdmin;
  const canEditPlanning = isAdmin;
  const canEditArchive = authUser?.email?.toLowerCase() === "sm@citygo.me";

  useEffect(() => {
    if (page === "admin" && !isAdmin) setPage("main");
  }, [isAdmin, page]);

  useEffect(() => {
    (async () => {
      try {
        const map = await loadTicketAdjustments();
        setTicketAdjustments(map);
      } catch (e) {
        console.error("Erreur de chargement des ajustements de tickets:", e);
        setTicketAdjustments({});
      }
    })();
  }, []);

  function adjustmentKeyFor(prenom) {
    return `${prenom}|${yearFilter}-${monthFilter}`;
  }

  async function updateTicketAdjustment(prenom, field, value) {
    const periodKey = `${yearFilter}-${monthFilter}`;
    const key = `${prenom}|${periodKey}`;
    const n = Math.max(0, Number(value) || 0);
    setTicketAdjustments((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { plus: 0, minus: 0 }), [field]: n },
    }));
    try {
      await setTicketAdjustment(prenom, periodKey, field, n);
    } catch (e) {
      console.error("Erreur de sauvegarde de l'ajustement:", e);
    }
  }

  // filtres année / mois pour la liste des échanges (mois en cours par défaut)
  const [exYearFilter, setExYearFilter] = useState(today.getFullYear());
  const [exMonthFilter, setExMonthFilter] = useState("toutes");

  // planning de l'équipe (administration)
  const [planning, setPlanning] = useState(null); // null = chargement
  const [planningSaving, setPlanningSaving] = useState(false);
  const [planningError, setPlanningError] = useState("");
  const [planPrenom, setPlanPrenom] = useState("");
  const [planJour, setPlanJour] = useState("");
  const [planHeureDebut, setPlanHeureDebut] = useState("");
  const [planHeureFin, setPlanHeureFin] = useState("");
  const [planFormError, setPlanFormError] = useState("");
  const [planInvalidFields, setPlanInvalidFields] = useState({});
  const [planEditingId, setPlanEditingId] = useState(null);
  const [planEditDraft, setPlanEditDraft] = useState({ prenom: "", jour: "Lundi", heureDebut: "", heureFin: "" });
  const [planEditError, setPlanEditError] = useState("");

  // échanges de créneaux (page Échanges)
  const [exchanges, setExchanges] = useState(null); // null = chargement
  const [exchangesSaving, setExchangesSaving] = useState(false);
  const [exchangesError, setExchangesError] = useState("");
  const [exPrenom, setExPrenom] = useState("");

  useEffect(() => {
    if (authUser?.prenom && !exPrenom) setExPrenom(authUser.prenom);
  }, [authUser]);
  const [exDate, setExDate] = useState("");
  const [exHeureDebut, setExHeureDebut] = useState("");
  const [exHeureFin, setExHeureFin] = useState("");
  const [exCollegue, setExCollegue] = useState("");
  const [exCollegueDate, setExCollegueDate] = useState("");
  const [exCollegueHeureDebut, setExCollegueHeureDebut] = useState("");
  const [exCollegueHeureFin, setExCollegueHeureFin] = useState("");

  // Positionnement sur un échange "ouvert" (sans contrepartie renseignée au départ)
  const [exPositionDraft, setExPositionDraft] = useState({});
  const [exPositionOpenFor, setExPositionOpenFor] = useState(null);
  const [exPositionError, setExPositionError] = useState({});
  const [exFormError, setExFormError] = useState("");
  const [exInvalidFields, setExInvalidFields] = useState({});

  useEffect(() => {
    (async () => {
      try {
        let data = await loadPlanning();
        if (data.length === 0) {
          // Première utilisation : on sème le planning de départ, déjà corrigé
          // (créneaux continus pour Clémence/Sylvain, sans coupure de pause).
          const seed = fixClemenceShifts(mergeFullDayShifts(SEED_PLANNING));
          for (const s of seed) {
            await addShift({ prenom: s.prenom, jour: s.jour, heureDebut: s.heureDebut, heureFin: s.heureFin });
          }
          data = await loadPlanning();
        }
        setPlanning(data);
      } catch (e) {
        console.error("Erreur de chargement du planning:", e);
        setPlanning([]);
      }
    })();
  }, []);

  async function refreshPlanning() {
    try {
      const data = await loadPlanning();
      setPlanning(data);
    } catch (e) {
      console.error("Erreur de chargement du planning:", e);
    }
  }

  async function refreshExchanges() {
    try {
      const data = await loadExchanges();
      setExchanges(data);
    } catch (e) {
      console.error("Erreur de chargement des échanges:", e);
      setExchanges([]);
    }
  }

  useEffect(() => {
    refreshExchanges();
  }, []);

  async function handleAddExchange() {
    const missing = {};
    if (!exPrenom.trim()) missing.exPrenom = true;
    if (!exDate) missing.exDate = true;
    if (!exHeureDebut) missing.exHeureDebut = true;
    if (!exHeureFin) missing.exHeureFin = true;

    // Le créneau échangé (collègue) est facultatif : soit tous ses champs sont remplis,
    // soit aucun (l'échange est alors publié "ouvert", en attente qu'un collègue se positionne).
    const collegueFields = [exCollegue.trim(), exCollegueDate, exCollegueHeureDebut, exCollegueHeureFin];
    const collegueFilledCount = collegueFields.filter(Boolean).length;
    const hasCollegue = collegueFilledCount === 4;
    if (collegueFilledCount > 0 && collegueFilledCount < 4) {
      if (!exCollegue.trim()) missing.exCollegue = true;
      if (!exCollegueDate) missing.exCollegueDate = true;
      if (!exCollegueHeureDebut) missing.exCollegueHeureDebut = true;
      if (!exCollegueHeureFin) missing.exCollegueHeureFin = true;
    }

    if (Object.keys(missing).length > 0) {
      setExInvalidFields(missing);
      setExFormError(
        collegueFilledCount > 0 && collegueFilledCount < 4
          ? "Complétez tous les champs du créneau échangé, ou laissez-les tous vides pour publier l'échange sans contrepartie pour l'instant."
          : "Merci de compléter les champs de votre créneau."
      );
      return;
    }
    if (exHeureFin <= exHeureDebut) {
      setExInvalidFields({ exHeureDebut: true, exHeureFin: true });
      setExFormError("Pour votre créneau, l'heure de fin doit être après l'heure de début.");
      return;
    }
    if (hasCollegue && exCollegueHeureFin <= exCollegueHeureDebut) {
      setExInvalidFields({ exCollegueHeureDebut: true, exCollegueHeureFin: true });
      setExFormError("Pour le créneau échangé, l'heure de fin doit être après l'heure de début.");
      return;
    }
    if (isUnknownName(exPrenom)) {
      setExInvalidFields({ exPrenom: true });
      setExFormError("Prénom inconnu de l'équipe, vérifiez l'orthographe.");
      return;
    }
    if (hasCollegue && isUnknownName(exCollegue)) {
      setExInvalidFields({ exCollegue: true });
      setExFormError("Prénom du collègue inconnu de l'équipe, vérifiez l'orthographe.");
      return;
    }

    setExFormError("");
    setExInvalidFields({});
    setExchangesSaving(true);
    try {
      await addExchange({
        prenom: resolveKnownName(exPrenom),
        date: exDate,
        heureDebut: exHeureDebut,
        heureFin: exHeureFin,
        collegue: hasCollegue ? resolveKnownName(exCollegue) : "",
        collegueDate: hasCollegue ? exCollegueDate : "",
        collegueHeureDebut: hasCollegue ? exCollegueHeureDebut : "",
        collegueHeureFin: hasCollegue ? exCollegueHeureFin : "",
        status: hasCollegue ? "pending" : "open",
      });
      await refreshExchanges();
      setExchangesError("");
    } catch (e) {
      console.error("Erreur d'ajout de l'échange:", e);
      setExchangesError("Impossible d'enregistrer cet échange.");
    } finally {
      setExchangesSaving(false);
    }
    setExPrenom("");
    setExDate("");
    setExHeureDebut("");
    setExHeureFin("");
    setExCollegue("");
    setExCollegueDate("");
    setExCollegueHeureDebut("");
    setExCollegueHeureFin("");
  }

  // Positionnement d'un collègue sur un échange "ouvert" (sans contrepartie renseignée au départ).
  function updateExchangePositionDraft(id, field, value) {
    setExPositionDraft((d) => ({ ...d, [id]: { ...(d[id] || {}), [field]: value } }));
  }

  async function submitExchangePosition(id) {
    const draft = exPositionDraft[id] || {};
    const collegue = (draft.collegue || "").trim();
    const date = draft.date || "";
    const heureDebut = draft.heureDebut || "";
    const heureFin = draft.heureFin || "";

    if (!collegue) return setExPositionError((f) => ({ ...f, [id]: "Indiquez votre prénom." }));
    if (!date) return setExPositionError((f) => ({ ...f, [id]: "Indiquez une date." }));
    if (!heureDebut || !heureFin)
      return setExPositionError((f) => ({ ...f, [id]: "Indiquez l'heure de début et de fin." }));
    if (heureFin <= heureDebut)
      return setExPositionError((f) => ({ ...f, [id]: "L'heure de fin doit être après l'heure de début." }));
    if (isUnknownName(collegue))
      return setExPositionError((f) => ({ ...f, [id]: "Prénom inconnu de l'équipe, vérifiez l'orthographe." }));

    setExPositionError((f) => ({ ...f, [id]: "" }));
    try {
      await updateExchange(id, {
        collegue: resolveKnownName(collegue),
        collegueDate: date,
        collegueHeureDebut: heureDebut,
        collegueHeureFin: heureFin,
        status: "pending",
      });
      await refreshExchanges();
    } catch (e) {
      console.error("Erreur de positionnement:", e);
      setExPositionError((f) => ({ ...f, [id]: "Impossible d'enregistrer votre positionnement." }));
      return;
    }
    setExPositionDraft((d) => ({ ...d, [id]: {} }));
    setExPositionOpenFor(null);
  }

  async function approveExchange(id) {
    try {
      await updateExchange(id, { status: "approved" });
      await refreshExchanges();
    } catch (e) {
      console.error("Erreur de validation:", e);
      setExchangesError("Impossible de valider cet échange.");
    }
  }

  async function declineExchange(id) {
    try {
      await updateExchange(id, { status: "rejected" });
      await refreshExchanges();
    } catch (e) {
      console.error("Erreur de refus:", e);
      setExchangesError("Impossible de refuser cet échange.");
    }
  }

  async function handleDeleteExchange(id) {
    try {
      await deleteExchange(id);
      await refreshExchanges();
    } catch (e) {
      console.error("Erreur de suppression:", e);
      setExchangesError("Impossible de supprimer cet échange.");
    }
  }

  async function handleAddShift() {
    const missing = {};
    if (!planPrenom.trim()) missing.prenom = true;
    if (!planJour) missing.jour = true;
    if (!planHeureDebut) missing.heureDebut = true;
    if (!planHeureFin) missing.heureFin = true;

    if (Object.keys(missing).length > 0) {
      setPlanInvalidFields(missing);
      setPlanFormError("Certains champs ne sont pas complets.");
      return;
    }
    if (planHeureFin <= planHeureDebut) {
      setPlanInvalidFields({ heureDebut: true, heureFin: true });
      setPlanFormError("L'heure de fin doit être après l'heure de début.");
      return;
    }
    if (isUnknownName(planPrenom)) {
      setPlanInvalidFields({ prenom: true });
      setPlanFormError("Prénom inconnu de l'équipe, vérifiez l'orthographe.");
      return;
    }

    setPlanFormError("");
    setPlanInvalidFields({});
    setPlanningSaving(true);
    try {
      await addShift({ prenom: resolveKnownName(planPrenom), jour: planJour, heureDebut: planHeureDebut, heureFin: planHeureFin });
      await refreshPlanning();
      setPlanningError("");
    } catch (e) {
      console.error("Erreur d'ajout du créneau:", e);
      setPlanningError("Impossible d'enregistrer ce créneau.");
    } finally {
      setPlanningSaving(false);
    }
    setPlanPrenom("");
    setPlanJour("");
    setPlanHeureDebut("");
    setPlanHeureFin("");
  }

  async function handleDeleteShift(id) {
    try {
      await deleteShift(id);
      await refreshPlanning();
    } catch (e) {
      console.error("Erreur de suppression du créneau:", e);
      setPlanningError("Impossible de supprimer ce créneau.");
    }
    if (planEditingId === id) {
      setPlanEditingId(null);
      setPlanEditError("");
    }
  }

  function startEditShift(shift) {
    setPlanEditingId(shift.id);
    setPlanEditDraft({
      prenom: shift.prenom,
      jour: shift.jour,
      heureDebut: shift.heureDebut,
      heureFin: shift.heureFin,
    });
    setPlanEditError("");
  }

  function cancelEditShift() {
    setPlanEditingId(null);
    setPlanEditError("");
  }

  function updatePlanEditDraft(field, value) {
    setPlanEditDraft((d) => ({ ...d, [field]: value }));
  }

  async function saveEditShift(id) {
    const { prenom: p, jour: j, heureDebut: hd, heureFin: hf } = planEditDraft;
    if (!p.trim() || !hd || !hf) {
      setPlanEditError("Tous les champs sont requis.");
      return;
    }
    if (hf <= hd) {
      setPlanEditError("L'heure de fin doit être après l'heure de début.");
      return;
    }
    try {
      await updateShift(id, { prenom: resolveKnownName(p), jour: j, heureDebut: hd, heureFin: hf });
      await refreshPlanning();
    } catch (e) {
      console.error("Erreur de modification du créneau:", e);
      setPlanEditError("Impossible d'enregistrer cette modification.");
      return;
    }
    setPlanEditingId(null);
    setPlanEditError("");
  }

  async function refreshEntries() {
    try {
      const data = await loadAbsences();
      setEntries(data);
      setError("");
    } catch (e) {
      console.error("Erreur de chargement:", e);
      setError("Impossible de charger les absences.");
    }
  }

  useEffect(() => {
    refreshEntries();
  }, []);

  async function handleSubmit() {
    const missing = {};
    if (!prenom.trim()) missing.prenom = true;
    if (!date) missing.date = true;
    if (!heureDebut) missing.heureDebut = true;
    if (!heureFin) missing.heureFin = true;

    if (Object.keys(missing).length > 0) {
      setInvalidFields(missing);
      setFormError(
        "Certains champs ne sont pas complets : " +
          [
            missing.prenom && "prénom",
            missing.date && "date",
            missing.heureDebut && "heure de début",
            missing.heureFin && "heure de fin",
          ]
            .filter(Boolean)
            .join(", ") +
          ". Si un champ heure ou date te semble déjà rempli, vérifie qu'il est bien validé (ex. les minutes ou l'année complétées), sinon le navigateur le considère comme vide."
      );
      formTopRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      return;
    }

    if (heureFin <= heureDebut) {
      setInvalidFields({ heureDebut: true, heureFin: true });
      setFormError("L'heure de fin doit être après l'heure de début.");
      formTopRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      return;
    }

    if (isUnknownName(prenom)) {
      setInvalidFields({ prenom: true });
      setFormError("Prénom inconnu de l'équipe, vérifiez l'orthographe.");
      formTopRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      return;
    }

    setFormError("");
    setInvalidFields({});
    setSaving(true);
    try {
      await addAbsence({ prenom: resolveKnownName(prenom), date, heureDebut, heureFin });
      await refreshEntries();
    } catch (e) {
      console.error("Erreur d'ajout:", e);
      setError("Impossible d'enregistrer cette absence.");
    } finally {
      setSaving(false);
    }
    setPrenom("");
    setDate("");
    setHeureDebut("");
    setHeureFin("");
    setInvalidFields({});
  }

  async function handleDelete(id) {
    try {
      await deleteAbsence(id);
      await refreshEntries();
    } catch (e) {
      console.error("Erreur de suppression:", e);
      setError("Impossible de supprimer cette absence.");
    }
    if (editingId === id) {
      setEditingId(null);
      setEditError("");
    }
  }

  function startEdit(entry) {
    setEditingId(entry.id);
    setEditDraft({
      prenom: entry.prenom,
      date: entry.date,
      heureDebut: entry.heureDebut,
      heureFin: entry.heureFin,
    });
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError("");
  }

  function updateEditDraft(field, value) {
    setEditDraft((d) => ({ ...d, [field]: value }));
  }

  async function saveEdit(id) {
    const { prenom: p, date: d, heureDebut: hd, heureFin: hf } = editDraft;

    if (!p.trim() || !d || !hd || !hf) {
      setEditError("Tous les champs sont requis.");
      return;
    }
    if (hf <= hd) {
      setEditError("L'heure de fin doit être après l'heure de début.");
      return;
    }

    try {
      await updateAbsence(id, { prenom: resolveKnownName(p), date: d, heureDebut: hd, heureFin: hf });
      await refreshEntries();
    } catch (e) {
      console.error("Erreur de modification:", e);
      setEditError("Impossible d'enregistrer cette modification.");
      return;
    }
    setEditingId(null);
    setEditError("");
  }

  function updateVolunteerDraft(id, field, value) {
    setVolunteerDraft((d) => ({ ...d, [id]: { ...(d[id] || {}), [field]: value } }));
  }

  async function confirmVolunteer(id) {
    const draft = volunteerDraft[id] || {};
    const nom = (draft.prenom || "").trim();
    const hd = draft.heureDebut || "";
    const hf = draft.heureFin || "";

    if (!nom) return setVolunteerFormError((f) => ({ ...f, [id]: "Indiquez votre prénom." }));
    if (!hd || !hf) return setVolunteerFormError((f) => ({ ...f, [id]: "Indiquez l'heure de début et de fin." }));
    if (hf <= hd) return setVolunteerFormError((f) => ({ ...f, [id]: "L'heure de fin doit être après l'heure de début." }));
    if (isUnknownName(nom))
      return setVolunteerFormError((f) => ({ ...f, [id]: "Prénom inconnu de l'équipe, vérifiez l'orthographe." }));

    setVolunteerFormError((f) => ({ ...f, [id]: "" }));
    try {
      await addVolunteer(id, { prenom: resolveKnownName(nom), heureDebut: hd, heureFin: hf });
      await refreshEntries();
    } catch (e) {
      console.error("Erreur de positionnement:", e);
      setVolunteerFormError((f) => ({ ...f, [id]: "Impossible d'enregistrer votre positionnement." }));
      return;
    }
    setVolunteerDraft((d) => ({ ...d, [id]: {} }));
    setOpenVolunteerFor(null);
  }

  async function approveVolunteer(entryId, volunteerId) {
    const entry = (entries || []).find((e) => e.id === entryId);
    if (!entry) return;

    const volunteersAfterApproval = entry.volunteers.map((v) =>
      v.id === volunteerId ? { ...v, status: "approved" } : v
    );
    const approved = volunteersAfterApproval.filter((v) => v.status === "approved" || !v.status);
    const isNowComplete = getUncoveredRanges(entry, approved).length === 0;

    try {
      await updateVolunteerStatus(volunteerId, "approved");
      if (isNowComplete) {
        const stillPending = entry.volunteers.filter((v) => v.status === "pending" && v.id !== volunteerId);
        for (const v of stillPending) {
          await updateVolunteerStatus(v.id, "rejected");
        }
      }
      await refreshEntries();
    } catch (e) {
      console.error("Erreur de validation:", e);
      setError("Impossible de valider cette demande.");
    }
  }

  async function declineVolunteer(entryId, volunteerId) {
    try {
      await updateVolunteerStatus(volunteerId, "rejected");
      await refreshEntries();
    } catch (e) {
      console.error("Erreur de refus:", e);
      setError("Impossible de refuser cette demande.");
    }
  }

  async function removeVolunteerEntry(entryId, volunteerId) {
    try {
      await removeVolunteer(volunteerId);
      await refreshEntries();
    } catch (e) {
      console.error("Erreur de suppression:", e);
      setError("Impossible de retirer cette proposition.");
    }
  }

  const sorted = useMemo(() => {
    if (!entries) return [];
    return [...entries].sort((a, b) => (a.date + a.heureDebut).localeCompare(b.date + b.heureDebut));
  }, [entries]);

  // Une fois la date passée, l'absence quitte la liste principale et rejoint les archives.
  const activeSorted = useMemo(() => sorted.filter((e) => !isPast(e)), [sorted]);
  const archivedSorted = useMemo(
    () => sorted.filter((e) => isPast(e)).sort((a, b) => (b.date + b.heureDebut).localeCompare(a.date + a.heureDebut)),
    [sorted]
  );

  const filteredSorted = useMemo(() => {
    if (statusFilter === "toutes") return activeSorted;
    if (statusFilter === "non_complet") {
      return activeSorted.filter((e) => getEntryStatus(e) !== "complet");
    }
    return activeSorted.filter((e) => getEntryStatus(e) === statusFilter);
  }, [activeSorted, statusFilter]);

  // Regroupement de la liste par mois pour l'affichage.
  const groupedByMonth = useMemo(() => {
    const groups = [];
    const byKey = new Map();
    for (const e of filteredSorted) {
      const key = e.date.slice(0, 7); // "YYYY-MM"
      if (!byKey.has(key)) {
        const rawLabel = new Date(e.date + "T00:00:00").toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        });
        const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
        const group = { key, label, items: [] };
        byKey.set(key, group);
        groups.push(group);
      }
      byKey.get(key).items.push(e);
    }
    return groups;
  }, [filteredSorted]);

  const sortedExchanges = useMemo(() => {
    if (!exchanges) return [];
    return [...exchanges].sort((a, b) => (b.date + b.heureDebut).localeCompare(a.date + a.heureDebut));
  }, [exchanges]);

  // Un échange rejoint les archives une fois que ses deux créneaux sont passés.
  const activeExchanges = useMemo(() => sortedExchanges.filter((ex) => !isExchangePast(ex)), [sortedExchanges]);
  const archivedExchanges = useMemo(() => sortedExchanges.filter((ex) => isExchangePast(ex)), [sortedExchanges]);

  // Années disponibles pour le filtre de la liste des échanges (+ l'année en cours).
  const availableExchangeYears = useMemo(() => {
    const years = new Set(activeExchanges.map((ex) => Number(ex.date.slice(0, 4))));
    years.add(today.getFullYear());
    return [...years].sort((a, b) => a - b);
  }, [activeExchanges]);

  const selectedExchangeMonthKey = `${exYearFilter}-${String(exMonthFilter).padStart(2, "0")}`;

  const filteredExchanges = useMemo(
    () =>
      activeExchanges.filter((ex) =>
        exMonthFilter === "toutes"
          ? ex.date.slice(0, 4) === String(exYearFilter)
          : ex.date.slice(0, 7) === selectedExchangeMonthKey
      ),
    [activeExchanges, selectedExchangeMonthKey, exMonthFilter, exYearFilter]
  );

  const groupedExchangesByMonth = useMemo(() => {
    const groups = [];
    const byKey = new Map();
    for (const ex of filteredExchanges) {
      const key = ex.date.slice(0, 7);
      if (!byKey.has(key)) {
        const rawLabel = new Date(ex.date + "T00:00:00").toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        });
        const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
        const group = { key, label, items: [] };
        byKey.set(key, group);
        groups.push(group);
      }
      byKey.get(key).items.push(ex);
    }
    return groups;
  }, [filteredExchanges]);

  // Heures d'absence par personne et par mois.
  const absenceMinutesByPersonMonth = useMemo(() => {
    const map = new Map(); // prenom -> Map(monthKey -> minutes)
    for (const e of sorted) {
      const monthKey = e.date.slice(0, 7);
      const minutes = timeToMinutes(e.heureFin) - timeToMinutes(e.heureDebut);
      if (minutes <= 0) continue;
      if (!map.has(e.prenom)) map.set(e.prenom, new Map());
      const monthMap = map.get(e.prenom);
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + minutes);
    }
    return map;
  }, [sorted]);

  // Heures supplémentaires (créneaux validés) par personne et par mois.
  const extraMinutesByPersonMonth = useMemo(() => {
    const map = new Map(); // prenom -> Map(monthKey -> minutes)
    for (const e of sorted) {
      const monthKey = e.date.slice(0, 7);
      const approved = e.volunteers.filter((v) => v.status === "approved" || !v.status);
      for (const v of approved) {
        const minutes = timeToMinutes(v.heureFin) - timeToMinutes(v.heureDebut);
        if (minutes <= 0) continue;
        if (!map.has(v.prenom)) map.set(v.prenom, new Map());
        const monthMap = map.get(v.prenom);
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + minutes);
      }
    }
    return map;
  }, [sorted]);

  // Détail des heures supplémentaires par catégorie (nuit semaine, dimanche jour, dimanche nuit, jour férié).
  const extraMinutesBreakdownByPersonMonth = useMemo(() => {
    const map = new Map(); // prenom -> Map(monthKey -> { nightWeekday, sundayDay, sundayNight, holiday })
    const NIGHT_START = 21 * 60;
    const DAY_END = 24 * 60;
    const NIGHT_END = 6 * 60;
    const holidaysByYear = new Map();
    const getHolidaysCached = (year) => {
      if (!holidaysByYear.has(year)) holidaysByYear.set(year, getFrenchHolidays(year));
      return holidaysByYear.get(year);
    };

    for (const e of sorted) {
      const monthKey = e.date.slice(0, 7);
      const isHoliday = getHolidaysCached(Number(e.date.slice(0, 4))).has(e.date);
      const isSunday = new Date(e.date + "T00:00:00").getDay() === 0;
      const start = timeToMinutes(e.heureDebut);
      const end = timeToMinutes(e.heureFin);
      const nightMinutes =
        overlapMinutes(start, end, NIGHT_START, DAY_END) + overlapMinutes(start, end, 0, NIGHT_END);
      const dayMinutes = overlapMinutes(start, end, NIGHT_END, NIGHT_START);

      const approved = e.volunteers.filter((v) => v.status === "approved" || !v.status);
      for (const v of approved) {
        if (!map.has(v.prenom)) map.set(v.prenom, new Map());
        const monthMap = map.get(v.prenom);
        const current =
          monthMap.get(monthKey) || { nightWeekday: 0, sundayDay: 0, sundayNight: 0, holiday: 0 };
        if (isHoliday) {
          // Un remplacement un jour férié compte entièrement à part, peu importe l'heure.
          current.holiday += end - start;
        } else if (isSunday) {
          current.sundayDay += dayMinutes;
          current.sundayNight += nightMinutes;
        } else {
          current.nightWeekday += nightMinutes;
        }
        monthMap.set(monthKey, current);
      }
    }
    return map;
  }, [sorted]);

  // Années disponibles (toutes absences confondues, + l'année en cours), pour le filtre du tableau.
  const availableYears = useMemo(() => {
    const years = new Set(sorted.map((e) => Number(e.date.slice(0, 4))));
    years.add(today.getFullYear());
    return [...years].sort((a, b) => a - b);
  }, [sorted]);

  const MONTH_NAMES = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];

  // Fabrique un vérificateur "cette date est dans la période choisie" pour une paire année/mois donnée.
  const makeIsInPeriod = (year, month) => (dateStr) =>
    dateStr.slice(0, 4) === String(year) &&
    (month === "toutes" || dateStr.slice(5, 7) === String(month).padStart(2, "0"));

  // Fabrique une fonction de somme sur une map "YYYY-MM" -> minutes, pour une paire année/mois donnée.
  const makeSumForPeriod = (year, month) => (monthMap) => {
    if (!monthMap) return 0;
    if (month === "toutes") {
      let total = 0;
      for (const [key, minutes] of monthMap) {
        if (key.slice(0, 4) === String(year)) total += minutes;
      }
      return total;
    }
    return monthMap.get(`${year}-${String(month).padStart(2, "0")}`) || 0;
  };

  // Clé "YYYY-MM" pour la carte Tickets restaurant (filtre yearFilter/monthFilter dédié).
  const selectedMonthKey = `${yearFilter}-${String(monthFilter).padStart(2, "0")}`;

  // Clémence : ses créneaux du mardi soir et du mercredi soir (21h-23h) comptent en heures
  // supplémentaires plutôt qu'en heures contractuelles (période de la carte "Heures...").
  const clemenceEveningOvertimeMinutes = useMemo(() => {
    const eveningShifts = (planning || []).filter(
      (s) => s.prenom === "Clémence" && (s.jour === "Mardi" || s.jour === "Mercredi") && s.heureDebut === "21:00"
    );
    if (eveningShifts.length === 0) return 0;
    const monthsToProcess =
      hoursMonthFilter === "toutes" ? Array.from({ length: 12 }, (_, i) => i + 1) : [hoursMonthFilter];
    let total = 0;
    for (const m of monthsToProcess) {
      const daysInMonth = new Date(hoursYearFilter, m, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const jsDay = new Date(hoursYearFilter, m - 1, day).getDay();
        const jour = JOURS[(jsDay + 6) % 7];
        for (const s of eveningShifts) {
          if (s.jour === jour) total += effectiveEndMinutes(s.heureFin) - timeToMinutes(s.heureDebut);
        }
      }
    }
    return total;
  }, [planning, hoursYearFilter, hoursMonthFilter]);

  // Tableau récapitulatif par personne (heures d'absence / heures supplémentaires), filtrable par mois.
  const personSummaryTable = useMemo(() => {
    const sumForPeriod = makeSumForPeriod(hoursYearFilter, hoursMonthFilter);
    const hoursMonthKey = `${hoursYearFilter}-${String(hoursMonthFilter).padStart(2, "0")}`;
    const persons = new Set([...absenceMinutesByPersonMonth.keys(), ...extraMinutesByPersonMonth.keys()]);
    if (clemenceEveningOvertimeMinutes > 0) persons.add("Clémence");
    const emptyBreakdown = { nightWeekday: 0, sundayDay: 0, sundayNight: 0, holiday: 0 };
    const breakdownForPeriod = (breakdownMonthMap) => {
      if (!breakdownMonthMap) return emptyBreakdown;
      if (hoursMonthFilter === "toutes") {
        const total = { ...emptyBreakdown };
        for (const [key, b] of breakdownMonthMap) {
          if (key.slice(0, 4) !== String(hoursYearFilter)) continue;
          total.nightWeekday += b.nightWeekday;
          total.sundayDay += b.sundayDay;
          total.sundayNight += b.sundayNight;
          total.holiday += b.holiday;
        }
        return total;
      }
      return breakdownMonthMap.get(hoursMonthKey) || emptyBreakdown;
    };
    return [...persons]
      .map((prenom) => {
        const breakdown = breakdownForPeriod(extraMinutesBreakdownByPersonMonth.get(prenom));
        return {
          prenom,
          absenceMinutes: sumForPeriod(absenceMinutesByPersonMonth.get(prenom)),
          extraMinutes:
            sumForPeriod(extraMinutesByPersonMonth.get(prenom)) +
            (prenom === "Clémence" ? clemenceEveningOvertimeMinutes : 0),
          nightWeekdayMinutes:
            breakdown.nightWeekday + (prenom === "Clémence" ? clemenceEveningOvertimeMinutes : 0),
          sundayDayMinutes: breakdown.sundayDay,
          sundayNightMinutes: breakdown.sundayNight,
          holidayMinutes: breakdown.holiday,
        };
      })
      .filter((row) => row.extraMinutes > 0)
      .sort((a, b) => a.prenom.localeCompare(b.prenom));
  }, [
    absenceMinutesByPersonMonth,
    extraMinutesByPersonMonth,
    extraMinutesBreakdownByPersonMonth,
    hoursYearFilter,
    hoursMonthFilter,
    clemenceEveningOvertimeMinutes,
  ]);

  // Compteurs de la page Administration, filtrables par mois/année (filtre dédié statsYearFilter/statsMonthFilter).
  const adminStats = useMemo(() => {
    const matchesMonth = makeIsInPeriod(statsYearFilter, statsMonthFilter);
    const sumForPeriod = makeSumForPeriod(statsYearFilter, statsMonthFilter);

    const uncoveredCount = activeSorted.filter(
      (e) => matchesMonth(e.date) && getEntryStatus(e) !== "complet"
    ).length;

    const pendingCount = sorted
      .filter((e) => matchesMonth(e.date))
      .reduce((acc, e) => acc + e.volunteers.filter((v) => v.status === "pending").length, 0);

    const pendingExchangesCount = activeExchanges.filter(
      (ex) => matchesMonth(ex.date) && ex.status === "pending"
    ).length;

    let extraMinutes = 0;
    for (const monthMap of extraMinutesByPersonMonth.values()) {
      extraMinutes += sumForPeriod(monthMap);
    }

    return { uncoveredCount, pendingCount, pendingExchangesCount, extraMinutes };
  }, [activeSorted, sorted, activeExchanges, extraMinutesByPersonMonth, statsYearFilter, statsMonthFilter]);

  const planningByDay = useMemo(() => {
    const map = new Map(JOURS.map((j) => [j, []]));
    for (const s of planning || []) {
      if (!map.has(s.jour)) map.set(s.jour, []);
      map.get(s.jour).push(s);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
    }
    return JOURS.map((jour) => ({ jour, shifts: map.get(jour) || [] }));
  }, [planning]);

  // Liste de toutes les personnes présentes dans le planning de l'équipe.
  const teamMembers = useMemo(() => {
    const names = new Set((planning || []).map((s) => s.prenom));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [planning]);

  // Liste de référence de tous les prénoms connus de l'équipe (planning + Camille, ajoutée à part),
  // utilisée pour repérer une faute de frappe dans les champs "Prénom".
  const normalizeName = (s) => (s || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const knownNamesNormalized = useMemo(
    () => new Set([...teamMembers, "Camille", "Ghost"].map(normalizeName)),
    [teamMembers]
  );
  const isUnknownName = (name) => name && name.trim() !== "" && !knownNamesNormalized.has(normalizeName(name));

  // Ramène un prénom saisi (peu importe la casse ou les accents) à l'orthographe exacte de
  // l'équipe, pour que les données enregistrées restent toujours cohérentes.
  function resolveKnownName(raw) {
    const norm = normalizeName(raw);
    for (const known of [...teamMembers, "Camille", "Ghost"]) {
      if (normalizeName(known) === norm) return known;
    }
    return capitalizeName((raw || "").trim());
  }

  // Heures mensuelles (planning récurrent) + heures supplémentaires, pour chaque personne de l'équipe.
  const weeklyHoursByPerson = useMemo(() => {
    const monthsToProcess =
      hoursMonthFilter === "toutes" ? Array.from({ length: 12 }, (_, i) => i + 1) : [hoursMonthFilter];
    const monthlyMinutesByPerson = new Map();
    const overtimeMinutesByPerson = new Map(); // heures de planning comptées en heures supplémentaires

    // Clémence : ses créneaux du mardi soir et du mercredi soir (21h-23h) comptent en heures
    // supplémentaires plutôt qu'en heures contractuelles.
    const isClemenceEveningOvertime = (s) =>
      s.prenom === "Clémence" && (s.jour === "Mardi" || s.jour === "Mercredi") && s.heureDebut === "21:00";

    // Capucine, Sylvain et Clémence : 1h de pause déjeuner à déduire par jour travaillé
    // (leur créneau contractuel est continu dans le planning, la pause n'y est pas représentée).
    const BREAK_1H_NAMES = new Set(["Capucine"]);
    const daysWorkedByPerson = new Map(); // prenom -> Set("YYYY-MM-DD")

    // Les jours fériés comptent normalement pour tout le monde, sauf pour ces 4 personnes.
    const HOLIDAY_EXCLUDED_NAMES = new Set(["Clémence", "Sylvain", "Capucine", "Camille"]);

    for (const m of monthsToProcess) {
      const daysInMonth = new Date(hoursYearFilter, m, 0).getDate();
      const holidaysThisYear = getFrenchHolidays(hoursYearFilter);
      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(hoursYearFilter, m - 1, day);
        const dateStr = `${hoursYearFilter}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const isHoliday = holidaysThisYear.has(dateStr);
        const jsDay = dateObj.getDay(); // 0 = dimanche
        const jour = JOURS[(jsDay + 6) % 7];
        const dayShifts = (planningByDay.find((d) => d.jour === jour) || {}).shifts || [];
        const OVERRIDDEN_NAMES = new Set(Object.keys(TICKETING_HOURS_OVERRIDE));
        for (const s of dayShifts) {
          if (OVERRIDDEN_NAMES.has(s.prenom)) continue; // planning réel ignoré ici, remplacé par le planning "tickets" ci-dessous
          if (isHoliday && HOLIDAY_EXCLUDED_NAMES.has(s.prenom)) continue; // pas compté pour ces 4 personnes
          const duration = effectiveEndMinutes(s.heureFin) - timeToMinutes(s.heureDebut);
          if (isClemenceEveningOvertime(s)) {
            overtimeMinutesByPerson.set(s.prenom, (overtimeMinutesByPerson.get(s.prenom) || 0) + duration);
          } else {
            monthlyMinutesByPerson.set(s.prenom, (monthlyMinutesByPerson.get(s.prenom) || 0) + duration);
            if (BREAK_1H_NAMES.has(s.prenom)) {
              if (!daysWorkedByPerson.has(s.prenom)) daysWorkedByPerson.set(s.prenom, new Set());
              daysWorkedByPerson.get(s.prenom).add(dateStr);
            }
          }
        }

        // Créneaux "tickets" de Clémence et Sylvain pour ce jour (indépendants de leur planning réel).
        for (const [prenom, overrideShifts] of Object.entries(TICKETING_HOURS_OVERRIDE)) {
          for (const os of overrideShifts) {
            if (os.jour !== jour) continue;
            if (isHoliday && HOLIDAY_EXCLUDED_NAMES.has(prenom)) continue;
            const duration = timeToMinutes(os.heureFin) - timeToMinutes(os.heureDebut);
            monthlyMinutesByPerson.set(prenom, (monthlyMinutesByPerson.get(prenom) || 0) + duration);
            if (BREAK_1H_NAMES.has(prenom)) {
              if (!daysWorkedByPerson.has(prenom)) daysWorkedByPerson.set(prenom, new Set());
              daysWorkedByPerson.get(prenom).add(dateStr);
            }
          }
        }
      }
    }

    // Applique la déduction d'1h de pause par jour travaillé, sans descendre sous 0.
    for (const prenom of BREAK_1H_NAMES) {
      const daysWorked = daysWorkedByPerson.get(prenom)?.size || 0;
      if (daysWorked > 0) {
        const current = monthlyMinutesByPerson.get(prenom) || 0;
        monthlyMinutesByPerson.set(prenom, Math.max(0, current - daysWorked * 60));
      }
    }

    const sumExtra = makeSumForPeriod(hoursYearFilter, hoursMonthFilter);
    return teamMembers.map((prenom) => ({
      prenom,
      monthlyMinutes: monthlyMinutesByPerson.get(prenom) || 0,
      extraMinutes: sumExtra(extraMinutesByPersonMonth.get(prenom)) + (overtimeMinutesByPerson.get(prenom) || 0),
      absenceMinutes: sumExtra(absenceMinutesByPersonMonth.get(prenom)),
    }));
  }, [
    teamMembers,
    planningByDay,
    hoursYearFilter,
    hoursMonthFilter,
    extraMinutesByPersonMonth,
    absenceMinutesByPersonMonth,
  ]);

  // Regroupement par personne, pour l'affichage en timeline (voir qui travaille avec qui).
  const planningTimelineByDay = useMemo(() => {
    return planningByDay.map(({ jour, shifts }) => {
      const byPerson = new Map();
      for (const s of shifts) {
        if (!byPerson.has(s.prenom)) byPerson.set(s.prenom, []);
        byPerson.get(s.prenom).push(s);
      }
      const people = [...byPerson.entries()]
        .map(([prenom, segs]) => ({
          prenom,
          segments: segs.sort((a, b) => a.heureDebut.localeCompare(b.heureDebut)),
          firstStart: segs[0].heureDebut,
        }))
        .sort((a, b) => a.firstStart.localeCompare(b.firstStart));
      return { jour, people };
    });
  }, [planningByDay]);

  // Exporte le planning dans une nouvelle fenêtre imprimable (window.print() direct est souvent
  // bloqué depuis l'iframe sandboxée d'un artefact, donc on passe par une fenêtre séparée).
  function handleExportPlanningPDF() {
    const win = window.open("", "_blank");
    if (!win) {
      setPlanningError(
        "La fenêtre d'export a été bloquée par le navigateur. Autorisez les pop-ups pour ce site puis réessayez."
      );
      return;
    }
    const rows = planningTimelineByDay
      .map(({ jour, people }) => {
        const body =
          people.length === 0
            ? `<p style="font-size:12px;color:#94a3b8;margin:4px 0 16px;">Aucun créneau</p>`
            : `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                <thead>
                  <tr>
                    <th style="text-align:left;padding:4px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:11px;text-transform:uppercase;">Personne</th>
                    <th style="text-align:left;padding:4px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:11px;text-transform:uppercase;">Créneaux</th>
                  </tr>
                </thead>
                <tbody>
                  ${people
                    .map(
                      ({ prenom, segments }) => `
                    <tr>
                      <td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;">${prenom}</td>
                      <td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;">${segments
                        .map((s) => `${formatHeureAffichage(s.heureDebut)}–${formatHeureAffichage(s.heureFin)}`)
                        .join(", ")}</td>
                    </tr>`
                    )
                    .join("")}
                </tbody>
              </table>`;
        return `<h2 style="font-size:15px;margin:20px 0 6px;">${jour}</h2>${body}`;
      })
      .join("");

    win.document.open();
    win.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <title>Planning de l'équipe</title>
          <meta charset="utf-8" />
        </head>
        <body style="font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #0f172a;">
          <h1 style="font-size:20px;margin-bottom:4px;">Planning de l'équipe</h1>
          <p style="font-size:12px;color:#94a3b8;margin-bottom:16px;">Exporté le ${new Date().toLocaleDateString(
            "fr-FR"
          )}</p>
          ${rows}
        </body>
      </html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  // Aide générique pour exporter un tableau en PDF (via l'impression du navigateur), utilisée
  // par les cartes "Heures travaillées", "Heures supplémentaires" et "Tickets restaurant".
  function exportTableToPDF(title, headers, rows, onBlocked) {
    const win = window.open("", "_blank");
    if (!win) {
      if (onBlocked) onBlocked();
      return;
    }
    const theadHtml = `<tr>${headers
      .map(
        (h) =>
          `<th style="text-align:left;padding:4px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:11px;text-transform:uppercase;">${h}</th>`
      )
      .join("")}</tr>`;
    const tbodyHtml = rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell, i) =>
                `<td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;${
                  i === 0 ? "font-weight:600;" : "color:#475569;"
                }">${cell}</td>`
            )
            .join("")}</tr>`
      )
      .join("");
    win.document.open();
    win.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
        </head>
        <body style="font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #0f172a;">
          <h1 style="font-size:20px;margin-bottom:4px;">${title}</h1>
          <p style="font-size:12px;color:#94a3b8;margin-bottom:16px;">Exporté le ${new Date().toLocaleDateString(
            "fr-FR"
          )}</p>
          <table style="width:100%;border-collapse:collapse;">
            <thead>${theadHtml}</thead>
            <tbody>${tbodyHtml}</tbody>
          </table>
        </body>
      </html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  function handleExportWeeklyHoursPDF() {
    const rows = weeklyHoursByPerson.map((row) => [
      row.prenom,
      row.monthlyMinutes > 0 ? formatDuration(row.monthlyMinutes) : "—",
      row.extraMinutes > 0 ? formatDuration(row.extraMinutes) : "—",
      row.absenceMinutes > 0 ? formatDuration(row.absenceMinutes) : "—",
      formatDuration(row.monthlyMinutes + row.extraMinutes - row.absenceMinutes),
    ]);
    exportTableToPDF(
      "Heures travaillées par personne",
      ["Personne", "Heures contractuelles", "Heures supplémentaires", "Heures d'absence", "Total"],
      rows,
      () => setError("La fenêtre d'export a été bloquée par le navigateur. Autorisez les pop-ups pour ce site puis réessayez.")
    );
  }

  function handleExportExtraHoursPDF() {
    const rows = personSummaryTable.map((row) => [
      row.prenom,
      row.absenceMinutes > 0 ? formatDuration(row.absenceMinutes) : "—",
      row.extraMinutes > 0 ? formatDuration(row.extraMinutes) : "—",
    ]);
    exportTableToPDF(
      "Heures supplémentaires par personne",
      ["Personne", "Heures d'absence", "Heures supplémentaires"],
      rows,
      () => setError("La fenêtre d'export a été bloquée par le navigateur. Autorisez les pop-ups pour ce site puis réessayez.")
    );
  }

  function handleExportTicketsPDF() {
    const rows = ticketsRestaurantByPerson.map((row) => {
      const adj = ticketAdjustments[adjustmentKeyFor(row.prenom)] || { plus: 0, minus: 0 };
      const totalAjuste = row.total + (adj.plus || 0) - (adj.minus || 0);
      return [row.prenom, ...JOURS.map((j) => String(row.parJour[j].count)), String(totalAjuste)];
    });
    exportTableToPDF(
      "Tickets restaurant",
      ["Personne", ...JOURS, "Total"],
      rows,
      () => setError("La fenêtre d'export a été bloquée par le navigateur. Autorisez les pop-ups pour ce site puis réessayez.")
    );
  }


  // on retire les créneaux d'absence, et on ajoute les créneaux couverts par un remplaçant validé.
  const ticketsRestaurantByPerson = useMemo(() => {
    // Planning de base par jour de semaine : prenom -> [[startMin, endMin], ...]
    const baseByDay = new Map();
    for (const { jour, shifts } of planningByDay) {
      const byPerson = new Map();
      for (const s of shifts) {
        if (!byPerson.has(s.prenom)) byPerson.set(s.prenom, []);
        byPerson.get(s.prenom).push([timeToMinutes(s.heureDebut), timeToMinutes(s.heureFin)]);
      }
      baseByDay.set(jour, byPerson);
    }

    // Absences de la période sélectionnée, indexées par date (YYYY-MM-DD).
    const isInTicketsPeriod = makeIsInPeriod(yearFilter, monthFilter);
    const absencesByDate = new Map();
    for (const e of sorted) {
      if (!isInTicketsPeriod(e.date)) continue;
      if (!absencesByDate.has(e.date)) absencesByDate.set(e.date, []);
      absencesByDate.get(e.date).push(e);
    }

    const monthsToProcess = monthFilter === "toutes" ? Array.from({ length: 12 }, (_, i) => i + 1) : [monthFilter];
    const byPerson = new Map(); // prenom -> { Lundi: 0, ... }
    const holidaysThisYear = getFrenchHolidays(yearFilter);

    for (const m of monthsToProcess) {
      const daysInMonth = new Date(yearFilter, m, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(yearFilter, m - 1, day);
        const dateStr = `${yearFilter}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const isHoliday = holidaysThisYear.has(dateStr);
        const jsDay = dateObj.getDay(); // 0 = dimanche
        const jour = JOURS[(jsDay + 6) % 7];

        // Un jour férié n'ouvre pas de ticket via le planning récurrent pour Clémence, Sylvain,
        // Capucine et Camille ; pour tout le reste de l'équipe, il compte normalement. Une
        // absence / un remplacement explicitement enregistré ce jour-là dans "Absences &
        // Remplacements" continue de compter normalement pour tout le monde.
        const HOLIDAY_EXCLUDED_TICKET_NAMES = new Set(["Clémence", "Sylvain", "Capucine", "Camille"]);
        const dayMap = new Map();
        for (const [prenom, intervals] of baseByDay.get(jour) || []) {
          if (isHoliday && HOLIDAY_EXCLUDED_TICKET_NAMES.has(prenom)) continue;
          dayMap.set(prenom, intervals.map(([s, e]) => [s, e]));
        }

        // Applique les absences et remplacements de cette date précise.
        for (const abs of absencesByDate.get(dateStr) || []) {
          const absStart = timeToMinutes(abs.heureDebut);
          const absEnd = timeToMinutes(abs.heureFin);

          if (dayMap.has(abs.prenom)) {
            dayMap.set(abs.prenom, subtractInterval(dayMap.get(abs.prenom), absStart, absEnd));
          }

          for (const v of abs.volunteers) {
            if (v.status !== "approved" && v.status) continue; // exclut "en attente" et "refusé"
            const vStart = timeToMinutes(v.heureDebut);
            const vEnd = timeToMinutes(v.heureFin);
            if (!dayMap.has(v.prenom)) dayMap.set(v.prenom, []);
            dayMap.get(v.prenom).push([vStart, vEnd]);
          }
        }

        const ticketsToday = (prenom, intervals) => {
          const merged = mergeIntervals(intervals);
          const overlaps = (a, b) => merged.some(([s, e]) => s < b && e > a);
          const covers = (a, b) => merged.some(([s, e]) => s <= a && e >= b);
          let count = 0;
          // Déjeuner : chevauche 13h-14h ET couvre entièrement 12h-13h (sinon, la personne perd
          // son droit au ticket même si elle chevauche 13h-14h).
          if (overlaps(13 * 60, 14 * 60) && covers(12 * 60, 13 * 60)) count += 1;
          // Dîner : chevauche 19h-20h ET couvre entièrement 20h-21h (même logique).
          if (overlaps(19 * 60, 20 * 60) && covers(20 * 60, 21 * 60)) count += 1;
          return count;
        };

        for (const [prenom, intervals] of dayMap) {
          if (!byPerson.has(prenom)) {
            byPerson.set(
              prenom,
              Object.fromEntries(JOURS.map((j) => [j, { count: 0, gain: 0, loss: 0 }]))
            );
          }
          const actual = ticketsToday(prenom, intervals);
          const baseIntervals =
            isHoliday && HOLIDAY_EXCLUDED_TICKET_NAMES.has(prenom)
              ? []
              : (baseByDay.get(jour) || new Map()).get(prenom) || [];
          const base = ticketsToday(prenom, baseIntervals);
          const delta = actual - base;
          const cell = byPerson.get(prenom)[jour];
          cell.count += actual;
          if (delta > 0) cell.gain += delta; // ticket(s) gagné(s) grâce à un remplacement
          if (delta < 0) cell.loss += -delta; // ticket(s) perdu(s) à cause d'une absence
        }
      }
    }

    const GROUPED_ORDER = ["Sylvain", "Clémence", "Capucine"];
    return [...byPerson.entries()]
      .map(([prenom, parJour]) => ({
        prenom,
        parJour,
        total: JOURS.reduce((acc, j) => acc + parJour[j].count, 0),
      }))
      .filter((r) => !FREELANCE_NAMES.has(r.prenom) && !TICKETS_EXCLUDED_NAMES.has(r.prenom))
      .sort((a, b) => {
        const ia = GROUPED_ORDER.indexOf(a.prenom);
        const ib = GROUPED_ORDER.indexOf(b.prenom);
        if (ia !== -1 || ib !== -1) {
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        }
        return a.prenom.localeCompare(b.prenom);
      });
  }, [planningByDay, sorted, yearFilter, monthFilter, selectedMonthKey]);

  if (!authUser) {
    return (
      <div
        className="min-h-screen bg-stone-50 text-slate-900 flex items-center justify-center p-4"
        style={{ fontFamily: "'Open Sans', sans-serif" }}
      >
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-sm shrink-0">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-semibold tracking-widest text-violet-600 uppercase">Service client</p>
          </div>

          {checkingSession ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
            </div>
          ) : (
            <>
              <h1
                className="text-xl font-bold text-slate-900 mb-1"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                {authView === "login" && "Connexion"}
                {authView === "signup" && "Créer un compte"}
                {authView === "forgot" && "Mot de passe oublié"}
                {authView === "reset" && "Réinitialiser le mot de passe"}
              </h1>
              <p className="text-xs text-slate-400 mb-5">
                {authView === "login" && ""}
                {authView === "signup" && "Créez votre compte avec votre adresse email professionnelle."}
                {authView === "forgot" && "Recevez un code pour réinitialiser votre mot de passe."}
                {authView === "reset" && "Saisissez le code reçu et votre nouveau mot de passe."}
              </p>

              {authError && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}
              {authInfo && !authError && (
                <div
                  role="status"
                  className="mb-4 rounded-lg border border-violet-300 bg-violet-50 px-3.5 py-3 text-sm text-violet-700 flex items-start gap-2"
                >
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authInfo}</span>
                </div>
              )}

              {authView === "login" && (
                <>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    value={loginEmail}
                    onChange={(ev) => setLoginEmail(ev.target.value)}
                    onKeyDown={(ev) => ev.key === "Enter" && handleLogin()}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm mb-3"
                  />
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Mot de passe</label>
                  <div className="relative mb-4">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(ev) => setLoginPassword(ev.target.value)}
                      onKeyDown={(ev) => ev.key === "Enter" && handleLogin()}
                      className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <label className="flex items-center gap-2 mb-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(ev) => setRememberMe(ev.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-xs text-slate-600">Rester connecté pendant 30 jours</span>
                  </label>
                  <button
                    onClick={handleLogin}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-4"
                  >
                    Se connecter
                  </button>
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => {
                        setAuthView("signup");
                        setAuthError("");
                        setAuthInfo("");
                      }}
                      className="text-xs font-medium text-violet-600 hover:text-violet-800"
                    >
                      Créer un compte
                    </button>
                    <button
                      onClick={() => {
                        setAuthView("forgot");
                        setAuthError("");
                        setAuthInfo("");
                      }}
                      className="text-xs font-medium text-slate-400 hover:text-slate-600"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                </>
              )}

              {authView === "signup" && (
                <>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Prénom</label>
                  <input
                    value={signupPrenom}
                    onChange={(ev) => setSignupPrenom(ev.target.value)}
                    onKeyDown={(ev) => ev.key === "Enter" && handleSignup()}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm mb-3"
                  />
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    value={signupEmail}
                    onChange={(ev) => setSignupEmail(ev.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm mb-3"
                  />
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Mot de passe</label>
                  <div className="relative mb-3">
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      value={signupPassword}
                      onChange={(ev) => setSignupPassword(ev.target.value)}
                      className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Confirmer le mot de passe</label>
                  <div className="relative mb-4">
                    <input
                      type={showSignupConfirm ? "text" : "password"}
                      value={signupConfirm}
                      onChange={(ev) => setSignupConfirm(ev.target.value)}
                      onKeyDown={(ev) => ev.key === "Enter" && handleSignup()}
                      className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showSignupConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={handleSignup}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                  >
                    Créer mon compte
                  </button>
                  <button
                    onClick={() => {
                      setAuthView("login");
                      setAuthError("");
                      setAuthInfo("");
                    }}
                    className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 mt-4"
                  >
                    J'ai déjà un compte
                  </button>
                </>
              )}

              {authView === "forgot" && (
                <>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    value={forgotEmail}
                    onChange={(ev) => setForgotEmail(ev.target.value)}
                    onKeyDown={(ev) => ev.key === "Enter" && handleRequestReset()}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm mb-4"
                  />
                  <button
                    onClick={handleRequestReset}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                  >
                    Recevoir un code
                  </button>
                  <button
                    onClick={() => {
                      setAuthView("login");
                      setAuthError("");
                      setAuthInfo("");
                    }}
                    className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 mt-4"
                  >
                    Retour à la connexion
                  </button>
                </>
              )}

              {authView === "reset" && (
                <>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Nouveau mot de passe</label>
                  <div className="relative mb-3">
                    <input
                      type={showResetNewPassword ? "text" : "password"}
                      value={resetNewPassword}
                      onChange={(ev) => setResetNewPassword(ev.target.value)}
                      className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Confirmer le mot de passe</label>
                  <div className="relative mb-4">
                    <input
                      type={showResetNewPasswordConfirm ? "text" : "password"}
                      value={resetNewPasswordConfirm}
                      onChange={(ev) => setResetNewPasswordConfirm(ev.target.value)}
                      onKeyDown={(ev) => ev.key === "Enter" && handleResetPassword()}
                      className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPasswordConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showResetNewPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={handleResetPassword}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                  >
                    Réinitialiser le mot de passe
                  </button>
                  <button
                    onClick={() => {
                      setAuthView("login");
                      setAuthError("");
                      setAuthInfo("");
                    }}
                    className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 mt-4"
                  >
                    Retour à la connexion
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-stone-50 text-slate-900 flex"
      style={{ fontFamily: "'Open Sans', sans-serif" }}
    >
      {/* Barre latérale (desktop) */}
      <aside className="hidden sm:flex sm:flex-col w-60 shrink-0 min-h-screen bg-white border-r border-slate-200 p-5">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-sm shrink-0">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs font-semibold tracking-widest text-violet-600 uppercase">
            Service client
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          {[
            { key: "admin", label: "Administration", icon: Settings },
            { key: "planning", label: "Planning", icon: Users },
            { key: "main", label: "Absences & Remplacements", icon: Calendar },
            { key: "echanges", label: "Échanges", icon: Repeat },
            { key: "archive", label: "Archives", icon: Archive },
          ]
            .filter((item) => item.key !== "admin" || isAdmin)
            .map((item) => (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className={`flex items-center gap-2.5 text-sm font-medium px-3 py-2.5 rounded-lg transition-colors text-left ${
                page === item.key ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" /> {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Connecté en tant que</p>
          <p className="text-sm font-medium text-slate-900 mb-1.5">{authUser?.prenom || authUser?.email}</p>
          <p className="text-[11px] text-slate-400 leading-snug mb-2">
            {isAdmin ? "Accès administrateur" : "Accès agent"}
          </p>
          <button
            onClick={handleLogout}
            className="text-xs font-medium text-slate-400 hover:text-rose-600 transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* En-tête : titre de la page actuelle (le logo/marque reste dans la barre latérale sur desktop) */}
        <header className="mb-6">
          <div className="flex items-center gap-2.5 mb-4 sm:hidden">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-sm shrink-0">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-semibold tracking-widest text-violet-600 uppercase">Service client</p>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {
              {
                admin: "Administration",
                planning: "Planning",
                main: "Absences & Remplacements",
                echanges: "Échanges",
                archive: "Archives",
              }[page]
            }
          </h1>
        </header>

        {/* Menu de navigation (mobile uniquement) */}
        <nav className="sm:hidden flex items-center gap-1.5 flex-wrap mb-8">
          {[
            { key: "admin", label: "Administration", icon: Settings },
            { key: "planning", label: "Planning", icon: Users },
            { key: "main", label: "Absences & Remplacements", icon: Calendar },
            { key: "echanges", label: "Échanges", icon: Repeat },
            { key: "archive", label: "Archives", icon: Archive },
          ]
            .filter((item) => item.key !== "admin" || isAdmin)
            .map((item) => (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className={`inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border transition-colors ${
                page === item.key
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
            >
              <item.icon className="w-4 h-4" /> {item.label}
            </button>
          ))}
        </nav>

        <div className="sm:hidden mb-8 bg-white border border-slate-200 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Connecté en tant que</p>
          <p className="text-sm font-medium text-slate-900 mb-1.5">{authUser?.prenom || authUser?.email}</p>
          <p className="text-[11px] text-slate-400 leading-snug mb-2">
            {isAdmin ? "Accès administrateur" : "Accès agent"}
          </p>
          <button
            onClick={handleLogout}
            className="text-xs font-medium text-slate-400 hover:text-rose-600 transition-colors"
          >
            Se déconnecter
          </button>
        </div>

        {page === "admin" ? (
          <div className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 uppercase tracking-wide">
                  <Settings className="w-4 h-4" /> Administration des données
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={statsMonthFilter}
                    onChange={(ev) => {
                      const v = ev.target.value;
                      setStatsMonthFilter(v === "toutes" ? "toutes" : Number(v));
                    }}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="toutes">Tous les mois</option>
                    {MONTH_NAMES.map((label, i) => (
                      <option key={label} value={i + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={statsYearFilter}
                    onChange={(ev) => setStatsYearFilter(Number(ev.target.value))}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>

                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-2xl font-bold text-slate-900">{adminStats.pendingCount}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Demande{adminStats.pendingCount > 1 ? "s" : ""} de remplacement en attente de validation
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-2xl font-bold text-slate-900">{adminStats.pendingExchangesCount}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Demande{adminStats.pendingExchangesCount > 1 ? "s" : ""} d'échange en attente de validation
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-2xl font-bold text-slate-900">{adminStats.uncoveredCount}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Absence{adminStats.uncoveredCount > 1 ? "s" : ""} à venir pas entièrement couverte
                    {adminStats.uncoveredCount > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-2xl font-bold text-slate-900">{formatDuration(adminStats.extraMinutes)}</p>
                  <p className="text-xs text-slate-500 mt-1">Heures supplémentaires</p>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="relative flex items-center gap-1.5">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    <Clock className="w-4 h-4" /> Heures travaillées par personne
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowHoursInfo((v) => !v)}
                    title="En savoir plus sur le calcul des heures travaillées"
                    className="text-violet-500 hover:text-violet-700 transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  {showHoursInfo && (
                    <div className="absolute top-6 left-0 z-10 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-4 normal-case">
                      <button
                        onClick={() => setShowHoursInfo(false)}
                        className="absolute top-3 right-3 text-slate-300 hover:text-slate-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 pr-5">
                        Freelance
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4">
                        Les prénoms affichés en <span className="text-violet-600 font-medium">violet</span>{" "}
                        correspondent aux personnes en contrat freelance.
                      </p>

                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                        Jour férié
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Par défaut, les jours fériés sont comptabilisés comme des jours travaillés, sauf pour
                        Clémence, Sylvain, Capucine et Camille, pour qui ils ne sont pas comptés.
                      </p>

                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-4 mb-2">
                        Pause
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Pour Capucine, une heure de pause est automatiquement décomptée par jour travaillé.
                      </p>

                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-4 mb-2">
                        Shifts Clémence & Sylvain
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Seules les heures de traitement des tickets sont comptabilisées pour Clémence et
                        Sylvain.
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={hoursMonthFilter}
                    onChange={(ev) => {
                      const v = ev.target.value;
                      setHoursMonthFilter(v === "toutes" ? "toutes" : Number(v));
                    }}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="toutes">Tous les mois</option>
                    {MONTH_NAMES.map((label, i) => (
                      <option key={label} value={i + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={hoursYearFilter}
                    onChange={(ev) => setHoursYearFilter(Number(ev.target.value))}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleExportWeeklyHoursPDF}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" /> Exporter en PDF
                  </button>
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Team Ticketing
              </p>

              {weeklyHoursByPerson.length === 0 ? (
                <p className="text-sm text-slate-400">Aucune personne dans le planning de l'équipe.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-center">
                    <thead>
                      <tr className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                        <th className="pb-2 pr-3">Personne</th>
                        <th className="pb-2 pr-3">Heures contractuelles</th>
                        <th className="pb-2 pr-3">Heures supplémentaires</th>
                        <th className="pb-2 pr-3">Heures d'absence</th>
                        <th className="pb-2 pr-3">Total</th>
                        <th className="pb-2 pr-3">+</th>
                        <th className="pb-2">−</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyHoursByPerson
                        .filter((row) =>
                          [
                            "Alice",
                            "Aurore",
                            "Boris",
                            "Clémence",
                            "Corolla",
                            "Emeline",
                            "Gabrielle",
                            "Hamza",
                            "Khalid",
                            "Romane",
                            "Sylvain",
                            "Victoria",
                            "Yann",
                          ].includes(row.prenom)
                        )
                        .sort((a, b) => {
                          const order = [
                            "Alice",
                            "Aurore",
                            "Boris",
                            "Clémence",
                            "Corolla",
                            "Emeline",
                            "Gabrielle",
                            "Hamza",
                            "Khalid",
                            "Romane",
                            "Sylvain",
                            "Victoria",
                            "Yann",
                          ];
                          return order.indexOf(a.prenom) - order.indexOf(b.prenom);
                        })
                        .map((row) => {
                        const adj = hoursAdjustments[hoursAdjustmentKeyFor(row.prenom)] || {
                          plus: 0,
                          minus: 0,
                        };
                        const totalMinutes =
                          row.monthlyMinutes + row.extraMinutes - row.absenceMinutes + adj.plus * 60 - adj.minus * 60;
                        return (
                          <tr key={row.prenom} className="border-t border-slate-100">
                            <td
                              className={`py-2 pr-3 font-medium ${
                                FREELANCE_NAMES.has(row.prenom) ? "text-violet-600" : "text-slate-900"
                              }`}
                            >
                              {row.prenom}
                            </td>
                            <td className="py-2 pr-3 text-slate-600">
                              {row.monthlyMinutes > 0 ? formatDuration(row.monthlyMinutes) : "—"}
                            </td>
                            <td className="py-2 pr-3 text-slate-600">
                              {row.extraMinutes > 0 ? formatDuration(row.extraMinutes) : "—"}
                            </td>
                            <td className="py-2 pr-3 text-slate-600">
                              {row.absenceMinutes > 0 ? formatDuration(row.absenceMinutes) : "—"}
                            </td>
                            <td className="py-2 pr-3 font-medium text-slate-900">
                              {formatDuration(totalMinutes)}
                            </td>
                            <td className="py-2 pr-3">
                              <input
                                type="number"
                                min="0"
                                step="0.25"
                                value={adj.plus || ""}
                                onChange={(ev) => updateHoursAdjustment(row.prenom, "plus", ev.target.value)}
                                disabled={!isAdmin}
                                placeholder="0"
                                className="w-16 px-1.5 py-1 rounded-md border border-slate-200 text-sm text-emerald-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                              />
                            </td>
                            <td className="py-2">
                              <input
                                type="number"
                                min="0"
                                step="0.25"
                                value={adj.minus || ""}
                                onChange={(ev) => updateHoursAdjustment(row.prenom, "minus", ev.target.value)}
                                disabled={!isAdmin}
                                placeholder="0"
                                className="w-16 px-1.5 py-1 rounded-md border border-slate-200 text-sm text-rose-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {(() => {
                const rows = ["Capucine", "Camille"].map((prenom) => {
                  const base = weeklyHoursByPerson.find((row) => row.prenom === prenom);
                  return {
                    prenom,
                    monthlyMinutes: base ? base.monthlyMinutes : 0,
                    extraMinutes: base ? base.extraMinutes : 0,
                    absenceMinutes: base ? base.absenceMinutes : 0,
                  };
                });
                return (
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                      Capucine & Camille
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-center">
                        <thead>
                          <tr className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                            <th className="pb-2 pr-3">Personne</th>
                            <th className="pb-2 pr-3">Heures contractuelles</th>
                            <th className="pb-2 pr-3">Heures supplémentaires</th>
                            <th className="pb-2 pr-3">Heures d'absence</th>
                            <th className="pb-2 pr-3">Total</th>
                            <th className="pb-2 pr-3">+</th>
                            <th className="pb-2">−</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => {
                            const adj = hoursAdjustments[hoursAdjustmentKeyFor(row.prenom)] || {
                              plus: 0,
                              minus: 0,
                            };
                            const totalMinutes =
                              row.monthlyMinutes + row.extraMinutes - row.absenceMinutes + adj.plus * 60 - adj.minus * 60;
                            const prenom = row.prenom;
                            return (
                              <tr key={prenom} className="border-t border-slate-100">
                                <td
                                  className={`py-2 pr-3 font-medium ${
                                    FREELANCE_NAMES.has(prenom) ? "text-violet-600" : "text-slate-900"
                                  }`}
                                >
                                  {prenom}
                                </td>
                                <td className="py-2 pr-3 text-slate-600">
                                  {row.monthlyMinutes > 0 ? formatDuration(row.monthlyMinutes) : "—"}
                                </td>
                                <td className="py-2 pr-3 text-slate-600">
                                  {row.extraMinutes > 0 ? formatDuration(row.extraMinutes) : "—"}
                                </td>
                                <td className="py-2 pr-3 text-slate-600">
                                  {row.absenceMinutes > 0 ? formatDuration(row.absenceMinutes) : "—"}
                                </td>
                                <td className="py-2 pr-3 font-medium text-slate-900">
                                  {formatDuration(totalMinutes)}
                                </td>
                                <td className="py-2 pr-3">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.25"
                                    value={adj.plus || ""}
                                    onChange={(ev) => updateHoursAdjustment(prenom, "plus", ev.target.value)}
                                    disabled={!isAdmin}
                                    placeholder="0"
                                    className="w-16 px-1.5 py-1 rounded-md border border-slate-200 text-sm text-emerald-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                  />
                                </td>
                                <td className="py-2">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.25"
                                    value={adj.minus || ""}
                                    onChange={(ev) => updateHoursAdjustment(prenom, "minus", ev.target.value)}
                                    disabled={!isAdmin}
                                    placeholder="0"
                                    className="w-16 px-1.5 py-1 rounded-md border border-slate-200 text-sm text-rose-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 uppercase tracking-wide">
                  <Clock className="w-4 h-4" /> Heures supplémentaires par personne
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={hoursMonthFilter}
                    onChange={(ev) => {
                      const v = ev.target.value;
                      setHoursMonthFilter(v === "toutes" ? "toutes" : Number(v));
                    }}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="toutes">Tous les mois</option>
                    {MONTH_NAMES.map((label, i) => (
                      <option key={label} value={i + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={hoursYearFilter}
                    onChange={(ev) => setHoursYearFilter(Number(ev.target.value))}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleExportExtraHoursPDF}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" /> Exporter en PDF
                  </button>
                </div>
              </div>

              {personSummaryTable.length === 0 ? (
                <p className="text-sm text-slate-400">Aucune donnée pour cette période.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-center">
                    <thead>
                      <tr className="text-center text-[10px] font-semibold text-slate-300 uppercase tracking-wide">
                        <th></th>
                        <th></th>
                        <th colSpan={4} className="pb-1 pl-3 border-l border-slate-200 font-semibold">
                          Détail des majorations
                        </th>
                      </tr>
                      <tr className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                        <th className="pb-2 pr-3">Personne</th>
                        <th className="pb-2 pr-3">Heures supplémentaires</th>
                        <th className="pb-2 pr-3 pl-3 border-l border-slate-200">LUN-SAM NUIT (21h-6h)</th>
                        <th className="pb-2 pr-3">DIM JOUR (6h-21h)</th>
                        <th className="pb-2 pr-3">DIM NUIT (21h-6h)</th>
                        <th className="pb-2">JOUR FÉRIÉ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personSummaryTable.map((row) => (
                        <tr key={row.prenom} className="border-t border-slate-100">
                          <td
                            className={`py-2 pr-3 font-medium ${
                              FREELANCE_NAMES.has(row.prenom) ? "text-violet-600" : "text-slate-900"
                            }`}
                          >
                            {row.prenom}
                          </td>
                          <td className="py-2 pr-3 text-slate-600">
                            {row.extraMinutes > 0 ? formatDuration(row.extraMinutes) : "—"}
                          </td>
                          <td className="py-2 pr-3 pl-3 text-slate-600 border-l border-slate-200">
                            {row.nightWeekdayMinutes > 0 ? formatDuration(row.nightWeekdayMinutes) : "—"}
                          </td>
                          <td className="py-2 pr-3 text-slate-600">
                            {row.sundayDayMinutes > 0 ? formatDuration(row.sundayDayMinutes) : "—"}
                          </td>
                          <td className="py-2 pr-3 text-slate-600">
                            {row.sundayNightMinutes > 0 ? formatDuration(row.sundayNightMinutes) : "—"}
                          </td>
                          <td className="py-2 text-slate-600">
                            {row.holidayMinutes > 0 ? formatDuration(row.holidayMinutes) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="relative flex items-center gap-1.5">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    <Utensils className="w-4 h-4" /> Tickets restaurant
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTicketInfo((v) => !v)}
                    title="En savoir plus sur le calcul des tickets restaurant"
                    className="text-violet-500 hover:text-violet-700 transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  {showTicketInfo && (
                    <div className="absolute top-6 left-0 z-10 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-4 normal-case">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Jour férié
                        </p>
                        <button
                          onClick={() => setShowTicketInfo(false)}
                          className="text-slate-300 hover:text-slate-500 shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Par défaut, les jours fériés sont comptabilisés comme des jours travaillés, sauf pour
                        Clémence, Sylvain, Capucine et Camille, pour qui ils ne sont pas comptés.
                      </p>

                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-4 mb-2">
                        Absence et remplacement
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Un <span className="text-rose-600 font-medium">-1</span> en rouge signifie qu'un
                        ticket restaurant a été retiré parce qu'une absence a fait perdre le droit à ce
                        ticket ce jour-là.
                        <br />
                        Un <span className="text-emerald-600 font-medium">+1</span> en vert signifie qu'un
                        remplacement a été validé dans "Absences & Remplacements" et qu'il ouvre droit à un
                        ticket restaurant supplémentaire.
                        <br />
                        Le nombre de tickets affiché est automatiquement augmenté ou réduit en fonction de
                        ces + et -.
                      </p>

                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-4 mb-2">
                        Ajustement
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Deux colonnes <span className="text-slate-500 font-medium">+</span> et{" "}
                        <span className="text-slate-500 font-medium">−</span> sont disponibles en bout de
                        tableau pour ajouter ou retirer des tickets restaurant à la main si besoin.
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={monthFilter}
                    onChange={(ev) => {
                      const v = ev.target.value;
                      setMonthFilter(v === "toutes" ? "toutes" : Number(v));
                    }}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="toutes">Tous les mois</option>
                    {MONTH_NAMES.map((label, i) => (
                      <option key={label} value={i + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={yearFilter}
                    onChange={(ev) => setYearFilter(Number(ev.target.value))}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleExportTicketsPDF}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" /> Exporter en PDF
                  </button>
                </div>
              </div>

              {ticketsRestaurantByPerson.length === 0 ? (
                <p className="text-sm text-slate-400">Aucun ticket à attribuer pour cette période.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-center">
                    <thead>
                      <tr className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                        <th className="pb-2 pr-3">Personne</th>
                        {JOURS.map((j) => (
                          <th key={j} className="pb-2 pr-3 text-center">
                            {j.slice(0, 3)}
                          </th>
                        ))}
                        <th className="pb-2 pr-3 text-center">Total mois</th>
                        <th className="pb-2 pr-3 text-center">+</th>
                        <th className="pb-2 text-center">−</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticketsRestaurantByPerson.map((row) => {
                        const adj = ticketAdjustments[adjustmentKeyFor(row.prenom)] || { plus: 0, minus: 0 };
                        return (
                          <tr key={row.prenom} className="border-t border-slate-100">
                            <td
                              className={`py-2 pr-3 font-medium ${
                                FREELANCE_NAMES.has(row.prenom) ? "text-violet-600" : "text-slate-900"
                              }`}
                            >
                              {row.prenom}
                            </td>
                            {JOURS.map((j) => {
                              const cell = row.parJour[j];
                              return (
                                <td key={j} className="py-2 pr-3 text-slate-600 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <span>{cell.count || "—"}</span>
                                    {cell.gain > 0 && (
                                      <span className="text-[10px] font-medium text-emerald-600">
                                        +{cell.gain}
                                      </span>
                                    )}
                                    {cell.loss > 0 && (
                                      <span className="text-[10px] font-medium text-rose-600">
                                        -{cell.loss}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="py-2 pr-3 font-medium text-slate-900 text-center">
                              {row.total + (adj.plus || 0) - (adj.minus || 0)}
                            </td>
                            <td className="py-2 pr-3 text-center">
                              <input
                                type="number"
                                min="0"
                                value={adj.plus || ""}
                                onChange={(ev) => updateTicketAdjustment(row.prenom, "plus", ev.target.value)}
                                disabled={!isAdmin}
                                placeholder="0"
                                className="w-14 px-1.5 py-1 rounded-md border border-slate-200 text-sm text-center text-emerald-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                              />
                            </td>
                            <td className="py-2 text-center">
                              <input
                                type="number"
                                min="0"
                                value={adj.minus || ""}
                                onChange={(ev) => updateTicketAdjustment(row.prenom, "minus", ev.target.value)}
                                disabled={!isAdmin}
                                placeholder="0"
                                className="w-14 px-1.5 py-1 rounded-md border border-slate-200 text-sm text-center text-rose-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </div>
        ) : page === "planning" ? (
          <>
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
              <div className="relative flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-1.5">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 uppercase tracking-wide">
                  <Users className="w-3.5 h-3.5" /> Planning de l'équipe
                </p>
                <button
                  type="button"
                  onClick={() => setShowPlanningInfo((v) => !v)}
                  title="En savoir plus sur le planning de l'équipe"
                  className="text-violet-500 hover:text-violet-700 transition-colors"
                >
                  <Info className="w-4 h-4" />
                </button>

                {showPlanningInfo && (
                  <div className="absolute top-6 left-0 z-10 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-4 normal-case">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        À savoir
                      </p>
                      <button
                        onClick={() => setShowPlanningInfo(false)}
                        className="text-slate-300 hover:text-slate-500 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Les prénoms affichés en{" "}
                      <span className="text-violet-600 font-medium">violet</span> correspondent aux
                      personnes en contrat freelance.
                      <br />
                      Le nombre entre parenthèses à côté de chaque prénom indique le nombre d'heures
                      travaillées ce jour-là.
                    </p>
                  </div>
                )}
                </div>
                <button
                  onClick={handleExportPlanningPDF}
                  className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700 transition-colors"
                >
                  <Save className="w-4 h-4" /> Exporter en PDF
                </button>
              </div>

              {/* Formulaire d'ajout d'un créneau */}
              {planFormError && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{planFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 sm:gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Prénom</label>
                  <input
                    value={planPrenom}
                    onChange={(ev) => setPlanPrenom(capitalizeName(ev.target.value))}
                    readOnly={!canEditPlanning}
                    className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-sm ${
                      planInvalidFields.prenom
                        ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
                        : "border-slate-300 focus:ring-violet-500 focus:border-violet-500"
                    }`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Jour</label>
                  <select
                    value={planJour}
                    onChange={(ev) => canEditPlanning && setPlanJour(ev.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-sm ${
                      planInvalidFields.jour
                        ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
                        : "border-slate-300 focus:ring-violet-500 focus:border-violet-500"
                    }`}
                  >
                    <option value="">Choisir un jour</option>
                    {JOURS.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Heure de début</label>
                  <input
                    type="time"
                    value={planHeureDebut}
                    onChange={(ev) => setPlanHeureDebut(ev.target.value)}
                    readOnly={!canEditPlanning}
                    className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-sm ${
                      planInvalidFields.heureDebut
                        ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
                        : "border-slate-300 focus:ring-violet-500 focus:border-violet-500"
                    }`}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Heure de fin</label>
                  <input
                    type="time"
                    value={planHeureFin}
                    onChange={(ev) => setPlanHeureFin(ev.target.value)}
                    readOnly={!canEditPlanning}
                    className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-sm ${
                      planInvalidFields.heureFin
                        ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
                        : "border-slate-300 focus:ring-violet-500 focus:border-violet-500"
                    }`}
                  />
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddShift}
                  disabled={planningSaving || !canEditPlanning}
                  title={!canEditPlanning ? "Lecture seule : connectez-vous avec un compte administrateur pour modifier" : undefined}
                  className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  {planningSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Ajouter au planning
                </button>
              </div>

              {!canEditPlanning && (
                <p className="mt-2 text-xs text-slate-400 text-right">
                  Lecture seule — seule l'administration peut modifier le planning.
                </p>
              )}

              {planningError && <p className="mt-3 text-sm text-rose-600">{planningError}</p>}

              {/* Timeline visuelle : qui travaille avec qui, par jour */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                {planning === null ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm py-6 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
                  </div>
                ) : (
                  <div className="space-y-6">
                    {planningTimelineByDay.map(({ jour, people }) => (
                      <div key={jour}>
                        <p className="text-sm font-bold text-slate-900 mb-2">{jour}</p>
                        {people.length === 0 ? (
                          <p className="text-xs text-slate-300 italic">Aucun créneau</p>
                        ) : (
                          <div className="border border-slate-100 rounded-lg overflow-hidden">
                            {/* Axe des heures */}
                            <div className="flex items-center gap-2 px-2 pt-1.5 pb-1 border-b border-slate-100">
                              <span className="w-20 shrink-0" />
                              <span className="w-10 shrink-0 text-[10px] text-slate-400 font-medium">Shift</span>
                              <div className="relative flex-1 h-3 text-[10px] text-slate-400">
                                {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
                                  <span
                                    key={h}
                                    className="absolute top-0 -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
                                    style={{ left: `${(h / 24) * 100}%` }}
                                  >
                                    {h}h
                                  </span>
                                ))}
                              </div>
                            </div>
                            {jour === MEETING_DAY && (
                              <div className="flex items-center gap-2 px-2 pt-1 text-[10px] text-amber-600">
                                <span className="w-20 shrink-0" />
                                <div className="relative flex-1">
                                  <span
                                    className="absolute -translate-x-1/2 font-medium"
                                    style={{ left: `${((MEETING_START + MEETING_END) / 2 / 1440) * 100}%` }}
                                  >
                                    Réunion CS
                                  </span>
                                </div>
                              </div>
                            )}
                            {/* Une ligne par personne */}
                            {people.map(({ prenom, segments }) => (
                              <div
                                key={prenom}
                                className="flex items-center gap-2 px-2 py-1 border-b border-slate-50 last:border-b-0"
                              >
                                <span
                                  className={`w-20 shrink-0 text-xs font-medium truncate ${
                                    FREELANCE_NAMES.has(prenom) ? "text-violet-600" : "text-slate-700"
                                  }`}
                                >
                                  {prenom}
                                </span>
                                <span className="w-10 shrink-0 text-[11px] text-slate-400 tabular-nums text-left">
                                  {formatDuration(
                                    segments.reduce(
                                      (acc, s) =>
                                        acc + (effectiveEndMinutes(s.heureFin) - timeToMinutes(s.heureDebut)),
                                      0
                                    )
                                  )}
                                </span>
                                <div className="relative flex-1 h-5 bg-slate-50 rounded">
                                  {[3, 6, 9, 12, 15, 18, 21].map((h) => (
                                    <div
                                      key={h}
                                      className="absolute top-0 bottom-0 w-px bg-slate-200"
                                      style={{ left: `${(h / 24) * 100}%` }}
                                    />
                                  ))}
                                  {segments.map((s) => {
                                    const start = timeToMinutes(s.heureDebut);
                                    const end = timeToMinutes(s.heureFin);
                                    const left = (start / 1440) * 100;
                                    const width = Math.max(((end - start) / 1440) * 100, 1);
                                    const chunks = splitSegmentForMeeting(
                                      start,
                                      end,
                                      jour === MEETING_DAY && MEETING_ATTENDEES.has(prenom)
                                    );
                                    const segDuration = end - start || 1;
                                    return (
                                      <button
                                        key={s.id}
                                        onClick={() => canEditPlanning && startEditShift(s)}
                                        title={
                                          canEditPlanning
                                            ? `${prenom} : ${formatHeureAffichage(s.heureDebut)} – ${formatHeureAffichage(
                                                s.heureFin
                                              )}${
                                                chunks.some((c) => c.isMeeting) ? " (dont réunion CS 15h-16h)" : ""
                                              } (cliquer pour modifier)`
                                            : `${prenom} : ${formatHeureAffichage(s.heureDebut)} – ${formatHeureAffichage(
                                                s.heureFin
                                              )} (lecture seule)`
                                        }
                                        className={`absolute top-0 bottom-0 rounded-sm overflow-hidden transition-colors ${
                                          canEditPlanning ? "" : "cursor-default"
                                        } ${
                                          planEditingId === s.id ? "ring-2 ring-violet-300" : ""
                                        }`}
                                        style={{ left: `${left}%`, width: `${width}%` }}
                                      >
                                        <div className="relative w-full h-full flex items-center justify-center">
                                          {chunks.map((c, i) => (
                                            <div
                                              key={i}
                                              className={`absolute top-0 bottom-0 ${
                                                c.isMeeting
                                                  ? "bg-amber-500"
                                                  : planEditingId === s.id
                                                  ? "bg-violet-800"
                                                  : "bg-violet-500 hover:bg-violet-600"
                                              }`}
                                              style={{
                                                left: `${((c.start - start) / segDuration) * 100}%`,
                                                width: `${((c.end - c.start) / segDuration) * 100}%`,
                                              }}
                                            />
                                          ))}
                                          {width > 8 && (
                                            <span className="relative text-[9px] text-white font-medium px-0.5 truncate">
                                              {formatHeureAffichage(s.heureDebut)}–{formatHeureAffichage(s.heureFin)}
                                            </span>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                  {jour === MEETING_DAY && MEETING_ATTENDEES.has(prenom) && (
                                    <div
                                      title={`${prenom} : Réunion CS 15h-16h`}
                                      className="absolute top-0 bottom-0 bg-amber-500 rounded-sm flex items-center justify-center overflow-hidden"
                                      style={{
                                        left: `${(MEETING_START / 1440) * 100}%`,
                                        width: `${((MEETING_END - MEETING_START) / 1440) * 100}%`,
                                      }}
                                    >
                                      <span className="text-[9px] text-white font-medium px-0.5 truncate">CS</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Panneau d'édition du créneau sélectionné sur ce jour */}
                        {planEditingId &&
                          people.some((p) => p.segments.some((s) => s.id === planEditingId)) && (
                            <div className="mt-2 border border-violet-200 bg-violet-50/50 rounded-lg p-3">
                              <div className="grid grid-cols-4 gap-2">
                                <input
                                  value={planEditDraft.prenom}
                                  onChange={(ev) => updatePlanEditDraft("prenom", capitalizeName(ev.target.value))}
                                  className="px-2 py-1.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                                <select
                                  value={planEditDraft.jour}
                                  onChange={(ev) => updatePlanEditDraft("jour", ev.target.value)}
                                  className="px-2 py-1.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                >
                                  {JOURS.map((j) => (
                                    <option key={j} value={j}>
                                      {j}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="time"
                                  value={planEditDraft.heureDebut}
                                  onChange={(ev) => updatePlanEditDraft("heureDebut", ev.target.value)}
                                  className="px-2 py-1.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                                <input
                                  type="time"
                                  value={planEditDraft.heureFin}
                                  onChange={(ev) => updatePlanEditDraft("heureFin", ev.target.value)}
                                  className="px-2 py-1.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                              </div>
                              {isUnknownName(planEditDraft.prenom) && (
                                <p className="mt-1.5 text-xs text-amber-600">
                                  Prénom inconnu de l'équipe, vérifiez l'orthographe.
                                </p>
                              )}
                              {planEditError && <p className="mt-2 text-xs text-rose-600">{planEditError}</p>}
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  onClick={() => saveEditShift(planEditingId)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 px-2.5 py-1 rounded-md"
                                >
                                  <Save className="w-3.5 h-3.5" /> Enregistrer
                                </button>
                                <button
                                  onClick={cancelEditShift}
                                  className="text-xs text-slate-400 hover:text-slate-600"
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={() => handleDeleteShift(planEditingId)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 ml-auto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                                </button>
                              </div>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : page === "echanges" ? (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 mb-8">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                <ArrowLeftRight className="w-4 h-4" /> Proposer un échange de créneaux
              </p>

              {exFormError && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{exFormError}</span>
                </div>
              )}

              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Votre créneau</p>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 sm:gap-4 mb-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Prénom</label>
                  <input
                    value={exPrenom}
                    onChange={(e) => setExPrenom(capitalizeName(e.target.value))}
                    className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-sm disabled:bg-white disabled:text-slate-900 ${
                      exInvalidFields.exPrenom
                        ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
                        : "border-slate-300 focus:ring-violet-500 focus:border-violet-500"
                    }`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={exDate}
                    onChange={(e) => setExDate(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-sm disabled:bg-white disabled:text-slate-900 ${
                      exInvalidFields.exDate
                        ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
                        : "border-slate-300 focus:ring-violet-500 focus:border-violet-500"
                    }`}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Heure de début</label>
                  <input
                    type="time"
                    value={exHeureDebut}
                    onChange={(e) => setExHeureDebut(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-sm disabled:bg-white disabled:text-slate-900 ${
                      exInvalidFields.exHeureDebut
                        ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
                        : "border-slate-300 focus:ring-violet-500 focus:border-violet-500"
                    }`}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Heure de fin</label>
                  <input
                    type="time"
                    value={exHeureFin}
                    onChange={(e) => setExHeureFin(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-sm disabled:bg-white disabled:text-slate-900 ${
                      exInvalidFields.exHeureFin
                        ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
                        : "border-slate-300 focus:ring-violet-500 focus:border-violet-500"
                    }`}
                  />
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Créneau échangé <span className="normal-case font-normal text-slate-400">(facultatif)</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 sm:gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Prénom du collègue</label>
                  <input
                    value={exCollegue}
                    onChange={(e) => setExCollegue(capitalizeName(e.target.value))}
                    className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-sm disabled:bg-white disabled:text-slate-900 ${
                      exInvalidFields.exCollegue
                        ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
                        : "border-slate-300 focus:ring-violet-500 focus:border-violet-500"
                    }`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={exCollegueDate}
                    onChange={(e) => setExCollegueDate(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-sm disabled:bg-white disabled:text-slate-900 ${
                      exInvalidFields.exCollegueDate
                        ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
                        : "border-slate-300 focus:ring-violet-500 focus:border-violet-500"
                    }`}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Heure de début</label>
                  <input
                    type="time"
                    value={exCollegueHeureDebut}
                    onChange={(e) => setExCollegueHeureDebut(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-sm disabled:bg-white disabled:text-slate-900 ${
                      exInvalidFields.exCollegueHeureDebut
                        ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
                        : "border-slate-300 focus:ring-violet-500 focus:border-violet-500"
                    }`}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Heure de fin</label>
                  <input
                    type="time"
                    value={exCollegueHeureFin}
                    onChange={(e) => setExCollegueHeureFin(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-sm disabled:bg-white disabled:text-slate-900 ${
                      exInvalidFields.exCollegueHeureFin
                        ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
                        : "border-slate-300 focus:ring-violet-500 focus:border-violet-500"
                    }`}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleAddExchange}
                  disabled={exchangesSaving}
                  className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
                >
                  {exchangesSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Proposer l'échange
                </button>
              </div>

              {exchangesError && <p className="mt-3 text-sm text-rose-600">{exchangesError}</p>}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 uppercase tracking-wide">
                  <ArrowLeftRight className="w-4 h-4" /> Échanges renseignés {exchanges ? `(${filteredExchanges.length})` : ""}
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={exMonthFilter}
                    onChange={(ev) => {
                      const v = ev.target.value;
                      setExMonthFilter(v === "toutes" ? "toutes" : Number(v));
                    }}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="toutes">Tous les mois</option>
                    {MONTH_NAMES.map((label, i) => (
                      <option key={label} value={i + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={exYearFilter}
                    onChange={(ev) => setExYearFilter(Number(ev.target.value))}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {availableExchangeYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {exchanges === null ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
                </div>
              ) : groupedExchangesByMonth.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-300 rounded-2xl text-slate-400 text-sm">
                  <ArrowLeftRight className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  {activeExchanges.length === 0
                    ? "Aucun échange n'a encore été renseigné."
                    : "Aucun échange pour ce mois."}
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedExchangesByMonth.map((group) => (
                    <div key={group.key}>
                      <h3 className="text-lg font-bold text-slate-900 mb-3">{group.label}</h3>
                      <ul className="space-y-2">
                        {group.items.map((ex) => (
                          <li key={ex.id} className="bg-white border border-slate-200 rounded-xl p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  {ex.status === "open" && (
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-violet-100 text-violet-700 border-violet-300">
                                      Ouvert
                                    </span>
                                  )}
                                  {ex.status === "pending" && (
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-orange-100 text-orange-800 border-orange-300">
                                      À valider
                                    </span>
                                  )}
                                  {ex.status === "approved" && (
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-teal-100 text-teal-800 border-teal-300">
                                      Validé
                                    </span>
                                  )}
                                  {ex.status === "rejected" && (
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-rose-100 text-rose-700 border-rose-300">
                                      Refusé
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 flex-wrap text-sm">
                                  <span>
                                    <span className="font-semibold text-slate-900">{ex.prenom}</span>{" "}
                                    <span className="text-slate-500">
                                      {formatDateLong(ex.date)} · {ex.heureDebut}–{ex.heureFin}
                                    </span>
                                  </span>
                                  {ex.status !== "open" && (
                                    <>
                                      <ArrowLeftRight className="w-4 h-4 text-slate-300 shrink-0" />
                                      <span>
                                        <span className="font-semibold text-slate-900">{ex.collegue}</span>{" "}
                                        <span className="text-slate-500">
                                          {formatDateLong(ex.collegueDate)} · {ex.collegueHeureDebut}–
                                          {ex.collegueHeureFin}
                                        </span>
                                      </span>
                                    </>
                                  )}
                                </div>

                                {ex.status === "open" &&
                                  (exPositionOpenFor === ex.id ? (
                                    <div className="mt-3 flex flex-wrap items-end gap-2">
                                      <div>
                                        <label className="block text-xs text-slate-400 mb-1">Prénom</label>
                                        <input
                                          autoFocus
                                          value={exPositionDraft[ex.id]?.collegue || ""}
                                          onChange={(ev) =>
                                            updateExchangePositionDraft(ex.id, "collegue", capitalizeName(ev.target.value))
                                          }
                                          placeholder="Votre prénom"
                                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm w-32"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-slate-400 mb-1">Date</label>
                                        <input
                                          type="date"
                                          value={exPositionDraft[ex.id]?.date || ""}
                                          onChange={(ev) =>
                                            updateExchangePositionDraft(ex.id, "date", ev.target.value)
                                          }
                                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-slate-400 mb-1">De</label>
                                        <input
                                          type="time"
                                          value={exPositionDraft[ex.id]?.heureDebut || ""}
                                          onChange={(ev) =>
                                            updateExchangePositionDraft(ex.id, "heureDebut", ev.target.value)
                                          }
                                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-slate-400 mb-1">À</label>
                                        <input
                                          type="time"
                                          value={exPositionDraft[ex.id]?.heureFin || ""}
                                          onChange={(ev) =>
                                            updateExchangePositionDraft(ex.id, "heureFin", ev.target.value)
                                          }
                                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                                        />
                                      </div>
                                      <button
                                        onClick={() => submitExchangePosition(ex.id)}
                                        className="text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg h-fit"
                                      >
                                        Confirmer
                                      </button>
                                      <button
                                        onClick={() => {
                                          setExPositionOpenFor(null);
                                          setExPositionError((f) => ({ ...f, [ex.id]: "" }));
                                        }}
                                        className="text-sm text-slate-400 hover:text-slate-600 px-2 py-1.5 h-fit"
                                      >
                                        Annuler
                                      </button>
                                      {exPositionError[ex.id] && (
                                        <p className="w-full text-xs text-rose-600 flex items-center gap-1 mt-1">
                                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {exPositionError[ex.id]}
                                        </p>
                                      )}
                                    </div>
                                  ) : null)}

                                {ex.status === "pending" && (
                                  <div className="mt-3 flex items-center gap-2">
                                    <button
                                      onClick={() => approveExchange(ex.id)}
                                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-white hover:bg-emerald-600 border border-emerald-300 rounded-md px-2 py-1 transition-colors"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Valider
                                    </button>
                                    <button
                                      onClick={() => declineExchange(ex.id)}
                                      className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 hover:text-white hover:bg-rose-600 border border-rose-300 rounded-md px-2 py-1 transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" /> Refuser
                                    </button>
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteExchange(ex.id)}
                                title="Supprimer"
                                className="shrink-0 p-2 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            {ex.status === "open" && exPositionOpenFor !== ex.id && (
                              <div className="mt-6 pt-3 border-t border-slate-100 flex justify-center">
                                <button
                                  onClick={() => {
                                    setExPositionOpenFor(ex.id);
                                    if (authUser?.prenom) updateExchangePositionDraft(ex.id, "collegue", authUser.prenom);
                                  }}
                                  className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors bg-violet-600 hover:bg-violet-700 text-white"
                                >
                                  <HandHelping className="w-4 h-4" /> Je me positionne
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : page === "archive" ? (
          <>
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 mb-8">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">
              <Archive className="w-4 h-4" /> Absences archivées {archivedSorted.length ? `(${archivedSorted.length})` : ""}
            </p>
            {archivedSorted.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Aucune absence archivée pour le moment. Une absence rejoint automatiquement les archives une fois sa date passée.
              </div>
            ) : (
              <ul className="space-y-2">
                {archivedSorted.map((e) => {
                  const approved = e.volunteers.filter((v) => v.status === "approved" || !v.status);
                  const pending = e.volunteers.filter((v) => v.status === "pending");
                  const rejected = e.volunteers.filter((v) => v.status === "rejected");
                  const uncovered = getUncoveredRanges(e, approved);
                  const isComplete = uncovered.length === 0;
                  return (
                    <li
                      key={e.id}
                      className="border border-slate-100 rounded-xl p-3 flex items-start justify-between gap-3 opacity-80"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900">{e.prenom}</span>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                              isComplete
                                ? "bg-teal-100 text-teal-800 border-teal-300"
                                : approved.length > 0
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            {isComplete ? "Complet" : approved.length > 0 ? "Partiellement couvert" : "Non couvert"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {formatDateLong(e.date)}
                          {isFrenchHoliday(e.date) && (
                            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full border bg-violet-100 text-violet-700 border-violet-300">
                              Férié
                            </span>
                          )}
                          {" "}· {e.heureDebut} – {e.heureFin}
                        </p>
                        {(approved.length > 0 || rejected.length > 0 || pending.length > 0) && (
                          <p className="text-xs text-slate-400 mt-1">
                            {[
                              approved.length > 0 && `${approved.length} validé${approved.length > 1 ? "s" : ""}`,
                              rejected.length > 0 && `${rejected.length} refusé${rejected.length > 1 ? "s" : ""}`,
                              pending.length > 0 && `${pending.length} en attente`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                      {canEditArchive && (
                        <button
                          onClick={() => handleDelete(e.id)}
                          title="Supprimer définitivement"
                          className="shrink-0 p-2 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">
              <ArrowLeftRight className="w-4 h-4" /> Échanges archivés {archivedExchanges.length ? `(${archivedExchanges.length})` : ""}
            </p>
            {archivedExchanges.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Aucun échange archivé pour le moment. Un échange rejoint automatiquement les archives une fois ses deux créneaux passés.
              </div>
            ) : (
              <ul className="space-y-2">
                {archivedExchanges.map((ex) => (
                  <li
                    key={ex.id}
                    className="border border-slate-100 rounded-xl p-3 flex items-start justify-between gap-3 opacity-80"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        {ex.status === "open" && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-violet-100 text-violet-700 border-violet-300">
                            Ouvert
                          </span>
                        )}
                        {ex.status === "pending" && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-orange-100 text-orange-800 border-orange-300">
                            À valider
                          </span>
                        )}
                        {ex.status === "approved" && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-teal-100 text-teal-800 border-teal-300">
                            Validé
                          </span>
                        )}
                        {ex.status === "rejected" && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-rose-100 text-rose-700 border-rose-300">
                            Refusé
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap text-sm">
                        <span>
                          <span className="font-semibold text-slate-900">{ex.prenom}</span>{" "}
                          <span className="text-slate-500">
                            {formatDateLong(ex.date)} · {ex.heureDebut}–{ex.heureFin}
                          </span>
                        </span>
                        {ex.collegue && (
                          <>
                            <ArrowLeftRight className="w-4 h-4 text-slate-300 shrink-0" />
                            <span>
                              <span className="font-semibold text-slate-900">{ex.collegue}</span>{" "}
                              <span className="text-slate-500">
                                {formatDateLong(ex.collegueDate)} · {ex.collegueHeureDebut}–{ex.collegueHeureFin}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteExchange(ex.id)}
                      title="Supprimer définitivement"
                      className="shrink-0 p-2 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          </>
        ) : (
        <>
        {/* Formulaire manager */}
        <div
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 mb-8"
        >
          <div ref={formTopRef} />
          <div className="relative flex items-center gap-1.5 mb-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 uppercase tracking-wide">
              <Calendar className="w-4 h-4" /> Renseigner une absence
            </p>
            <button
              type="button"
              onClick={() => setShowGhostInfo((v) => !v)}
              title="En savoir plus sur le prénom Ghost"
              className="text-violet-500 hover:text-violet-700 transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>

            {showGhostInfo && (
              <div className="absolute top-6 left-0 z-10 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-4 normal-case">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ghost</p>
                  <button
                    onClick={() => setShowGhostInfo(false)}
                    className="text-slate-300 hover:text-slate-500 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Mettre le prénom "Ghost" lorsqu'il s'agit d'un créneau ouvert aux heures
                  supplémentaires sans remplacement d'un membre de l'équipe.
                </p>
              </div>
            )}
          </div>

          {formError && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 sm:gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Prénom</label>
              <input
                value={prenom}
                onChange={(e) => setPrenom(capitalizeName(e.target.value))}
                readOnly={!isAdmin}
                className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-sm disabled:bg-white disabled:text-slate-900 ${
                  invalidFields.prenom
                    ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
                    : "border-slate-300 focus:ring-violet-500 focus:border-violet-500"
                }`}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                readOnly={!isAdmin}
                className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-sm disabled:bg-white disabled:text-slate-900 ${
                  invalidFields.date
                    ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
                    : "border-slate-300 focus:ring-violet-500 focus:border-violet-500"
                }`}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Heure de début</label>
              <input
                type="time"
                value={heureDebut}
                onChange={(e) => setHeureDebut(e.target.value)}
                readOnly={!isAdmin}
                className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-sm disabled:bg-white disabled:text-slate-900 ${
                  invalidFields.heureDebut
                    ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
                    : "border-slate-300 focus:ring-violet-500 focus:border-violet-500"
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Heure de fin</label>
              <input
                type="time"
                value={heureFin}
                onChange={(e) => setHeureFin(e.target.value)}
                readOnly={!isAdmin}
                className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-sm disabled:bg-white disabled:text-slate-900 ${
                  invalidFields.heureFin
                    ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
                    : "border-slate-300 focus:ring-violet-500 focus:border-violet-500"
                }`}
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end">
            {!isAdmin && (
              <p className="text-xs text-slate-400 mr-3">
                Seuls les administrateurs peuvent renseigner une absence.
              </p>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !isAdmin}
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Ajouter l'absence
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        </div>

        {/* Liste */}
        <section>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 uppercase tracking-wide">
              <Calendar className="w-4 h-4" /> Absences renseignées {entries ? `(${activeSorted.length})` : ""}
            </h2>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: "toutes", label: "Toutes" },
                { key: "non_complet", label: "À pourvoir / Partiellement couvert" },
                { key: "complet", label: "Complet" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    statusFilter === f.key
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {entries === null ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
            </div>
          ) : filteredSorted.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-300 rounded-2xl text-slate-400 text-sm">
              <Clock className="w-6 h-6 mx-auto mb-2 text-slate-300" />
              {sorted.length === 0
                ? "Aucune absence n'a encore été renseignée."
                : "Aucune absence ne correspond à ce filtre."}
            </div>
          ) : (
            <div className="space-y-6">
              {groupedByMonth.map((group) => (
                <div key={group.key}>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">
                    {group.label}
                  </h3>
                  <ul className="space-y-2">
                    {group.items.map((e) => {
                const past = isPast(e);
                const approvedVolunteers = e.volunteers.filter((v) => v.status === "approved" || !v.status);
                const pendingVolunteers = e.volunteers.filter((v) => v.status === "pending");
                const rejectedVolunteers = e.volunteers.filter((v) => v.status === "rejected");
                const hasVolunteers = approvedVolunteers.length > 0;
                const uncoveredRanges = getUncoveredRanges(e, approvedVolunteers);
                const isComplete = uncoveredRanges.length === 0;
                const showReplacementPanel =
                  pendingVolunteers.length > 0 ||
                  approvedVolunteers.length > 0 ||
                  rejectedVolunteers.length > 0 ||
                  openVolunteerFor === e.id;
                return (
                  <li
                    key={e.id}
                    className={`bg-white border rounded-xl p-4 ${past ? "border-slate-100 opacity-60" : isComplete ? "border-teal-200" : hasVolunteers ? "border-amber-200" : "border-slate-200"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {editingId === e.id ? (
                          <div>
                            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">
                              <Pencil className="w-3.5 h-3.5" /> Modifier l'absence
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                              <div className="col-span-2">
                                <label className="block text-xs text-slate-400 mb-1">Prénom</label>
                                <input
                                  autoFocus
                                  value={editDraft.prenom}
                                  onChange={(ev) => updateEditDraft("prenom", capitalizeName(ev.target.value))}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                                />
                                {isUnknownName(editDraft.prenom) && (
                                  <p className="text-xs text-amber-600 mt-1">Prénom inconnu, vérifiez l'orthographe.</p>
                                )}
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs text-slate-400 mb-1">Date</label>
                                <input
                                  type="date"
                                  value={editDraft.date}
                                  onChange={(ev) => updateEditDraft("date", ev.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                                />
                              </div>
                              <div className="col-span-1">
                                <label className="block text-xs text-slate-400 mb-1">De</label>
                                <input
                                  type="time"
                                  value={editDraft.heureDebut}
                                  onChange={(ev) => updateEditDraft("heureDebut", ev.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                                />
                              </div>
                              <div className="col-span-1">
                                <label className="block text-xs text-slate-400 mb-1">À</label>
                                <input
                                  type="time"
                                  value={editDraft.heureFin}
                                  onChange={(ev) => updateEditDraft("heureFin", ev.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                                />
                              </div>
                            </div>

                            {editError && (
                              <p className="mt-2 text-xs text-rose-600 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {editError}
                              </p>
                            )}

                            <div className="mt-3 flex items-center gap-2">
                              <button
                                onClick={() => saveEdit(e.id)}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg"
                              >
                                <Save className="w-3.5 h-3.5" /> Enregistrer
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-sm text-slate-400 hover:text-slate-600 px-2 py-1.5"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-slate-900">{e.prenom}</span>
                              {!past && !hasVolunteers && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-amber-100 text-amber-800 border-amber-300">
                                  À pourvoir
                                </span>
                              )}
                              {hasVolunteers && !isComplete && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-amber-100 text-amber-800 border-amber-300">
                                  Partiellement couvert
                                </span>
                              )}
                              {isComplete && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-teal-100 text-teal-800 border-teal-300">
                                  Complet
                                </span>
                              )}
                            </div>
                            <div className="mt-2 space-y-1 text-sm">
                              <p className="text-slate-600">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-1.5">
                                  Date
                                </span>
                                {formatDateLong(e.date)}
                                {isFrenchHoliday(e.date) && (
                                  <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full border bg-violet-100 text-violet-700 border-violet-300">
                                    Férié
                                  </span>
                                )}
                              </p>
                              <p className="text-slate-600">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-1.5">
                                  Créneau
                                </span>
                                {e.heureDebut} – {e.heureFin}
                                {hasVolunteers && !isComplete && (
                                  <span className="text-amber-700 ml-2">
                                    (reste à couvrir : {uncoveredRanges.map(([d, f]) => `${d}–${f}`).join(", ")})
                                  </span>
                                )}
                              </p>
                            </div>
                          </>
                        )}

                      </div>
                      {editingId !== e.id && (
                        <div className="shrink-0 flex items-center gap-0.5">
                          <button
                            onClick={() => startEdit(e)}
                            title="Modifier"
                            className="p-2 rounded-lg text-slate-300 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(e.id)}
                            title="Supprimer"
                            className="p-2 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Panneau "Remplacement" — visuellement distinct des infos de l'absence */}
                    {showReplacementPanel && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Remplacement
                        </p>
                        {pendingVolunteers.length > 0 && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-orange-100 text-orange-800 border-orange-300">
                            {pendingVolunteers.length} demande{pendingVolunteers.length > 1 ? "s" : ""} en attente
                          </span>
                        )}
                      </div>

                    {/* demandes en attente / validées / refusées, en 3 colonnes égales */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      {/* colonne : en attente */}
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[11px] font-semibold text-orange-700 uppercase tracking-wide mb-1">
                          En attente
                        </p>
                        {pendingVolunteers.length === 0 ? (
                          <p className="text-xs text-slate-300 italic">Aucune</p>
                        ) : (
                          pendingVolunteers.map((v) => (
                            <div
                              key={v.id}
                              className="relative text-xs font-medium bg-orange-50 border border-orange-200 text-slate-700 rounded-lg p-2 pr-6"
                            >
                              <button
                                onClick={() => removeVolunteerEntry(e.id, v.id)}
                                title="Supprimer la proposition"
                                className="absolute top-1.5 right-1.5 hover:text-rose-600 text-slate-400"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                              <div className="font-semibold text-slate-900">{v.prenom}</div>
                              <div className="text-slate-500 font-normal">
                                {v.heureDebut} – {v.heureFin}
                              </div>
                              <div className="flex flex-col gap-1 mt-1.5">
                                <button
                                  onClick={() => approveVolunteer(e.id, v.id)}
                                  title="Valider"
                                  className="inline-flex items-center justify-center gap-1 text-emerald-700 hover:text-white hover:bg-emerald-600 border border-emerald-300 rounded-md px-1.5 py-0.5 transition-colors"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Valider
                                </button>
                                <button
                                  onClick={() => declineVolunteer(e.id, v.id)}
                                  title="Refuser"
                                  className="inline-flex items-center justify-center gap-1 text-rose-700 hover:text-white hover:bg-rose-600 border border-rose-300 rounded-md px-1.5 py-0.5 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" /> Refuser
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* colonne : validées */}
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide mb-1">
                          Validés
                        </p>
                        {approvedVolunteers.length === 0 ? (
                          <p className="text-xs text-slate-300 italic">Aucune</p>
                        ) : (
                          approvedVolunteers.map((v) => (
                            <div
                              key={v.id}
                              className="relative text-xs font-medium bg-emerald-50 border border-emerald-200 text-slate-700 rounded-lg p-2 pr-6"
                            >
                              <button
                                onClick={() => removeVolunteerEntry(e.id, v.id)}
                                title="Retirer"
                                className="absolute top-1.5 right-1.5 hover:text-rose-600 text-slate-400"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                              <div className="font-semibold text-slate-900">{v.prenom}</div>
                              <div className="text-slate-500 font-normal">
                                {v.heureDebut} – {v.heureFin}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* colonne : refusées */}
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wide mb-1">
                          Refusés
                        </p>
                        {rejectedVolunteers.length === 0 ? (
                          <p className="text-xs text-slate-300 italic">Aucune</p>
                        ) : (
                          rejectedVolunteers.map((v) => (
                            <div
                              key={v.id}
                              className="relative text-xs font-medium bg-rose-50 border border-rose-200 text-slate-700 rounded-lg p-2 pr-6"
                            >
                              <button
                                onClick={() => removeVolunteerEntry(e.id, v.id)}
                                title="Supprimer"
                                className="absolute top-1.5 right-1.5 hover:text-rose-600 text-slate-400"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                              <div className="font-semibold text-slate-900">{v.prenom}</div>
                              <div className="text-slate-500 font-normal">
                                {v.heureDebut} – {v.heureFin}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>


                    {/* positionnement */}
                    {!past && editingId !== e.id && (
                      openVolunteerFor === e.id ? (
                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Prénom</label>
                            <input
                              autoFocus
                              value={volunteerDraft[e.id]?.prenom || ""}
                              onChange={(ev) => updateVolunteerDraft(e.id, "prenom", capitalizeName(ev.target.value))}
                              placeholder="Votre prénom"
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm w-32"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">De</label>
                            <input
                              type="time"
                              value={volunteerDraft[e.id]?.heureDebut || ""}
                              onChange={(ev) => updateVolunteerDraft(e.id, "heureDebut", ev.target.value)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">À</label>
                            <input
                              type="time"
                              value={volunteerDraft[e.id]?.heureFin || ""}
                              onChange={(ev) => updateVolunteerDraft(e.id, "heureFin", ev.target.value)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                            />
                          </div>
                          <button
                            onClick={() => confirmVolunteer(e.id)}
                            className="text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg h-fit"
                          >
                            Confirmer
                          </button>
                          <button
                            onClick={() => {
                              setOpenVolunteerFor(null);
                              setVolunteerFormError((f) => ({ ...f, [e.id]: "" }));
                            }}
                            className="text-sm text-slate-400 hover:text-slate-600 px-2 py-1.5 h-fit"
                          >
                            Annuler
                          </button>
                          {volunteerFormError[e.id] && (
                            <p className="w-full text-xs text-rose-600 flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {volunteerFormError[e.id]}
                            </p>
                          )}
                        </div>
                      ) : null
                    )}
                    </div>
                    )}
                    {!past && editingId !== e.id && openVolunteerFor !== e.id && (
                      <div className="mt-6 pt-3 border-t border-slate-100 flex justify-center">
                        <button
                          onClick={() => {
                            if (isComplete) return;
                            setOpenVolunteerFor(e.id);
                            if (authUser?.prenom) updateVolunteerDraft(e.id, "prenom", authUser.prenom);
                          }}
                          disabled={isComplete}
                          title={isComplete ? "Ce créneau est déjà entièrement couvert" : undefined}
                          className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                            isComplete
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "bg-violet-600 hover:bg-violet-700 text-white"
                          }`}
                        >
                          <HandHelping className="w-4 h-4" /> Je me positionne
                        </button>
                      </div>
                    )}
                  </li>
                );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
        </>
        )}
      </div>
      </main>
    </div>
  );
}
