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
    'Straordinario Diurno','Straordinario Notturno','Accantonate','Note'
  ].join(';');

  const rows = entries.map(function(e) {
    return [
      getDayName(e.date),
      formatDateIT(e.date),
      calcTicketCorretto(e),
      fmtOre(e.contractHours),
      fmtOre(e.workedHours),
      arrotondaQuarto(e.workedHours),
      e.sickHours            ? '-' + fmtOre(e.sickHours)            : '',
      e.holidayHours         ? '-' + fmtOre(e.holidayHours)         : '',
      e.recoveryAbsenceHours ? '-' + fmtOre(e.recoveryAbsenceHours) : '',
      fmtOre(e.supplementaryHours),
      fmtOre(e.overtimeDayHours),
      fmtOre(e.overtimeNightHours),
      fmtOre(e.accruedHours),
      (e.notes || '').split(';').join(',')
    ].join(';');
  });

  const totals = calcMonthlyTotals(entries);
  const totRow = [
    'TOTALE','',
    entries.reduce(function(s,e){ return s + calcTicketCorretto(e); }, 0),
    fmtOre(totals.contractHours), fmtOre(totals.workedHours), '',
    totals.sickHours     ? '-' + fmtOre(totals.sickHours)     : '',
    totals.holidayHours  ? '-' + fmtOre(totals.holidayHours)  : '',
    totals.recoveryHours ? '-' + fmtOre(totals.recoveryHours) : '',
    fmtOre(totals.supplementaryHours),
    fmtOre(totals.overtimeDayHours),
    fmtOre(totals.overtimeNightHours),
    fmtOre(totals.accruedHours), ''
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

  const FMT_ORE = '[h]:mm';

  // Converte ore decimali in valore Excel (ore/24) sommabile
  function excelOre(n) {
    if (!n || n === 0) return null;
    return n / 24;
  }

  function excelOreNeg(n) {
    if (!n || n === 0) return null;
    return -(n / 24);
  }

  function excelArrotonda(n) {
    if (!n || n === 0) return null;
    const h = Math.floor(n);
    const minTot = Math.round((n - h) * 60);
    let minArr, hArr;
    if (minTot < 8)       { minArr = 0;  hArr = h; }
    else if (minTot < 23) { minArr = 15; hArr = h; }
    else if (minTot < 38) { minArr = 30; hArr = h; }
    else if (minTot < 53) { minArr = 45; hArr = h; }
    else                  { minArr = 0;  hArr = h + 1; }
    return (hArr + minArr / 60) / 24;
  }

  const headers = [
    'Giorno','Data','Ticket','Ore Contratto','Ore Lavorate','Ore Arrotondate',
    'Malattia','Ferie','Assenza Recupero','Supplementari',
    'Straordinario Diurno','Straordinario Notturno','Accantonate','Note'
  ];

  // Costruiamo il foglio manualmente come XML per supportare stili
  const numCols = headers.length;
  const colLetters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N'];

  const wsData = [headers];

  entries.forEach(function(e) {
    wsData.push([
      getDayName(e.date),
      formatDateIT(e.date),
      calcTicketCorretto(e),         // sempre 0 o 1
      excelOre(e.contractHours),
      excelOre(e.workedHours),
      excelArrotonda(e.workedHours),
      excelOreNeg(e.sickHours),
      excelOreNeg(e.holidayHours),
      excelOreNeg(e.recoveryAbsenceHours),
      excelOre(e.supplementaryHours),
      excelOre(e.overtimeDayHours),
      excelOre(e.overtimeNightHours),
      excelOre(e.accruedHours),
      (e.notes || '').split('\n').join(' ')
    ]);
  });

  const lastData = entries.length + 1;
  const totals = calcMonthlyTotals(entries);
  wsData.push([
    'TOTALE', '',
    entries.reduce(function(s,e){ return s + calcTicketCorretto(e); }, 0),
    excelOre(totals.contractHours),
    excelOre(totals.workedHours),
    null,
    excelOreNeg(totals.sickHours),
    excelOreNeg(totals.holidayHours),
    excelOreNeg(totals.recoveryHours),
    excelOre(totals.supplementaryHours),
    excelOre(totals.overtimeDayHours),
    excelOre(totals.overtimeNightHours),
    excelOre(totals.accruedHours),
    ''
  ]);

  const wb = window.XLSX.utils.book_new();
  const ws = window.XLSX.utils.aoa_to_sheet(wsData);

  // Applica formato ore a tutte le colonne ore (D-M tranne N testo)
  const oreColumns = ['D','E','F','G','H','I','J','K','L','M'];
  const totalRows = entries.length + 2;

  for (let r = 2; r <= totalRows; r++) {
    oreColumns.forEach(function(col) {
      const ref = col + r;
      if (ws[ref] && ws[ref].v !== null && ws[ref].v !== undefined) {
        ws[ref].z = FMT_ORE;
        ws[ref].t = 'n';
      }
    });
    // Ticket: mostra sempre il valore (anche 0)
    const ticketRef = 'C' + r;
    if (ws[ticketRef]) ws[ticketRef].t = 'n';
  }

  // Larghezze colonne
  ws['!cols'] = [
    {wch:7},{wch:11},{wch:7},{wch:10},{wch:10},{wch:10},
    {wch:9},{wch:8},{wch:10},{wch:11},
    {wch:11},{wch:11},{wch:10},{wch:30}
  ];

  // Altezza riga intestazione
  ws['!rows'] = [{ hpt: 45 }];

  window.XLSX.utils.book_append_sheet(wb, ws, MONTHS_IT[month-1] + ' ' + year);

  // Scriviamo come xlsx e poi aggiungiamo stili via post-processing
  const wbout = window.XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

  // Converti in blob e scarica
  function s2ab(s) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
  }

  const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'presenze_' + employeeName.split(' ').join('_') + '_' + MONTHS_IT[month-1] + '_' + year + '.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

