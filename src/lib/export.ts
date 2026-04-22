// Export utility functions (CSV, PDF, Excel)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function exportCsv(data: Record<string, any>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const v = row[h];
      if (v == null) return '';
      const s = String(v);
      if (s.includes(';') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    }).join(';')
  );
  const csv = [headers.join(';'), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${filename}.csv`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function exportExcel(data: Record<string, any>[], filename: string, sheetName = 'Données') {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `${filename}.xlsx`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function exportPdf(
  title: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[],
  columns: { header: string; key: string }[],
  filename: string,
  subtitle?: string,
) {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header
  doc.setFillColor(13, 17, 23);
  doc.rect(0, 0, 297, 30, 'F');
  doc.setTextColor(230, 237, 243);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ClinoCaisse Dashboard', 14, 12);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 20);
  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(139, 148, 158);
    doc.text(subtitle, 14, 27);
  }
  doc.setTextColor(139, 148, 158);
  doc.setFontSize(9);
  doc.text(`Exporté le ${new Date().toLocaleString('fr-FR')}`, 200, 20);

  // Table
  autoTable(doc, {
    startY: 36,
    head: [columns.map(c => c.header)],
    body: data.map(row => columns.map(c => {
      const v = row[c.key];
      return v == null ? '' : String(v);
    })),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [22, 27, 34] },
    bodyStyles: { fillColor: [13, 17, 23], textColor: [230, 237, 243] },
    tableLineColor: [48, 54, 61],
    tableLineWidth: 0.1,
  });

  doc.save(`${filename}.pdf`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
