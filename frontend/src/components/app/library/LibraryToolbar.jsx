import { useState, useRef, useEffect } from 'react';

/* ─── Labelled Dropdown ───────────────────────────── */
function LabelledDropdown({ id, groupLabel, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 145 }}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 1,
          width: '100%',
          padding: '8px 36px 8px 12px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.11)',
          cursor: 'pointer',
          position: 'relative',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,0.42)', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.02em' }}>
          {groupLabel}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,248,238,0.92)', fontFamily: "'Inter', system-ui, sans-serif" }}>
          {selected.label}
        </span>
        {/* Chevron */}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.40)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', right: 10, top: '50%', transform: open ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)', transition: 'transform 0.18s ease' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: '100%',
          background: 'rgba(10,6,2,0.94)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
          border: '1px solid rgba(249,115,22,0.18)', borderRadius: 10, padding: 4,
          zIndex: 200, boxShadow: '0 14px 44px rgba(0,0,0,0.60)',
        }}>
          {options.map((opt) => (
            <button
              key={opt.value} type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                display: 'block', width: '100%', padding: '7px 11px', borderRadius: 7,
                background: opt.value === value ? 'rgba(249,115,22,0.14)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                color: opt.value === value ? '#f97316' : 'rgba(255,248,238,0.82)',
                fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: opt.value === value ? 600 : 400,
                whiteSpace: 'nowrap', transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => { if (opt.value !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = opt.value === value ? 'rgba(249,115,22,0.14)' : 'transparent'; }}
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
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, padding: '16px 28px 0', flexWrap: 'wrap' }}>

      {/* Search */}
      <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180, maxWidth: 380 }}>
        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: focused ? '#f97316' : 'rgba(255,240,220,0.38)', transition: 'color 0.18s', display: 'flex', alignItems: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          placeholder="Search documents..."
          aria-label="Search documents"
          style={{
            width: '100%', height: 52, padding: '0 68px 0 36px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.07)',
            border: focused ? '1px solid rgba(249,115,22,0.42)' : '1px solid rgba(255,255,255,0.11)',
            color: 'rgba(255,248,238,0.92)', fontSize: 13,
            fontFamily: "'Inter', system-ui, sans-serif",
            outline: 'none', caretColor: '#f97316',
            transition: 'border-color 0.18s',
          }}
        />
        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <kbd style={{ padding: '2px 5px', borderRadius: 5, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', color: 'rgba(255,255,255,0.32)', fontSize: 10, fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.6 }}>
            ⌘ K
          </kbd>
        </div>
      </div>

      {/* Document Type */}
      <LabelledDropdown id="library-doc-type-filter" groupLabel="Document Type" value={docType} options={DOC_TYPE_OPTS} onChange={onDocTypeChange} />

      {/* Status */}
      <LabelledDropdown id="library-status-filter" groupLabel="Status" value={statusFilter} options={STATUS_OPTS} onChange={onStatusChange} />

      {/* Sort by */}
      <LabelledDropdown id="library-sort-select" groupLabel="Sort by" value={sortBy} options={SORT_OPTS} onChange={onSortChange} />

      <div style={{ flex: 1 }} />

      {/* View toggle — matches reference (filled grid icon = active orange button, list icon beside) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Grid — active state: filled orange button */}
        <button
          id="library-grid-view-btn"
          type="button"
          aria-label="Grid view"
          onClick={() => onViewModeChange('grid')}
          style={{
            width: 44, height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 10,
            background: viewMode === 'grid'
              ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
              : 'rgba(255,255,255,0.07)',
            border: viewMode === 'grid' ? '1px solid rgba(249,115,22,0.60)' : '1px solid rgba(255,255,255,0.11)',
            cursor: 'pointer',
            boxShadow: viewMode === 'grid' ? '0 2px 12px rgba(249,115,22,0.35)' : 'none',
            transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={viewMode === 'grid' ? '#fff' : 'rgba(255,255,255,0.50)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>

        {/* List */}
        <button
          id="library-list-view-btn"
          type="button"
          aria-label="List view"
          onClick={() => onViewModeChange('list')}
          style={{
            width: 44, height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 10,
            background: viewMode === 'list'
              ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
              : 'rgba(255,255,255,0.07)',
            border: viewMode === 'list' ? '1px solid rgba(249,115,22,0.60)' : '1px solid rgba(255,255,255,0.11)',
            cursor: 'pointer',
            boxShadow: viewMode === 'list' ? '0 2px 12px rgba(249,115,22,0.35)' : 'none',
            transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={viewMode === 'list' ? '#fff' : 'rgba(255,255,255,0.50)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
