'use client';
import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';

interface ExportMenuProps {
  onExportCsv: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  label?: string;
}

export default function ExportMenu({ onExportCsv, onExportPdf, onExportExcel, label = 'Exporter' }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="export-menu" ref={ref}>
      <button className="btn btn-secondary btn-sm" onClick={() => setOpen(o => !o)} id="btn-export-menu">
        <Download size={14} /> {label}
      </button>
      {open && (
        <div className="export-dropdown">
          <button className="export-item" id="btn-export-csv" onClick={() => { setOpen(false); onExportCsv(); }}>
            <File size={14} /> Exporter CSV
          </button>
          <button className="export-item" id="btn-export-pdf" onClick={() => { setOpen(false); onExportPdf(); }}>
            <FileText size={14} /> Exporter PDF
          </button>
          <button className="export-item" id="btn-export-excel" onClick={() => { setOpen(false); onExportExcel(); }}>
            <FileSpreadsheet size={14} /> Exporter Excel
          </button>
        </div>
      )}
    </div>
  );
}
