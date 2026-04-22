'use client';
import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { getDateRange, DateRange } from '@/lib/utils';

type DateMode = 'today' | 'week' | 'month' | 'custom';

interface DateRangePickerProps {
  mode: DateMode;
  customRange: DateRange;
  onChange: (mode: DateMode, range: DateRange) => void;
}

const MODES: { key: DateMode; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week', label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: 'custom', label: 'Personnalisé' },
];

export default function DateRangePicker({ mode, customRange, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [tmpFrom, setTmpFrom] = useState(customRange.from);
  const [tmpTo, setTmpTo] = useState(customRange.to);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleModeClick(m: DateMode) {
    if (m !== 'custom') {
      const range = getDateRange(m);
      onChange(m, range);
      setOpen(false);
    } else {
      setOpen(true);
    }
  }

  function applyCustom() {
    if (tmpFrom && tmpTo) {
      onChange('custom', { from: tmpFrom, to: tmpTo });
      setOpen(false);
    }
  }

  const activeLabel = MODES.find(m => m.key === mode)?.label || 'Période';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Mode buttons */}
      <div className="filter-group">
        {MODES.filter(m => m.key !== 'custom').map(m => (
          <button
            key={m.key}
            className={`filter-btn ${mode === m.key ? 'active' : ''}`}
            onClick={() => handleModeClick(m.key)}
            id={`filter-${m.key}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Custom picker */}
      <div className="date-range-wrapper" ref={ref}>
        <button
          className={`btn btn-sm btn-secondary ${mode === 'custom' ? 'btn-primary' : ''}`}
          onClick={() => setOpen(o => !o)}
          id="filter-custom"
          style={mode === 'custom' ? { background: 'var(--accent-violet-dim)', color: 'var(--accent-violet-light)', border: '1px solid rgba(124,58,237,0.3)' } : {}}
        >
          <Calendar size={13} />
          {mode === 'custom' ? `${customRange.from} → ${customRange.to}` : 'Personnalisé'}
          <ChevronDown size={12} />
        </button>

        {open && (
          <div className="date-range-dropdown">
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>Sélectionner une plage de dates</p>
            <div className="date-range-row">
              <div>
                <label className="form-label">Du</label>
                <input
                  id="date-from"
                  type="date"
                  className="form-input"
                  value={tmpFrom}
                  onChange={e => setTmpFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Au</label>
                <input
                  id="date-to"
                  type="date"
                  className="form-input"
                  value={tmpTo}
                  onChange={e => setTmpTo(e.target.value)}
                />
              </div>
            </div>
            <button
              id="btn-apply-date"
              className="btn btn-primary btn-sm btn-full"
              onClick={applyCustom}
              disabled={!tmpFrom || !tmpTo}
            >
              Appliquer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
