// =============================================
// APP.JS - Logica principale Presenze MUNAF
// =============================================

let appSettings = {
  employeeName: '',
  defaultContractHours: 7.5,
  contractHoursFriday: 7,
  defaultBreakMinutes: 30,
  theme: 'grafite'
};

let currentView = 'dashboard';
let calendarYear = currentYear();
let calendarMonth = currentMonth();
let historySearch = '';
let editingEntryId = null;
let historyEntries = [];

// =============================================
// INIT
// =============================================

async function init() {
  await initDB();
  const saved = await getAllSettings();
  if (Object.keys(saved).length > 0) {
    appSettings = { ...appSettings, ...saved };
  }
  applyTheme(appSettings.theme);

  if (!appSettings.employeeName) {
    showView('setup');
    return;
  }

  showView('dashboard');
  await refreshDashboard();
  // Snapshot automatico settimanale
  await checkAndAutoSnapshot();
}

// =============================================
// ORE CONTRATTO PER GIORNO
// =============================================

function getContractHoursForDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  if (day === 5) return parseFloat(appSettings.contractHoursFriday) || 7;
  if (day === 6 || day === 0) return 0;
  return parseFloat(appSettings.defaultContractHours) || 7.5;
}

// =============================================
// THEME
// =============================================

const THEMES = {
  grafite:  { primary: '#1e3a5f', accent: '#3b82f6', bg: '#0f172a', surface: '#1e293b', text: '#e2e8f0', subtext: '#94a3b8', border: '#334155', row1: '#1e293b', row2: '#263348' },
  petrolio: { primary: '#0f4c3a', accent: '#10b981', bg: '#0a1a14', surface: '#0f2d22', text: '#d1fae5', subtext: '#6ee7b7', border: '#1a4a35', row1: '#0f2d22', row2: '#163d2e' },
  bordeaux: { primary: '#6b1e2e', accent: '#f43f5e', bg: '#1a0a10', surface: '#2d1218', text: '#fce7f3', subtext: '#f9a8d4', border: '#4a1525', row1: '#2d1218', row2: '#3d1a22' },
  viola:    { primary: '#3b1f6b', accent: '#a855f7', bg: '#0f0a1a', surface: '#1e1230', text: '#ede9fe', subtext: '#c4b5fd', border: '#3b2d6b', row1: '#1e1230', row2: '#271840' },
  grigio:   { primary: '#374151', accent: '#6b7280', bg: '#111827', surface: '#1f2937', text: '#f9fafb', subtext: '#9ca3af', border: '#374151', row1: '#1f2937', row2: '#273040' },
  chiaro:   { primary: '#1e40af', accent: '#3b82f6', bg: '#f8fafc', surface: '#ffffff', text: '#1e293b', subtext: '#64748b', border: '#e2e8f0', row1: '#f8fafc', row2: '#f1f5f9' },
  salvia:   { primary: '#4a7c59', accent: '#7fb98a', bg: '#f0f5f1', surface: '#ffffff', text: '#2d3b30', subtext: '#6b8f72', border: '#c8dece', row1: '#f0f5f1', row2: '#e4ede6' },
  azzurro:  { primary: '#4a7fa5', accent: '#7ab3d0', bg: '#f0f5fa', surface: '#ffffff', text: '#1e3048', subtext: '#6b8faa', border: '#c0d8e8', row1: '#f0f5fa', row2: '#e2eef5' }
};

function applyTheme(themeName) {
  const t = THEMES[themeName] || THEMES.grafite;
  const r = document.documentElement.style;
  r.setProperty('--primary', t.primary);
  r.setProperty('--accent', t.accent);
  r.setProperty('--bg', t.bg);
  r.setProperty('--surface', t.surface);
  r.setProperty('--text', t.text);
  r.setProperty('--subtext', t.subtext);
  r.setProperty('--border', t.border);
  r.setProperty('--row1', t.row1);
  r.setProperty('--row2', t.row2);
}

