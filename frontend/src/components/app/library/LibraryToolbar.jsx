import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

/* ─── Labelled Dropdown ───────────────────────────── */
function LabelledDropdown({ id, groupLabel, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flex: '1 1 180px', minWidth: 155 }}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 1.5,
          width: '100%',
          height: 52,
          padding: '0 36px 0 14px',
          borderRadius: 12,
          background: open || hovered
            ? 'linear-gradient(135deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.035) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.025) 100%)',
          border: open
            ? '1px solid rgba(255,255,255,0.22)'
            : hovered
            ? '1px solid rgba(255,255,255,0.18)'
            : '1px solid rgba(255,255,255,0.11)',
          backdropFilter: 'blur(28px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
          boxShadow: open || hovered
            ? '0 6px 20px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.20)'
            : '0 4px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.12)',
          cursor: 'pointer',
          position: 'relative',
          textAlign: 'left',
          transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
        }}
      >
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.48)', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.03em', textTransform: 'uppercase' }}>
          {groupLabel}
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(255,248,238,0.95)', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
          {selected.label}
        </span>
        {/* Chevron */}
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', right: 12, top: '50%', transform: open ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)', transition: 'transform 0.2s ease' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: '100%', minWidth: 170,
          background: 'rgba(12,7,3,0.96)', backdropFilter: 'blur(32px) saturate(2.0)', WebkitBackdropFilter: 'blur(32px) saturate(2.0)',
          border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, padding: 5,
          zIndex: 200, boxShadow: '0 18px 48px rgba(0,0,0,0.75)',
        }}>
          {options.map((opt) => (
            <button
              key={opt.value} type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                display: 'block', width: '100%', padding: '8px 12px', borderRadius: 8,
                background: opt.value === value ? 'rgba(255,255,255,0.12)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                color: opt.value === value ? '#ffffff' : 'rgba(255,248,238,0.75)',
                fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: opt.value === value ? 700 : 500,
                whiteSpace: 'nowrap', transition: 'background 0.12s, color 0.12s',
              }}
              onMouseEnter={(e) => { if (opt.value !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = opt.value === value ? 'rgba(255,255,255,0.12)' : 'transparent'; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Options ─────────────────────────────────────── */
const DOC_TYPE_OPTS = [
  { value: 'all',     label: 'All Types' },
  { value: 'RECEIPT', label: 'Receipt'   },
  { value: 'INVOICE', label: 'Invoice'   },
];
const STATUS_OPTS = [
  { value: 'all',       label: 'All Status'   },
  { value: 'processed', label: 'Processed'    },
  { value: 'review',    label: 'Needs Review' },
];
const SORT_OPTS = [
  { value: 'newest',      label: 'Newest First'   },
  { value: 'oldest',      label: 'Oldest First'   },
  { value: 'amount_desc', label: 'Amount High→Low' },
  { value: 'amount_asc',  label: 'Amount Low→High' },
];

/* ─── LibraryToolbar ─────────────────────────────── */
export default function LibraryToolbar({
  search, onSearchChange,
  docType, onDocTypeChange,
  statusFilter, onStatusChange,
  sortBy, onSortChange,
  viewMode, onViewModeChange,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 28px 0', width: '100%', boxSizing: 'border-box' }}>

      {/* Search Input - Expands to fill available space gracefully */}
      <div style={{ position: 'relative', flex: '2.5 1 260px', minWidth: 200 }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          id="library-search-input"
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search documents, vendors, invoices..."
          aria-label="Search documents"
          style={{
            width: '100%', height: 52, padding: '0 68px 0 40px',
            borderRadius: 12,
            background: focused
              ? 'linear-gradient(135deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.035) 100%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.025) 100%)',
            border: focused ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.11)',
            backdropFilter: 'blur(28px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
            boxShadow: focused
              ? '0 6px 20px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.20)'
              : '0 4px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.12)',
            color: 'rgba(255,248,238,0.95)', fontSize: 13.5,
            fontFamily: "'Inter', system-ui, sans-serif",
            outline: 'none', caretColor: '#ffffff',
            transition: 'border-color 0.18s, box-shadow 0.18s, background 0.18s',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <kbd style={{ padding: '3px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.45)', fontSize: 11, fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, lineHeight: 1 }}>
            ⌘ K
          </kbd>
        </div>
      </div>

      {/* Document Type Dropdown */}
      <LabelledDropdown id="library-doc-type-filter" groupLabel="Document Type" value={docType} options={DOC_TYPE_OPTS} onChange={onDocTypeChange} />

      {/* Status Dropdown */}
      <LabelledDropdown id="library-status-filter" groupLabel="Status" value={statusFilter} options={STATUS_OPTS} onChange={onStatusChange} />

      {/* Sort by Dropdown */}
      <LabelledDropdown id="library-sort-select" groupLabel="Sort by" value={sortBy} options={SORT_OPTS} onChange={onSortChange} />

      {/* View Mode Toggle — Grid / List */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Grid View Button */}
        <motion.button
          id="library-grid-view-btn"
          type="button"
          aria-label="Grid view"
          onClick={() => onViewModeChange('grid')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: 48, height: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 12,
            background: viewMode === 'grid'
              ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.025) 100%)',
            border: viewMode === 'grid' ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.11)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            cursor: 'pointer',
            boxShadow: viewMode === 'grid'
              ? '0 4px 16px rgba(249,115,22,0.35), inset 0 1px 0 rgba(255,255,255,0.25)'
              : '0 4px 14px rgba(0,0,0,0.20)',
            transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={viewMode === 'grid' ? '#fff' : 'rgba(255,255,255,0.55)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </motion.button>

        {/* List View Button */}
        <motion.button
          id="library-list-view-btn"
          type="button"
          aria-label="List view"
          onClick={() => onViewModeChange('list')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: 48, height: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 12,
            background: viewMode === 'list'
              ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.025) 100%)',
            border: viewMode === 'list' ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.11)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            cursor: 'pointer',
            boxShadow: viewMode === 'list'
              ? '0 4px 16px rgba(249,115,22,0.35), inset 0 1px 0 rgba(255,255,255,0.25)'
              : '0 4px 14px rgba(0,0,0,0.20)',
            transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={viewMode === 'list' ? '#fff' : 'rgba(255,255,255,0.55)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}

