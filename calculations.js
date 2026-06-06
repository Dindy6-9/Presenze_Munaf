// =============================================
// CALCULATIONS.JS - Calcoli automatici
// =============================================

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToHours(minutes) {
  return Math.round((minutes / 60) * 100) / 100;
}

function formatHours(h) {
  if (h === 0 || h === '0') return '0:00';
  const sign = h < 0 ? '-' : '';
  const abs = Math.abs(h);
  const hours = Math.floor(abs);
  const mins = Math.round((abs - hours) * 60);
  return `${sign}${hours}:${String(mins).padStart(2, '0')}`;
}

function formatHoursDecimal(h) {
  if (!h || h === 0) return '0';
  return String(h).replace('.', ',');
}

function calcWorkedHours(checkIn, checkOut, breakMinutes) {
  if (!checkIn || !checkOut) return 0;
  const inMin = timeToMinutes(checkIn);
  const outMin = timeToMinutes(checkOut);
  if (outMin <= inMin) return 0;
  const worked = outMin - inMin - (breakMinutes || 0);
  return minutesToHours(Math.max(0, worked));
}

function calcTicket(workedHours) {
  return workedHours >= 6 ? 1 : 0;
}

function calcDifference(workedHours, contractHours) {
  return Math.round((workedHours - contractHours) * 100) / 100;
}

function processEntry(entry) {
  const workedHours = calcWorkedHours(entry.checkIn, entry.checkOut, entry.breakMinutes);
  const ticket = calcTicket(workedHours);
  const difference = calcDifference(workedHours, entry.contractHours || 0);
  return { ...entry, workedHours, ticket, difference };
}

function calcMonthlyTotals(entries) {
  const totals = {
    contractHours: 0,
    workedHours: 0,
    sickHours: 0,
    holidayHours: 0,
    recoveryHours: 0,
    supplementaryHours: 0,
    overtimeDayHours: 0,
    overtimeNightHours: 0,
    accruedHours: 0,
    tickets: 0,
    balanceHours: 0,
    travelDays: 0
  };

  for (const e of entries) {
    totals.contractHours      += e.contractHours || 0;
    totals.workedHours        += e.workedHours || 0;
    totals.sickHours          += e.sickHours || 0;
    totals.holidayHours       += e.holidayHours || 0;
    totals.recoveryHours      += e.recoveryAbsenceHours || 0;
    totals.supplementaryHours += e.supplementaryHours || 0;
    totals.overtimeDayHours   += e.overtimeDayHours || 0;
    totals.overtimeNightHours += e.overtimeNightHours || 0;
    totals.accruedHours       += e.accruedHours || 0;
    totals.tickets            += e.ticket || 0;
    if (e.travel) totals.travelDays++;
  }

  // Saldo calcolato SOLO dai campi manuali (algebrico)
  totals.balanceHours = Math.round((
    totals.supplementaryHours +
    totals.overtimeDayHours +
    totals.overtimeNightHours +
    totals.accruedHours -
    totals.sickHours -
    totals.holidayHours -
    totals.recoveryHours
  ) * 100) / 100;

  return totals;
}

// Saldo giornaliero dai campi manuali
function calcDailyBalance(entry) {
  const plus = (entry.supplementaryHours || 0) + (entry.overtimeDayHours || 0) +
               (entry.overtimeNightHours || 0) + (entry.accruedHours || 0);
  const minus = (entry.sickHours || 0) + (entry.holidayHours || 0) +
                (entry.recoveryAbsenceHours || 0);
  return Math.round((plus - minus) * 100) / 100;
}

const DAYS_IT = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
const MONTHS_IT = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
];

function getDayName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return DAYS_IT[d.getDay()];
}

function formatDateIT(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month - 1, 1);
  let day = d.getDay();
  return day === 0 ? 6 : day - 1;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function currentYear()  { return new Date().getFullYear(); }
function currentMonth() { return new Date().getMonth() + 1; }

function getEntryType(entry) {
  if (!entry) return null;
  if (entry.sickHours > 0) return 'malattia';
  if (entry.holidayHours > 0) return 'ferie';
  if (entry.recoveryAbsenceHours > 0) return 'recupero';
  if (entry.travel) return 'trasferta';
  if (entry.workedHours > 0 || entry.checkIn) return 'lavoro';
  return null;
}
