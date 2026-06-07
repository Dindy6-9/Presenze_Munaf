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
  return `${sign}${h}:${String(m).padStart(2,'0')}`;
}

function oreToExcel(n) {
  // Converte ore decimali in numero Excel (ore/24) per permettere somme
  if (!n || n === 0) return 0;
  return n / 24;
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
  return `${hArr}:${String(minArr).padStart(2,'0')}`;
}

// ---- CSV ----
function exportCSV(entries, year, month, employeeName) {
  const header = [
    'Giorno','Data','Ticket','Ore Contratto','Ore Lavorate','Ore Arrotondate',
    'Malattia','Ferie','Assenza Recupero','Supplementari',
    'Straordinario Diurno','Straordinario Notturno','Accantonate',
    'Saldo Giornaliero','Trasferta','Note'
  ].join(';');

  const rows = entries.map(e => {
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
      (e.notes || '').replace(/;/g, ',').replace(/\n/g, ' ')
    ].join(';');
  });

  const totals = calcMonthlyTotals(entries);
  const totBal = totals.balanceHours;
  const totBalStr = totBal === 0 ? '0:00' : (totBal > 0 ? '+' : '') + fmtOre(totBal);
  const totRow = [
    'TOTALE','',
    entries.reduce((s, e) => s + calcTicketCorretto(e), 0),
    fmtOre(totals.contractHours), fmtOre(totals.workedHours), '',
    fmtOre(totals.sickHours), fmtOre(totals.holidayHours),
    fmtOre(totals.recoveryHours), fmtOre(totals.supplementaryHours),
    fmtOre(totals.overtimeDayHours), fmtOre(totals.overtimeNightHours),
    fmtOre(totals.accruedHours), totBalStr, '', ''
  ].join(';');

  const csv = '\uFEFF' + [header, ...rows, totRow].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `presenze_${employeeName.replace(/\s/g,'_')}_${MONTHS_IT[month-1]}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- XLSX ----
async function exportXLSX(entries, year, month, employeeName) {
  if (!window.XLSX) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const wb = window.XLSX.utils.book_new();
  const FMT_ORE = '[h]:mm'; // formato Excel per ore sommabili

  // Funzione cella ora numerica
  function cOra(n) {
    if (!n || n === 0) return { v: 0, t: 'n', z: FMT_ORE };
    return { v: n / 24, t: 'n', z: FMT_ORE };
  }

  // Ore arrotondate al quarto d'ora come numero Excel
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

  entries.forEach(e => {
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
      cOra(e.overtimeDayHours),
      cOra(e.overtimeNightHours),
      cOra(e.accruedHours),
      { v: bal / 24, t: 'n', z: FMT_ORE },
      e.travel ? 'Si' : '',
      (e.notes || '').split('\n').join(' ')
    ]);
  });

  // Riga totali con formula SOMMA
  const lastDataRow = entries.length + 1;
  const totals = calcMonthlyTotals(entries);
  wsData.push([
    'TOTALE','',
    entries.reduce((s, e) => s + calcTicketCorretto(e), 0),
    { f: `SUM(D2:D${lastDataRow})`, t: 'n', z: FMT_ORE },
    { f: `SUM(E2:E${lastDataRow})`, t: 'n', z: FMT_ORE },
    { f: `SUM(F2:F${lastDataRow})`, t: 'n', z: FMT_ORE },
    { f: `SUM(G2:G${lastDataRow})`, t: 'n', z: FMT_ORE },
    { f: `SUM(H2:H${lastDataRow})`, t: 'n', z: FMT_ORE },
    { f: `SUM(I2:I${lastDataRow})`, t: 'n', z: FMT_ORE },
    { f: `SUM(J2:J${lastDataRow})`, t: 'n', z: FMT_ORE },
    { f: `SUM(K2:K${lastDataRow})`, t: 'n', z: FMT_ORE },
    { f: `SUM(L2:L${lastDataRow})`, t: 'n', z: FMT_ORE },
    { f: `SUM(M2:M${lastDataRow})`, t: 'n', z: FMT_ORE },
    { f: `SUM(N2:N${lastDataRow})`, t: 'n', z: FMT_ORE },
    '', ''
  ]);

  const ws = window.XLSX.utils.aoa_to_sheet(wsData);

  // Intestazioni ruotate (altezza riga 1 maggiore)
  ws['!rows'] = [{ hpt: 80 }];

  // Larghezze colonne
  ws['!cols'] = [
    {wch:8},{wch:11},{wch:7},{wch:12},{wch:12},{wch:12},
    {wch:10},{wch:9},{wch:12},{wch:12},
    {wch:13},{wch:13},{wch:11},{wch:11},{wch:8},{wch:30}
  ];

  window.XLSX.utils.book_append_sheet(wb, ws, `${MONTHS_IT[month-1]} ${year}`);
  window.XLSX.writeFile(wb, `presenze_${employeeName.replace(/\s/g,'_')}_${MONTHS_IT[month-1]}_${year}.xlsx`);
}

// ---- PDF ----
async function exportPDF(entries, year, month, employeeName) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    await new Promise((resolve, reject) => {
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
  doc.text(`Dipendente: ${employeeName}    Mese: ${MONTHS_IT[month-1]} ${year}`, PAGE_W / 2, 17, { align: 'center' });

  const cols = [
    { label: 'Giorno',    w: 11 }, { label: 'Data',      w: 16 },
    { label: 'Ticket',    w: 10 }, { label: 'Contr.',    w: 12 },
    { label: 'Lavorate',  w: 13 }, { label: 'Arrot.',    w: 12 },
    { label: 'Malattia',  w: 13 }, { label: 'Ferie',     w: 11 },
    { label: 'Recupero',  w: 13 }, { label: 'Suppl.',    w: 11 },
    { label: 'Str.D',     w: 12 }, { label: 'Str.N',     w: 12 },
    { label: 'Accant.',   w: 12 }, { label: 'Saldo',     w: 12 },
    { label: 'Note',      w: 30 }, { label: 'Firma',     w: 28 }
  ];

  let y = 28;
  const ROW_H = 7, HEADER_H = 8;

  doc.setFillColor(30, 58, 95);
  doc.rect(ML, y, COL_W, HEADER_H, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  let x = ML;
  cols.forEach(c => { doc.text(c.label, x + c.w / 2, y + 5.5, { align: 'center' }); x += c.w; });
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
    const bal = calcDailyBalance(e);
    const balStr = bal === 0 ? '' : (bal > 0 ? '+' : '') + fmtOre(bal);

    const vals = [
      getDayName(e.date), formatDateIT(e.date),
      calcTicketCorretto(e) || '',
      fmtOre(e.contractHours), fmtOre(e.workedHours),
      arrotondaQuarto(e.workedHours),
      fmtOre(e.sickHours), fmtOre(e.holidayHours), fmtOre(e.recoveryAbsenceHours),
      fmtOre(e.supplementaryHours), fmtOre(e.overtimeDayHours),
      fmtOre(e.overtimeNightHours), fmtOre(e.accruedHours),
      balStr, (e.notes || '').substring(0, 25), ''
    ];

    vals.forEach((v, i) => {
      const str = String(v || '');
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
  const totBal = totals.balanceHours;
  const totBalStr = (totBal > 0 ? '+' : '') + fmtOre(totBal);

  doc.setFillColor(30, 58, 95);
  doc.rect(ML, y, COL_W, ROW_H + 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  x = ML;
  const totVals = [
    'TOT', '',
    entries.reduce((s, e) => s + calcTicketCorretto(e), 0),
    fmtOre(totals.contractHours), fmtOre(totals.workedHours), '',
    fmtOre(totals.sickHours), fmtOre(totals.holidayHours),
    fmtOre(totals.recoveryHours), fmtOre(totals.supplementaryHours),
    fmtOre(totals.overtimeDayHours), fmtOre(totals.overtimeNightHours),
    fmtOre(totals.accruedHours), totBalStr, '', ''
  ];
  totVals.forEach((v, i) => {
    const str = String(v || '');
    if (str) doc.text(str, x + cols[i].w / 2, y + 5.5, { align: 'center' });
    x += cols[i].w;
  });

  y += ROW_H + 1 + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 140);
  doc.text(`Generato il ${formatDateIT(todayStr())} | PRESENZE MUNAF`, PAGE_W / 2, y, { align: 'center' });

  doc.save(`presenze_${employeeName.replace(/\s/g,'_')}_${MONTHS_IT[month-1]}_${year}.pdf`);
}