// =============================================
// VIEWS
// =============================================

function showView(name) {
  currentView = name;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(`view-${name}`);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name);
  });
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.style.display = name === 'setup' ? 'none' : 'flex';
}

// =============================================
// SETUP
// =============================================

async function saveSetup() {
  const name = document.getElementById('setup-name').value.trim();
  if (!name) { showToast('Inserisci il tuo nome', 'error'); return; }

  appSettings.employeeName = name;
  appSettings.defaultContractHours = parseFloat(document.getElementById('setup-hours').value) || 7.5;
  appSettings.contractHoursFriday = parseFloat(document.getElementById('setup-hours-fri').value) || 7;
  appSettings.defaultBreakMinutes = parseInt(document.getElementById('setup-break').value) || 30;
  appSettings.theme = document.getElementById('setup-theme').value;

  for (const [k, v] of Object.entries(appSettings)) {
    await saveSetting(k, v);
  }
  applyTheme(appSettings.theme);
  showView('dashboard');
  await refreshDashboard();
  showToast('Configurazione salvata!', 'success');
}

// =============================================
// DASHBOARD
// =============================================

async function refreshDashboard() {
  const year = currentYear();
  const month = currentMonth();
  const entries = await getEntriesByMonth(year, month);
  const processed = entries.map(processEntry);
  const totals = calcMonthlyTotals(processed);

  document.getElementById('dash-name').textContent = appSettings.employeeName;
  document.getElementById('dash-month').textContent = `${MONTHS_IT[month - 1]} ${year}`;
  document.getElementById('dash-ore').textContent = formatHours(totals.workedHours);
  document.getElementById('dash-ticket').textContent = totals.tickets;
  const bal = totals.balanceHours;
  const balEl = document.getElementById('dash-saldo');
  balEl.textContent = `${bal > 0 ? '+' : ''}${formatHours(bal)}`;
  balEl.className = 'stat-value ' + (bal > 0 ? 'positive' : bal < 0 ? 'negative' : '');

  const today = todayStr();
  const todayEntry = await getEntryByDate(today);
  const lastEl = document.getElementById('dash-last');
  if (todayEntry) {
    const pe = processEntry(todayEntry);
    lastEl.innerHTML = `<span class="badge badge-ok">Oggi registrato</span> ${pe.checkIn || '—'} → ${pe.checkOut || '—'} &nbsp;|&nbsp; ${formatHours(pe.workedHours)} ore`;
  } else {
    lastEl.innerHTML = `<span class="badge badge-warn">Oggi non registrato</span>`;
  }
}

// =============================================
// FORM NUOVA GIORNATA
// =============================================

async function openNewEntry(date) {
  editingEntryId = null;
  const d = date || todayStr();
  document.getElementById('form-title').textContent = 'Nuova Giornata';
  resetForm();
  document.getElementById('entry-date').value = d;
  await onDateChange();
  showView('form');
}

