// =============================================
// EXPORT.JS - CSV, PDF, XLSX
// =============================================

function calcTicketCorretto(e) {
  if (e.smartWorking || e.festivoFlag || e.travel) return 0;
  return (e.workedHours || 0) >= 6 ? 1 : 0;
}

function fmtOre(n) {
  if (!n || n === 0) return '';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return sign + h + ':' + String(m).padStart(2,'0');
}

function arrotondaQuarto(workedHours) {
  if (!workedHours || workedHours === 0) return '';
  const h = Math.floor(workedHours);
  const minTot = Math.round((workedHours - h) * 60);
  let minArr, hArr;
  if (minTot < 8)       { minArr = 0;  hArr = h; }
  else if (minTot < 23) { minArr = 15; hArr = h; }
  else if (minTot < 38) { minArr = 30; hArr = h; }
  else if (minTot < 53) { minArr = 45; hArr = h; }
  else                  { minArr = 0;  hArr = h + 1; }
  return hArr + ':' + String(minArr).padStart(2,'0');
}

// ---- CSV ----
function exportCSV(entries, year, month, employeeName) {
  const header = [
    'Giorno','Data','Ticket','Ore Contratto','Ore Lavorate','Ore Arrotondate',
    'Malattia','Ferie','Assenza Recupero','Supplementari',
    'Straordinario Diurno','Straordinario Notturno','Accantonate',
    'Saldo Giornaliero','Trasferta','Note'
  ].join(';');

  const rows = entries.map(function(e) {
    const bal = calcDailyBalance(e);
    const balStr = bal === 0 ? '' : (bal > 0 ? '+' : '') + fmtOre(bal);
    return [
      getDayName(e.date),
      formatDateIT(e.date),
      calcTicketCorretto(e),
      fmtOre(e.contractHours),
      fmtOre(e.workedHours),
      arrotondaQuarto(e.workedHours),
      fmtOre(e.sickHours),
      fmtOre(e.holidayHours),
      fmtOre(e.recoveryAbsenceHours),
      fmtOre(e.supplementaryHours),
      fmtOre(e.overtimeDayHours),
      fmtOre(e.overtimeNightHours),
      fmtOre(e.accruedHours),
      balStr,
      e.travel ? 'Si' : '',
      (e.notes || '').split(';').join(',')
    ].join(';');
  });

  const totals = calcMonthlyTotals(entries);
  const totBal = totals.balanceHours;
  const totBalStr = totBal === 0 ? '0:00' : (totBal > 0 ? '+' : '') + fmtOre(totBal);
  const totRow = [
    'TOTALE','',
    entries.reduce(function(s,e){ return s + calcTicketCorretto(e); }, 0),
    fmtOre(totals.contractHours), fmtOre(totals.workedHours), '',
    fmtOre(totals.sickHours), fmtOre(totals.holidayHours),
    fmtOre(totals.recoveryHours), fmtOre(totals.supplementaryHours),
    fmtOre(totals.overtimeDayHours), fmtOre(totals.overtimeNightHours),
    fmtOre(totals.accruedHours), totBalStr, '', ''
  ].join(';');

  const csv = '\uFEFF' + [header].concat(rows).concat([totRow]).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'presenze_' + employeeName.split(' ').join('_') + '_' + MONTHS_IT[month-1] + '_' + year + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ---- XLSX ----
async function exportXLSX(entries, year, month, employeeName) {
  if (!window.XLSX) {
    await new Promise(function(resolve, reject) {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const wb = window.XLSX.utils.book_new();
  const FMT_ORE = '[h]:mm';

  function cOra(n) {
    if (!n || n === 0) return { v: 0, t: 'n', z: FMT_ORE };
    return { v: n / 24, t: 'n', z: FMT_ORE };
  }

  function cOraArr(n) {
    if (!n || n === 0) return { v: 0, t: 'n', z: FMT_ORE };
    const h = Math.floor(n);
    const minTot = Math.round((n - h) * 60);
    let minArr, hArr;
    if (minTot < 8)       { minArr = 0;  hArr = h; }
    else if (minTot < 23) { minArr = 15; hArr = h; }
    else if (minTot < 38) { minArr = 30; hArr = h; }
    else if (minTot < 53) { minArr = 45; hArr = h; }
    else                  { minArr = 0;  hArr = h + 1; }
    return { v: (hArr + minArr/60) / 24, t: 'n', z: FMT_ORE };
  }

  const headers = [
    'Giorno','Data','Ticket','Ore Contratto','Ore Lavorate','Ore Arrotondate',
    'Malattia','Ferie','Assenza Recupero','Supplementari',
    'Straordinario Diurno','Straordinario Notturno','Accantonate',
    'Saldo Giornaliero','Trasferta','Note'
  ];

  const wsData = [headers];

  entries.forEach(function(e) {
    const bal = calcDailyBalance(e);
    wsData.push([
      getDayName(e.date),
      formatDateIT(e.date),
      calcTicketCorretto(e),
      cOra(e.contractHours),
      cOra(e.workedHours),
      cOraArr(e.workedHours),
      cOra(e.sickHours),
      cOra(e.holidayHours),
      cOra(e.recoveryAbsenceHours),
      cOra(e.supplementaryHours),
      cOra(e.overtimeDayH
