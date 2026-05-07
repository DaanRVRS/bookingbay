export const previewKpis = [
  { label: "Vandaag", value: "12", hint: "lopende boekingen", trend: "+20%" },
  { label: "Deze week", value: "47", hint: "totaal boekingen", trend: "+8%" },
  { label: "Items", value: "23", hint: "actief", trend: null },
  { label: "Omzet", value: "€4.832", hint: "deze week", trend: "+12%" },
];

export const previewBookings = [
  { time: "14:00", item: "Sloep Aurora", client: "Jan de Vries", status: "Bevestigd" },
  { time: "09:30", item: "Bakfiets Urban", client: "Lisa Klein", status: "Bevestigd" },
  { time: "11:00", item: "Sloep Aurora", client: "Pieter Janssen", status: "In behandeling" },
  { time: "16:00", item: "Sup Set Pro", client: "Mike Bos", status: "Bevestigd" },
  { time: "10:30", item: "Kano Tweezit", client: "Sara A.", status: "Lopend" },
];

export const previewActivity = [
  { who: "Lisa Klein", action: "bevestigde boeking #B-024" },
  { who: "Daan", action: "voegde item 'Sloep Mira' toe" },
  { who: "Systeem", action: "stuurde bevestiging naar Jan de Vries" },
  { who: "Daan", action: "wijzigde prijs van 'Bakfiets Urban'" },
];

export const previewSidebarItems = [
  { label: "Overzicht", icon: "home", active: true, count: null },
  { label: "Planning", icon: "calendar", active: false, count: null },
  { label: "Boekingen", icon: "check", active: false, count: 7 },
  { label: "Leads", icon: "inbox", active: false, count: 1 },
  { label: "Klanten", icon: "users", active: false, count: null },
  { label: "Items", icon: "package", active: false, count: 8 },
  { label: "Categorieën", icon: "layers", active: false, count: null },
  { label: "Klantsite", icon: "globe", active: false, count: null },
  { label: "Activiteitenlog", icon: "scroll", active: false, count: null },
  { label: "Team", icon: "user-cog", active: false, count: null },
  { label: "Instellingen", icon: "settings", active: false, count: null },
];