// ---- PDF ----
async function exportPDF(entries, year, month, employeeName) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    await new Promise(function(resolve, reject) {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const PAGE_W = 297, PAGE_H = 210, ML = 8, COL_W = PAGE_W - ML * 2;

  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, PAGE_W, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PRESENZE MUNAF', PAGE_W / 2, 10, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Dipendente: ' + employeeName + '    Mese: ' + MONTHS_IT[month-1] + ' ' + year, PAGE_W / 2, 17, { align: 'center' });

  const cols = [
    { label: 'Giorno', w: 11 }, { label: 'Data', w: 16 },
    { label: 'Ticket', w: 10 }, { label: 'Contr.', w: 12 },
    { label: 'Lavorate', w: 13 }, { label: 'Arrot.', w: 12 },
    { label: 'Malattia', w: 13 }, { label: 'Ferie', w: 11 },
    { label: 'Recupero', w: 13 }, { label: 'Suppl.', w: 11 },
    { label: 'Str.D', w: 12 }, { label: 'Str.N', w: 12 },
    { label: 'Accant.', w: 12 },
    { label: 'Note', w: 33 }, { label: 'Firma', w: 28 }
  ];

  let y = 28;
  const ROW_H = 7, HEADER_H = 8;

  doc.setFillColor(30, 58, 95);
  doc.rect(ML, y, COL_W, HEADER_H, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  let x = ML;
  cols.forEach(function(c) { doc.text(c.label, x + c.w / 2, y + 5.5, { align: 'center' }); x += c.w; });
  y += HEADER_H;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  let rowIdx = 0;

  for (const e of entries) {
    const isWeekend = ['Sab','Dom'].includes(getDayName(e.date));
    if (isWeekend) doc.setFillColor(220, 225, 235);
    else if (rowIdx % 2 === 0) doc.setFillColor(245, 247, 252);
    else doc.setFillColor(255, 255, 255);
    doc.rect(ML, y, COL_W, ROW_H, 'F');

    doc.setTextColor(40, 40, 60);
    x = ML;

    const vals = [
      getDayName(e.date), formatDateIT(e.date),
      calcTicketCorretto(e),
      fmtOre(e.contractHours), fmtOre(e.workedHours),
      arrotondaQuarto(e.workedHours),
      e.sickHours            ? '-' + fmtOre(e.sickHours)            : '',
      e.holidayHours         ? '-' + fmtOre(e.holidayHours)         : '',
      e.recoveryAbsenceHours ? '-' + fmtOre(e.recoveryAbsenceHours) : '',
      fmtOre(e.supplementaryHours), fmtOre(e.overtimeDayHours),
      fmtOre(e.overtimeNightHours), fmtOre(e.accruedHours),
      (e.notes || '').substring(0, 28), ''
    ];

    vals.forEach(function(v, i) {
      const str = String(v === 0 ? '0' : (v || ''));
      if (str) doc.text(str, x + cols[i].w / 2, y + 4.8, { align: 'center' });
      x += cols[i].w;
    });

    doc.setDrawColor(200, 205, 220);
    doc.rect(ML, y, COL_W, ROW_H, 'S');
    y += ROW_H;
    rowIdx++;
    if (y > PAGE_H - 20) { doc.addPage(); y = 15; }
  }

  const totals = calcMonthlyTotals(entries);

  doc.setFillColor(30, 58, 95);
  doc.rect(ML, y, COL_W, ROW_H + 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  x = ML;
  const totVals = [
    'TOT', '',
    entries.reduce(function(s,e){ return s + calcTicketCorretto(e); }, 0),
    fmtOre(totals.contractHours), fmtOre(totals.workedHours), '',
    totals.sickHours     ? '-' + fmtOre(totals.sickHours)     : '',
    totals.holidayHours  ? '-' + fmtOre(totals.holidayHours)  : '',
    totals.recoveryHours ? '-' + fmtOre(totals.recoveryHours) : '',
    fmtOre(totals.supplementaryHours),
    fmtOre(totals.overtimeDayHours),
    fmtOre(totals.overtimeNightHours),
    fmtOre(totals.accruedHours),
    '', ''
  ];
  totVals.forEach(function(v, i) {
    const str = String(v === 0 ? '0' : (v || ''));
    if (str) doc.text(str, x + cols[i].w / 2, y + 5.5, { align: 'center' });
    x += cols[i].w;
  });

  y += ROW_H + 1 + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 140);
  doc.text('Generato il ' + formatDateIT(todayStr()) + ' | PRESENZE MUNAF', PAGE_W / 2, y, { align: 'center' });

  doc.save('presenze_' + employeeName.split(' ').join('_') + '_' + MONTHS_IT[month-1] + '_' + year + '.pdf');
}
