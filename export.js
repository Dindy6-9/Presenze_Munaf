// =============================================
// EXPORT.JS - CSV e PDF
// =============================================

function fmtNum(n) {
  if (!n || n === 0) return '';
  return String(n).replace('.', ',');
}

function exportCSV(entries, year, month, employeeName) {
  const header = [
    'Giorno','Data','Ticket','Ore Contratto','Ore Lavorate',
    'Malattia','Ferie','Assenza Recupero','Supplementari',
    'Straordinario Diurno','Straordinario Notturno','Accantonate',
    'Saldo Giornaliero','Trasferta','Note'
  ].join(';');

  const rows = entries.map(e => {
    const bal = calcDailyBalance(e);
    const balStr = bal === 0 ? '' : (bal > 0 ? '+' : '') + fmtNum(bal);
    return [
      getDayName(e.date),
      formatDateIT(e.date),
      e.ticket || 0,
      fmtNum(e.contractHours),
      fmtNum(e.workedHours),
      fmtNum(e.sickHours),
      fmtNum(e.holidayHours),
      fmtNum(e.recoveryAbsenceHours),
      fmtNum(e.supplementaryHours),
      fmtNum(e.overtimeDayHours),
      fmtNum(e.overtimeNightHours),
      fmtNum(e.accruedHours),
      balStr,
      e.travel ? 'Sì' : '',
      (e.notes || '').replace(/;/g, ',').replace(/\n/g, ' ')
    ].join(';');
  });

  const totals = calcMonthlyTotals(entries);
  const totBal = totals.balanceHours;
  const totBalStr = totBal === 0 ? '0' : (totBal > 0 ? '+' : '') + fmtNum(totBal);
  const totRow = [
    'TOTALE','',totals.tickets,
    fmtNum(totals.contractHours),fmtNum(totals.workedHours),
    fmtNum(totals.sickHours),fmtNum(totals.holidayHours),
    fmtNum(totals.recoveryHours),fmtNum(totals.supplementaryHours),
    fmtNum(totals.overtimeDayHours),fmtNum(totals.overtimeNightHours),
    fmtNum(totals.accruedHours),totBalStr,totals.travelDays || '',''
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
    { label: 'Giorno', w: 12 }, { label: 'Data', w: 18 },
    { label: 'Ticket', w: 12 }, { label: 'Contr.', w: 12 },
    { label: 'Lavorate', w: 14 }, { label: 'Malattia', w: 14 },
    { label: 'Ferie', w: 12 }, { label: 'Recupero', w: 14 },
    { label: 'Suppl.', w: 12 }, { label: 'Str.Diurno', w: 16 },
    { label: 'Str.Nott.', w: 14 }, { label: 'Accant.', w: 13 },
    { label: 'Saldo', w: 13 }, { label: 'Note', w: 36 },
    { label: 'Firma', w: 34 }
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
    const balStr = bal === 0 ? '' : (bal > 0 ? '+' : '') + bal;

    const vals = [
      getDayName(e.date), formatDateIT(e.date),
      e.ticket || '', e.contractHours || '', e.workedHours || '',
      e.sickHours || '', e.holidayHours || '', e.recoveryAbsenceHours || '',
      e.supplementaryHours || '', e.overtimeDayHours || '',
      e.overtimeNightHours || '', e.accruedHours || '',
      balStr, (e.notes || '').substring(0, 28), ''
    ];

    vals.forEach((v, i) => {
      const str = v === 0 ? '' : String(v);
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
  const totBalStr = totBal === 0 ? '0' : (totBal > 0 ? '+' : '') + totBal;

  doc.setFillColor(30, 58, 95);
  doc.rect(ML, y, COL_W, ROW_H + 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  x = ML;
  const totVals = [
    'TOT', '', totals.tickets, totals.contractHours, totals.workedHours,
    totals.sickHours || '', totals.holidayHours || '', totals.recoveryHours || '',
    totals.supplementaryHours || '', totals.overtimeDayHours || '',
    totals.overtimeNightHours || '', totals.accruedHours || '',
    totBalStr, '', ''
  ];
  totVals.forEach((v, i) => {
    const str = v === 0 ? '' : String(v);
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