function resetForm() {
  ['entry-date','entry-checkin','entry-checkout','entry-sick','entry-holiday',
   'entry-recovery','entry-supp','entry-otday','entry-otnight','entry-accrued',
   'entry-travel-desc','entry-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  // Reset tutti i toggle
  ['entry-travel','entry-smart','entry-holiday-flag'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
  document.getElementById('travel-desc-row').style.display = 'none';
  updateCalcPreview();
}

function fillForm(e) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('entry-date', e.date);
  set('entry-checkin', e.checkIn);
  set('entry-checkout', e.checkOut);
  set('entry-break', e.breakMinutes);
  set('entry-contract', e.contractHours);
  set('entry-sick', e.sickHours);
  set('entry-holiday', e.holidayHours);
  set('entry-recovery', e.recoveryAbsenceHours);
  set('entry-supp', e.supplementaryHours);
  set('entry-otday', e.overtimeDayHours);
  set('entry-otnight', e.overtimeNightHours);
  set('entry-accrued', e.accruedHours);
  set('entry-notes', e.notes);
  set('entry-travel-desc', e.travelDescription);
  document.getElementById('entry-travel').checked = !!e.travel;
  document.getElementById('travel-desc-row').style.display = e.travel ? 'block' : 'none';
  if (document.getElementById('entry-smart')) document.getElementById('entry-smart').checked = !!e.smartWorking;
  if (document.getElementById('entry-holiday-flag')) document.getElementById('entry-holiday-flag').checked = !!e.festivoFlag;
  updateCalcPreview();
}

// Naviga tra i giorni nel form
function navigateDay(dir) {
  const dateEl = document.getElementById('entry-date');
  if (!dateEl.value) {
    dateEl.value = todayStr();
  }
  const d = new Date(dateEl.value + 'T00:00:00');
  d.setDate(d.getDate() + dir);
  const newDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  dateEl.value = newDate;
  onDateChange();
}

async function onDateChange() {
  const dateEl = document.getElementById('entry-date');
  const d = dateEl.value;
  if (!d) return;

  // Aggiorna ore contratto in base al giorno
  if (!editingEntryId) {
    document.getElementById('entry-contract').value = getContractHoursForDate(d);
  }

  // Pausa = 0 automaticamente per sabato, domenica
  const dow = new Date(d + 'T00:00:00').getDay();
  const isWeekend = dow === 0 || dow === 6;
  if (isWeekend) {
    document.getElementById('entry-break').value = 0;
  } else {
    if (!editingEntryId) {
      document.getElementById('entry-break').value = appSettings.defaultBreakMinutes;
    }
  }

  // Carica eventuale registrazione esistente per quella data
  const existing = await getEntryByDate(d);
  if (existing) {
    editingEntryId = existing.id;
    document.getElementById('form-title').textContent = 'Modifica Giornata';
    fillForm(existing);
  } else {
    editingEntryId = null;
    document.getElementById('form-title').textContent = 'Nuova Giornata';
    // Reset solo i campi variabili, non la data
    ['entry-checkin','entry-checkout','entry-sick','entry-holiday',
     'entry-recovery','entry-supp','entry-otday','entry-otnight',
     'entry-accrued','entry-travel-desc','entry-notes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['entry-travel','entry-smart','entry-holiday-flag'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    });
    document.getElementById('travel-desc-row').style.display = 'none';
    document.getElementById('entry-contract').value = getContractHoursForDate(d);
    document.getElementById('entry-break').value = (isWeekend || isFestivo) ? 0 : appSettings.defaultBreakMinutes;
    updateCalcPreview();
  }
}

function timbraOra(fieldId) {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const el = document.getElementById(fieldId);
  if (el) {
    el.value = `${hh}:${mm}`;
    updateCalcPreview();
    showToast(fieldId === 'entry-checkin' ? `Entrata: ${hh}:${mm}` : `Uscita: ${hh}:${mm}`, 'success');
  }
}

function updateCalcPreview() {
  const checkIn = document.getElementById('entry-checkin').value;
  const checkOut = document.getElementById('entry-checkout').value;
  const isSmart = document.getElementById('entry-smart') && document.getElementById('entry-smart').checked;
  const isFestivo = document.getElementById('entry-holiday-flag') && document.getElementById('entry-holiday-flag').checked;

  // Pausa = 0 solo per festivo
  const dateVal = document.getElementById('entry-date').value;
  if (dateVal) {
    const isFestivoCheck = document.getElementById('entry-holiday-flag') && document.getElementById('entry-holiday-flag').checked;
    if (isFestivoCheck) document.getElementById('entry-break').value = 0;
  }

  const breakMin = parseInt(document.getElementById('entry-break').value) || 0;
  const contract = parseFloat(document.getElementById('entry-contract').value) || 0;

  const worked = calcWorkedHours(checkIn, checkOut, breakMin);
  const ticket = (isFestivo || isSmart || (document.getElementById('entry-travel') && document.getElementById('entry-travel').checked)) ? 0 : calcTicket(worked);
  const diff = calcDifference(worked, contract);

  document.getElementById('calc-worked').textContent = formatHours(worked);
  document.getElementById('calc-ticket').textContent = ticket;
  const diffEl = document.getElementById('calc-diff');
  diffEl.textContent = `${diff > 0 ? '+' : ''}${formatHours(diff)}`;
  diffEl.className = diff > 0 ? 'positive' : diff < 0 ? 'negative' : '';
}

async function saveEntry_form() {
  const date = document.getElementById('entry-date').value;
  if (!date) { showToast('Seleziona la data', 'error'); return; }

  const checkIn = document.getElementById('entry-checkin').value;
  const checkOut = document.getElementById('entry-checkout').value;
  const dow = new Date(date + 'T00:00:00').getDay();
  const isWeekendDay = dow === 0 || dow === 6;
  const isFestivoDay = document.getElementById('entry-holiday-flag') && document.getElementById('entry-holiday-flag').checked;
  const breakMinutes = (isWeekendDay || isFestivoDay) ? 0 : (parseInt(document.getElementById('entry-break').value) || 0);
  const contractHours = parseFloat(document.getElementById('entry-contract').value) || getContractHoursForDate(date);
  const workedHours = calcWorkedHours(checkIn, checkOut, breakMinutes);
  const ticket = calcTicket(workedHours);

  const entry = {
    id: editingEntryId || undefined,
    date, checkIn, checkOut, breakMinutes, contractHours,
    workedHours, ticket,
    difference: calcDifference(workedHours, contractHours),
    sickHours: parseFloat(document.getElementById('entry-sick').value) || 0,
    holidayHours: parseFloat(document.getElementById('entry-holiday').value) || 0,
    recoveryAbsenceHours: parseFloat(document.getElementById('entry-recovery').value) || 0,
    supplementaryHours: parseFloat(document.getElementById('entry-supp').value) || 0,
    overtimeDayHours: parseFloat(document.getElementById('entry-otday').value) || 0,
    overtimeNightHours: parseFloat(document.getElementById('entry-otnight').value) || 0,
    accruedHours: parseFloat(document.getElementById('entry-accrued').value) || 0,
    travel: document.getElementById('entry-travel').checked,
    travelDescription: document.getElementById('entry-travel-desc').value,
    smartWorking: document.getElementById('entry-smart') ? document.getElementById('entry-smart').checked : false,
    festivoFlag: document.getElementById('entry-holiday-flag') ? document.getElementById('entry-holiday-flag').checked : false,
    notes: (() => {
      // Rimuovi eventuali tag automatici già presenti nella nota
      let base = document.getElementById('entry-notes').value || '';
      base = base.replace(/🏠 Smart Working\s*\|?\s*/g, '').replace(/🎉 Festivo\s*\|?\s*/g, '').replace(/✈️ Trasferta[^—]*\s*\|?\s*/g, '').replace(/^\s*—\s*/, '').trim();
      const tags = [];
      if (document.getElementById('entry-smart') && document.getElementById('entry-smart').checked) tags.push('🏠 Smart Working');
      if (document.getElementById('entry-holiday-flag') && document.getElementById('entry-holiday-flag').checked) tags.push('🎉 Festivo');
      if (document.getElementById('entry-travel') && document.getElementById('entry-travel').checked) {
        const desc = document.getElementById('entry-travel-desc').value;
        tags.push('✈️ Trasferta' + (desc ? ': ' + desc : ''));
      }
      const autoNote = tags.join(' | ');
      if (!base) return autoNote;
      if (!autoNote) return base;
      return autoNote + ' — ' + base;
    })()
  };

  await saveEntry(entry);
  showToast('Giornata salvata!', 'success');
  showView('dashboard');
  await refreshDashboard();
  // Snapshot automatico settimanale
  await checkAndAutoSnapshot();
}

// =============================================
// CALENDARIO
// =============================================

async function renderCalendar() {
  const y = calendarYear;
  const m = calendarMonth;
  document.getElementById('cal-label').textContent = `${MONTHS_IT[m - 1]} ${y}`;

  const entries = await getEntriesByMonth(y, m);
  const processed = entries.map(processEntry);
  const byDate = {};
  processed.forEach(e => byDate[e.date] = e);

  const firstDay = getFirstDayOfMonth(y, m);
  const daysInMonth = getDaysInMonth(y, m);
  const today = todayStr();

  let html = '';
  ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].forEach(d => {
    html += `<div class="cal-header-cell">${d}</div>`;
  });

  for (let i = 0; i < firstDay; i++) html += `<div class="cal-cell empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const entry = byDate[dateStr];
    const type = getEntryType(entry);
    const isToday = dateStr === today;
    const dow = new Date(dateStr + 'T00:00:00').getDay();
    const isWeekend = dow === 0 || dow === 6;

    let cls = 'cal-cell';
    if (type) cls += ` cal-${type}`;
    if (isToday) cls += ' cal-today';
    if (isWeekend) cls += ' cal-weekend';

    const ticket = entry && entry.ticket ? '<span class="cal-ticket">T</span>' : '';
    const travel = entry && entry.travel ? '<span class="cal-travel-icon">✈</span>' : '';
    html += `<div class="${cls}" onclick="openNewEntry('${dateStr}')">
      <span class="cal-day-num">${d}</span>${ticket}${travel}
      ${entry ? `<span class="cal-hours">${formatHours(entry.workedHours)}</span>` : ''}
    </div>`;
  }

  document.getElementById('cal-grid').innerHTML = html;
}

function calNav(dir) {
  calendarMonth += dir;
  if (calendarMonth > 12) { calendarMonth = 1; calendarYear++; }
  if (calendarMonth < 1)  { calendarMonth = 12; calendarYear--; }
  renderCalendar();
}

// =============================================
// STORICO
// =============================================

async function renderHistory() {
  historyEntries = await getAllEntries();
  const processed = historyEntries.map(processEntry).reverse();
  const search = historySearch.toLowerCase();
  const filtered = search
    ? processed.filter(e =>
        e.date.includes(search) ||
        formatDateIT(e.date).includes(search) ||
        (e.notes || '').toLowerCase().includes(search) ||
        (e.travelDescription || '').toLowerCase().includes(search)
      )
    : processed;

  if (filtered.length === 0) {
    document.getElementById('history-list').innerHTML = `<div class="empty-state">Nessuna registrazione trovata</div>`;
    return;
  }

  const html = filtered.map(e => {
    const type = getEntryType(e);
    const typeLabel = { lavoro:'Lavoro', ferie:'Ferie', malattia:'Malattia', recupero:'Recupero', trasferta:'Trasferta' }[type] || '—';
    return `<div class="history-item">
      <div class="history-left">
        <span class="history-day">${getDayName(e.date)}</span>
        <span class="history-date">${formatDateIT(e.date)}</span>
        <span class="badge badge-${type || 'empty'}">${typeLabel}</span>
      </div>
      <div class="history-center">
        <span>${e.checkIn || '—'} → ${e.checkOut || '—'}</span>
        <span class="history-hours">
          ${formatHours(e.workedHours)} ore
          ${(() => { const diff = e.difference || 0; return diff !== 0 ? `<span class="history-diff ${diff > 0 ? 'positive' : 'negative'}">(${diff > 0 ? '+' : ''}${formatHours(diff)})</span>` : ''; })()}
        </span>
        ${(() => { const bal = calcDailyBalance(e); return bal !== 0 ? `<span class="badge ${bal > 0 ? 'badge-ok' : 'badge-warn'}">Saldo: ${bal > 0 ? '+' : ''}${formatHours(bal)}</span>` : ''; })()}
        ${e.ticket ? '<span class="badge badge-ok">🎫 Ticket</span>' : ''}
        ${e.travel ? '<span class="badge badge-trasferta">✈ Trasferta</span>' : ''}
        ${e.notes ? `<span class="history-note">${e.notes}</span>` : ''}
      </div>
      <div class="history-actions">
        <button class="btn-icon" onclick="openNewEntry('${e.date}')" title="Modifica">✏️</button>
        <button class="btn-icon btn-danger" onclick="confirmDelete('${e.id}')" title="Elimina">🗑️</button>
      </div>
    </div>`;
  }).join('');

  document.getElementById('history-list').innerHTML = html;
}

async function confirmDelete(id) {
  if (confirm('Eliminare questa registrazione?')) {
    await deleteEntry(id);
    showToast('Registrazione eliminata', 'success');
    await renderHistory();
  }
}

// =============================================
// REPORT
// =============================================

async function renderReport() {
  const year  = parseInt(document.getElementById('report-year').value)  || currentYear();
  const month = parseInt(document.getElementById('report-month').value) || currentMonth();
  const entries = await getEntriesByMonth(year, month);
  const processed = entries.map(processEntry);
  const totals = calcMonthlyTotals(processed);

  document.getElementById('report-title').textContent = `${MONTHS_IT[month - 1]} ${year}`;

  const fields = [
    ['Ore Contratto',     formatHours(totals.contractHours)],
    ['Ore Lavorate',      formatHours(totals.workedHours)],
    ['Saldo Ore',        `${totals.balanceHours > 0 ? '+' : ''}${formatHours(totals.balanceHours)}`],
    ['Ticket',            totals.tickets],
    ['Malattia',          formatHours(totals.sickHours)],
    ['Ferie',             formatHours(totals.holidayHours)],
    ['Assenza Recupero',  formatHours(totals.recoveryHours)],
    ['Ore Supplementari', formatHours(totals.supplementaryHours)],
    ['Straordinari Diurni',   formatHours(totals.overtimeDayHours)],
    ['Straordinari Notturni', formatHours(totals.overtimeNightHours)],
    ['Ore Accantonate',   formatHours(totals.accruedHours)],
    ['Giorni Trasferta',  totals.travelDays],
  ];

  document.getElementById('report-grid').innerHTML = fields.map(([label, val]) =>
    `<div class="report-card"><div class="report-label">${label}</div><div class="report-val">${val}</div></div>`
  ).join('');

  if (processed.length > 0) {
    document.getElementById('report-table-body').innerHTML = processed.map(e => {
      const type = getEntryType(e);
      return `<tr class="row-${type || 'empty'}">
        <td>${getDayName(e.date)}</td><td>${formatDateIT(e.date)}</td>
        <td>${e.ticket || 0}</td><td>${e.contractHours || 0}</td>
        <td>${formatHours(e.workedHours)}</td><td>${e.sickHours || 0}</td>
        <td>${e.holidayHours || 0}</td><td>${e.recoveryAbsenceHours || 0}</td>
        <td>${e.supplementaryHours || 0}</td><td>${e.overtimeDayHours || 0}</td>
        <td>${e.overtimeNightHours || 0}</td><td>${e.accruedHours || 0}</td>
        <td>${e.notes || ''}</td>
      </tr>`;
    }).join('');
    document.getElementById('report-table-wrap').style.display = 'block';
  } else {
    document.getElementById('report-table-wrap').style.display = 'none';
  }
}

async function doExportCSV() {
  const year  = parseInt(document.getElementById('report-year').value)  || currentYear();
  const month = parseInt(document.getElementById('report-month').value) || currentMonth();
  const processed = (await getEntriesByMonth(year, month)).map(processEntry);
  exportCSV(processed, year, month, appSettings.employeeName);
  showToast('CSV esportato!', 'success');
}

async function doExportXLSX() {
  const year  = parseInt(document.getElementById('report-year').value)  || currentYear();
  const month = parseInt(document.getElementById('report-month').value) || currentMonth();
  const processed = (await getEntriesByMonth(year, month)).map(processEntry);
  showToast('Generazione XLSX in corso...', 'info');
  try {
    await exportXLSX(processed, year, month, appSettings.employeeName);
    showToast('XLSX esportato!', 'success');
  } catch (e) {
    showToast('Errore generazione XLSX', 'error');
    console.error(e);
  }
}

async function doExportPDF() {
  const year  = parseInt(document.getElementById('report-year').value)  || currentYear();
  const month = parseInt(document.getElementById('report-month').value) || currentMonth();
  const processed = (await getEntriesByMonth(year, month)).map(processEntry);
  showToast('Generazione PDF in corso...', 'info');
  try {
    await exportPDF(processed, year, month, appSettings.employeeName);
    showToast('PDF esportato!', 'success');
  } catch (e) {
    showToast('Errore generazione PDF', 'error');
    console.error(e);
  }
}

// =============================================
// IMPOSTAZIONI
// =============================================

async function loadSettings() {
  document.getElementById('set-name').value      = appSettings.employeeName || '';
  document.getElementById('set-hours').value     = appSettings.defaultContractHours || 7.5;
  document.getElementById('set-hours-fri').value = appSettings.contractHoursFriday || 7;
  document.getElementById('set-break').value     = appSettings.defaultBreakMinutes || 30;
  document.getElementById('set-theme').value     = appSettings.theme || 'grafite';
}

async function loadSnapshots() {
  const snaps = await getSnapshots();
  const el = document.getElementById('snapshot-list');
  if (!el) return;
  if (snaps.length === 0) {
    el.innerHTML = '<div style="color:var(--subtext);font-size:13px;padding:8px 0;">Nessuno snapshot disponibile</div>';
    return;
  }
  el.innerHTML = snaps.map(s =>
    '<div class="snapshot-item">' +
      '<span class="snapshot-date">📅 ' + s.date + ' (' + s.entries + ' giornate)</span>' +
      '<button class="btn-snapshot-restore" onclick="doRestoreSnapshot('' + s.key + '')">Ripristina</button>' +
    '</div>'
  ).join('');
}

async function doRestoreSnapshot(key) {
  if (!confirm('Ripristinare questo snapshot? I dati attuali verranno mantenuti, verranno aggiunti quelli mancanti.')) return;
  try {
    await restoreSnapshot(key);
    showToast('Snapshot ripristinato!', 'success');
    await refreshDashboard();
  } catch(e) {
    showToast('Errore ripristino: ' + e.message, 'error');
  }
}

async function doManualSnapshot() {
  await saveSnapshot();
  showToast('Snapshot salvato!', 'success');
  await loadSnapshots();
}

async function saveSettings() {
  appSettings.employeeName         = document.getElementById('set-name').value.trim();
  appSettings.defaultContractHours = parseFloat(document.getElementById('set-hours').value) || 7.5;
  appSettings.contractHoursFriday  = parseFloat(document.getElementById('set-hours-fri').value) || 7;
  appSettings.defaultBreakMinutes  = parseInt(document.getElementById('set-break').value) || 30;
  appSettings.theme                = document.getElementById('set-theme').value;

  for (const [k, v] of Object.entries(appSettings)) {
    await saveSetting(k, v);
  }
  applyTheme(appSettings.theme);
  showToast('Impostazioni salvate!', 'success');
}

// =============================================
// NAVIGAZIONE
// =============================================

async function navigate(view) {
  showView(view);
  if (view === 'dashboard') await refreshDashboard();
  if (view === 'calendar')  await renderCalendar();
  if (view === 'history')   { historySearch = ''; document.getElementById('history-search').value = ''; await renderHistory(); }
  if (view === 'report')    {
    document.getElementById('report-year').value  = currentYear();
    document.getElementById('report-month').value = currentMonth();
    await renderReport();
  }
  if (view === 'settings')  { await loadSettings(); await loadSnapshots(); }
}

// =============================================
// TOAST
// =============================================

function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast toast-${type} show`;
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// =============================================
// AVVIO
// =============================================

document.addEventListener('DOMContentLoaded', init);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
