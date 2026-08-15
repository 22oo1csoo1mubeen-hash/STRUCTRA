import { motion } from 'framer-motion';

/**
 * LibraryPagination
 * "Showing X to Y of Z documents" + numbered page buttons + "N per page" selector.
 * Matches DocumentLibrary-reference.png exactly.
 */
export default function LibraryPagination({
  page, pageSize, total, hasNext, onPageChange, onPageSizeChange,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from       = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to         = Math.min(page * pageSize, total);

  // Build page number array with ellipsis
  const pageNums = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      pageNums.push(p);
    } else if (pageNums[pageNums.length - 1] !== '…') {
      pageNums.push('…');
    }
  }

  const navBtn = (disabled) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 8,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.10)',
    color: disabled ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.60)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
  });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28 }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px 40px', gap: 12, flexWrap: 'wrap' }}
    >
      {/* Showing X to Y of Z */}
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontFamily: "'Inter', system-ui, sans-serif", flexShrink: 0 }}>
        Showing {from} to {to} of {total} document{total !== 1 ? 's' : ''}
      </span>

      {/* Page buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {/* Prev */}
        <button id="library-prev-page-btn" type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)} style={navBtn(page <= 1)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>

        {/* Page numbers */}
        {pageNums.map((p, i) =>
          p === '…' ? (
            <span key={`el-${i}`} style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, padding: '0 4px' }}>…</span>
          ) : (
            <button
              key={p}
              id={`library-page-btn-${p}`}
              type="button"
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPageChange(p)}
              style={{
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8,
                background: p === page ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'rgba(255,255,255,0.06)',
                border: p === page ? '1px solid rgba(249,115,22,0.50)' : '1px solid rgba(255,255,255,0.10)',
                color: p === page ? '#ffffff' : 'rgba(255,255,255,0.58)',
                fontSize: 13, fontWeight: p === page ? 700 : 500, fontFamily: "'Inter', system-ui, sans-serif",
                cursor: 'pointer',
                boxShadow: p === page ? '0 2px 10px rgba(249,115,22,0.38)' : 'none',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >{p}</button>
          )
        )}

        {/* Next */}
        <button id="library-next-page-btn" type="button" aria-label="Next page" disabled={!hasNext} onClick={() => onPageChange(page + 1)} style={navBtn(!hasNext)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {/* Per page selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <select
          id="library-page-size-select"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', color: 'rgba(255,248,238,0.86)', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif", cursor: 'pointer', outline: 'none' }}
        >
          {[6, 9, 12, 18].map((n) => (
            <option key={n} value={n} style={{ background: '#0e0704' }}>{n} per page</option>
          ))}
        </select>
      </div>
    </motion.div>
  );
}
