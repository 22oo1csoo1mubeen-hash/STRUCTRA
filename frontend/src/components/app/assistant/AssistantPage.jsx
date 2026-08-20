import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAssistant } from '../../../context/AssistantContext';

/* ─────────────────────────────────────────────────────────────────
   Icons
───────────────────────────────────────────────────────────────── */

function SparkleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#f97316">
      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
    </svg>
  );
}

function TrendIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function VendorIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ReceiptIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

function StarIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function RobotIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <rect x="16" y="22" width="32" height="28" rx="6" fill="rgba(249,115,22,0.12)" stroke="#f97316" strokeWidth="1.5" />
      <circle cx="25" cy="35" r="3.5" fill="#f97316" opacity="0.85" />
      <circle cx="39" cy="35" r="3.5" fill="#f97316" opacity="0.85" />
      <path d="M26 44 Q32 48 38 44" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <rect x="28" y="14" width="8" height="8" rx="2" fill="rgba(249,115,22,0.25)" stroke="#f97316" strokeWidth="1.5" />
      <line x1="10" y1="30" x2="16" y2="30" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      <line x1="48" y1="30" x2="54" y2="30" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.40)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 22h4M12 2a7 7 0 00-7 7c0 2.5 1.3 4.7 3.3 6L9 17h6l.7-2c2-1.3 3.3-3.5 3.3-6a7 7 0 00-7-7z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function ThumbUpIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
      <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
    </svg>
  );
}

function ThumbDownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
      <path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" />
    </svg>
  );
}

function ExternalDocIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function TrashIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Currency Formatter
───────────────────────────────────────────────────────────────── */
function formatCurrency(val) {
  if (val === null || val === undefined) return 'N/A';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return String(val);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ─────────────────────────────────────────────────────────────────
   Suggestion chips
───────────────────────────────────────────────────────────────── */
const SUGGESTIONS = [
  {
    id: 'spending-trends',
    Icon: TrendIcon,
    title: 'Spending trends',
    prompt: 'Show my spending trend for this month',
    accentColor: 'rgba(96,165,250,0.55)',
  },
  {
    id: 'top-vendors',
    Icon: VendorIcon,
    title: 'Top vendors',
    prompt: 'Who are my top 5 vendors by spend?',
    accentColor: 'rgba(74,222,128,0.55)',
  },
  {
    id: 'recent-receipts',
    Icon: ReceiptIcon,
    title: 'Recent receipts',
    prompt: 'Show me my recent uploaded receipts',
    accentColor: 'rgba(192,132,252,0.55)',
  },
  {
    id: 'expensive-purchases',
    Icon: StarIcon,
    title: 'Expensive purchases',
    prompt: 'What are my most expensive purchases?',
    accentColor: 'rgba(251,191,36,0.55)',
  },
];

function SuggestionChip({ suggestion, onSelect, index }) {
  const { Icon, title, accentColor } = suggestion;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      id={`suggestion-chip-${suggestion.id}`}
      aria-label={`Ask: ${title}`}
      onClick={() => onSelect(suggestion.prompt)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 + index * 0.07, ease: 'easeOut' }}
      whileHover={{ y: -2, scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 30,
        border: hovered ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.10)',
        background: hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
        boxShadow: hovered ? '0 0 12px rgba(249,115,22,0.12)' : 'none',
        flexShrink: 0,
      }}
    >
      <Icon size={13} />
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: hovered ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.60)',
          fontFamily: "'Inter', system-ui, sans-serif",
          whiteSpace: 'nowrap',
          transition: 'color 0.15s ease',
        }}
      >
        {title}
      </span>
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Typing indicator
───────────────────────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 0' }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.15, 0.8] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.22, ease: 'easeInOut' }}
          style={{ width: 7, height: 7, borderRadius: '50%', background: '#f97316' }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Format timestamp
───────────────────────────────────────────────────────────────── */
function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/* ─────────────────────────────────────────────────────────────────
   Markdown-like renderer
───────────────────────────────────────────────────────────────── */
function RenderMarkdown({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {lines.map((line, idx) => {
        const isBullet = line.startsWith('- ') || line.startsWith('• ');
        const content = isBullet ? line.slice(2) : line;
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, pi) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={pi} style={{ color: '#ffffff', fontWeight: 700 }}>
              {part.slice(2, -2)}
            </strong>
          ) : (
            part
          )
        );
        if (!line.trim()) return <div key={idx} style={{ height: 3 }} />;
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: isBullet ? 7 : 0 }}>
            {isBullet && (
              <span style={{ color: '#f97316', marginTop: 2, flexShrink: 0, fontSize: 10, lineHeight: 1.7 }}>
                ●
              </span>
            )}
            <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.88)', lineHeight: 1.65 }}>
              {rendered}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Structured Result Card
───────────────────────────────────────────────────────────────── */
function StructuredResultCard({ message, onSelectPrompt }) {
  const meta = message.metadata || {};
  const type = message.result_type || meta.type;
  const [expanded, setExpanded] = useState(false);

  if (!type || type === 'general_query' || type === 'no_results') {
    return null;
  }

  // 1. Ambiguous Vendor Chips
  if (type === 'ambiguous_vendor' && meta.matching_vendors?.length > 0) {
    return (
      <div
        style={{
          marginTop: 8,
          padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(249,115,22,0.06)',
          border: '1px solid rgba(249,115,22,0.22)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#f97316' }}>
          Select matching vendor:
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {meta.matching_vendors.map((v, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt && onSelectPrompt(`How much did I spend at ${v}?`)}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                border: '1px solid rgba(249,115,22,0.35)',
                background: 'rgba(249,115,22,0.12)',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(249,115,22,0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(249,115,22,0.12)')}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 2. Vendor Items List
  if (type === 'vendor_items' && meta.items?.length > 0) {
    const displayItems = expanded ? meta.items : meta.items.slice(0, 5);
    const hasMore = meta.items.length > 5;
    return (
      <div
        style={{
          marginTop: 8,
          padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.50)', textTransform: 'uppercase' }}>
            {meta.vendor || 'Extracted Items'} ({meta.items.length} items)
          </span>
          {meta.total_amount && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#f97316' }}>
              {formatCurrency(meta.total_amount)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {displayItems.map((it, idx) => (
            <span
              key={idx}
              style={{
                fontSize: 11.5,
                color: 'rgba(255,255,255,0.85)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                padding: '2px 7px',
              }}
            >
              {typeof it === 'string' ? it : it.description || it.name}
            </span>
          ))}
        </div>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f97316',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              alignSelf: 'flex-start',
              padding: '2px 0',
            }}
          >
            {expanded ? 'Show less' : `+${meta.items.length - 5} more items`}
          </button>
        )}
      </div>
    );
  }

  // 3. Item Search, Quantity & History Card
  if (
    (type === 'item_search' || type === 'item_quantity' || type === 'item_history') &&
    (meta.quantity !== undefined || meta.total_quantity !== undefined || meta.item_name || meta.item)
  ) {
    const itemName = meta.item_name || meta.item || 'Item';
    const itemQty = meta.quantity !== undefined ? meta.quantity : meta.total_quantity;
    const unitPrice = meta.unit_price;
    const totalSpent = meta.total_spent;
    const vendorName = meta.purchases?.[0]?.vendor || (meta.vendors && meta.vendors[0]) || meta.vendor;
    const purchaseDate = meta.latest_date || meta.purchases?.[0]?.date;

    return (
      <div
        style={{
          marginTop: 8,
          padding: '10px 14px',
          borderRadius: 10,
          background: 'rgba(74,222,128,0.06)',
          border: '1px solid rgba(74,222,128,0.20)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#4ade80', textTransform: 'capitalize' }}>
            {itemName}
          </span>
          {totalSpent !== undefined && totalSpent > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>
              Total: {formatCurrency(totalSpent)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11.5, color: 'rgba(255,255,255,0.75)' }}>
          {itemQty !== undefined && (
            <span>
              Qty: <strong style={{ color: '#ffffff' }}>{itemQty}</strong>
            </span>
          )}
          {unitPrice !== undefined && unitPrice !== null && (
            <span>
              Unit Price: <strong style={{ color: '#ffffff' }}>{formatCurrency(unitPrice)}</strong>
            </span>
          )}
          {vendorName && (
            <span style={{ color: 'rgba(255,255,255,0.70)' }}>
              From: <strong style={{ color: '#ffffff' }}>{vendorName}</strong>
            </span>
          )}
          {purchaseDate && (
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>
              Date: {purchaseDate}
            </span>
          )}
        </div>
      </div>
    );
  }

  // 4. Vendor Spending Card
  if (type === 'vendor_spending' && meta.total_spent !== undefined) {
    return (
      <div
        style={{
          marginTop: 8,
          padding: '8px 12px',
          borderRadius: 10,
          background: 'rgba(249,115,22,0.06)',
          border: '1px solid rgba(249,115,22,0.20)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
          {meta.vendor || 'Vendor'} Total Spend
        </span>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#f97316' }}>
          {formatCurrency(meta.total_spent)}
        </span>
      </div>
    );
  }

  // 5. Vendor Comparison Card
  if (type === 'vendor_comparison' && meta.vendor_a && meta.vendor_b) {
    const v_a = meta.vendor_a;
    const v_b = meta.vendor_b;
    const s_a = meta.vendor_a_spent || 0;
    const s_b = meta.vendor_b_spent || 0;
    const diff = meta.difference || 0;
    const higher = meta.higher_vendor;

    return (
      <div
        style={{
          marginTop: 8,
          padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.50)', textTransform: 'uppercase' }}>
          Vendor Comparison
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ padding: '6px 8px', borderRadius: 6, background: higher === v_a ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.03)', border: higher === v_a ? '1px solid rgba(249,115,22,0.30)' : '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.60)' }}>{v_a}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: higher === v_a ? '#f97316' : '#ffffff' }}>{formatCurrency(s_a)}</div>
          </div>
          <div style={{ padding: '6px 8px', borderRadius: 6, background: higher === v_b ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.03)', border: higher === v_b ? '1px solid rgba(249,115,22,0.30)' : '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.60)' }}>{v_b}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: higher === v_b ? '#f97316' : '#ffffff' }}>{formatCurrency(s_b)}</div>
          </div>
        </div>
        {higher && diff > 0 && (
          <div style={{ fontSize: 11.5, color: '#f97316', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>●</span> Spent {formatCurrency(diff)} more at {higher}
          </div>
        )}
      </div>
    );
  }

  // 6. Filtered Receipts & Temporal Spending Card
  if (type === 'filtered_receipts' || type === 'temporal_spending') {
    const isItemFilter = (meta.item_count !== undefined && meta.item_count > 0) || (meta.items && meta.items.length > 0);
    const countLabel = isItemFilter
      ? `${meta.item_count || (meta.items ? meta.items.length : 0)} Matching Item${(meta.item_count || (meta.items ? meta.items.length : 0)) !== 1 ? 's' : ''}`
      : `${meta.document_count || 0} Matching Receipt${meta.document_count !== 1 ? 's' : ''}`;

    return (
      <div
        style={{
          marginTop: 8,
          padding: '8px 12px',
          borderRadius: 10,
          background: 'rgba(96,165,250,0.06)',
          border: '1px solid rgba(96,165,250,0.20)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
          {countLabel}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>
          Total: {formatCurrency(meta.total_spent || 0)}
        </span>
      </div>
    );
  }

  // 7. Item History Card
  if (type === 'item_history' && meta.item_name) {
    return (
      <div
        style={{
          marginTop: 8,
          padding: '8px 12px',
          borderRadius: 10,
          background: 'rgba(74,222,128,0.06)',
          border: '1px solid rgba(74,222,128,0.20)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', textTransform: 'capitalize' }}>
            {meta.item_name} History
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80' }}>
            {formatCurrency(meta.total_spent || 0)}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.60)' }}>
          Bought {meta.total_quantity} across {meta.document_count} receipt{meta.document_count !== 1 ? 's' : ''}
          {meta.latest_date ? ` • Last on ${meta.latest_date}` : ''}
        </div>
      </div>
    );
  }

  // 7b. Most Expensive & Cheapest Item Cards
  if ((type === 'most_expensive_item' || type === 'cheapest_item') && (meta.item_name || meta.name)) {
    const isMost = type === 'most_expensive_item';
    const itName = meta.item_name || meta.name;
    const itAmt = meta.amount || meta.unit_price;
    const itVendor = meta.vendor;

    return (
      <div
        style={{
          marginTop: 8,
          padding: '10px 14px',
          borderRadius: 10,
          background: isMost ? 'rgba(249,115,22,0.08)' : 'rgba(74,222,128,0.08)',
          border: isMost ? '1px solid rgba(249,115,22,0.25)' : '1px solid rgba(74,222,128,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: isMost ? '#f97316' : '#4ade80', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {isMost ? 'Most Expensive Item' : 'Cheapest Item'}
          </span>
          {itAmt !== undefined && (
            <span style={{ fontSize: 14, fontWeight: 800, color: isMost ? '#f97316' : '#4ade80' }}>
              {formatCurrency(itAmt)}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
          {itName}
        </div>
        {itVendor && (
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.60)' }}>
            From: <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{itVendor}</strong>
          </div>
        )}
      </div>
    );
  }

  // 7c. Most Expensive & Cheapest Receipt Cards
  if ((type === 'most_expensive_receipt' || type === 'cheapest_receipt') && (meta.total_amount !== undefined || meta.total !== undefined)) {
    const isMost = type === 'most_expensive_receipt';
    const recTot = meta.total_amount !== undefined ? meta.total_amount : meta.total;
    const recVendor = meta.vendor || 'Unknown Vendor';
    const recDate = meta.document_date || meta.date;

    return (
      <div
        style={{
          marginTop: 8,
          padding: '10px 14px',
          borderRadius: 10,
          background: isMost ? 'rgba(249,115,22,0.08)' : 'rgba(96,165,250,0.08)',
          border: isMost ? '1px solid rgba(249,115,22,0.25)' : '1px solid rgba(96,165,250,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: isMost ? '#f97316' : '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {isMost ? 'Most Expensive Receipt' : 'Cheapest Receipt'}
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: isMost ? '#f97316' : '#60a5fa' }}>
            {formatCurrency(recTot)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
          <span>Vendor: <strong style={{ color: '#ffffff' }}>{recVendor}</strong></span>
          {recDate && <span>Date: {recDate}</span>}
        </div>
      </div>
    );
  }

  // 8. Clarification Options
  if (type === 'clarification' && meta.options?.length > 0) {
    return (
      <div
        style={{
          marginTop: 8,
          padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(249,115,22,0.06)',
          border: '1px solid rgba(249,115,22,0.22)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#f97316' }}>
          Please select an option:
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {meta.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt && onSelectPrompt(opt)}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                border: '1px solid rgba(249,115,22,0.35)',
                background: 'rgba(249,115,22,0.12)',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 9. Top Vendors List
  if (type === 'top_vendors' && meta.vendors?.length > 0) {
    return (
      <div
        style={{
          marginTop: 8,
          padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.50)', textTransform: 'uppercase' }}>
          Top Vendors
        </span>
        {meta.vendors.slice(0, 4).map((v, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.85)' }}>{idx + 1}. {v.vendor}</span>
            <span style={{ fontWeight: 600, color: '#f97316' }}>{formatCurrency(v.total_spent)}</span>
          </div>
        ))}
      </div>
    );
  }

  // 10. Most Frequent Items List
  if (type === 'most_frequent_items' && meta.items?.length > 0) {
    return (
      <div
        style={{
          marginTop: 8,
          padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.50)', textTransform: 'uppercase' }}>
          Most Frequent Items
        </span>
        {meta.items.slice(0, 4).map((it, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.85)' }}>{idx + 1}. {it.name}</span>
            <span style={{ fontWeight: 600, color: '#4ade80' }}>Qty: {it.quantity}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

/* ─────────────────────────────────────────────────────────────────
   Sources Pill Row
───────────────────────────────────────────────────────────────── */
function SourceDocumentsRow({ sources, onNavigateDoc }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        marginTop: 6,
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <ReceiptIcon size={11} />
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Sources ({sources.length})
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {sources.map((src, idx) => (
          <button
            key={idx}
            onClick={() => onNavigateDoc(src)}
            title={`Open ${src.filename} in Document Library`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.75)',
              fontSize: 11,
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(249,115,22,0.12)';
              e.currentTarget.style.borderColor = 'rgba(249,115,22,0.35)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
            }}
          >
            <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {src.filename}
            </span>
            {src.total && (
              <span style={{ color: '#f97316', fontWeight: 600 }}>
                {formatCurrency(src.total)}
              </span>
            )}
            <ExternalDocIcon size={10} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Message bubble
───────────────────────────────────────────────────────────────── */
function MessageBubble({ message, onSelectPrompt, onNavigateDoc }) {
  const isUser = message.role === 'user';
  const [actionsVisible, setActionsVisible] = useState(false);
  const handleCopy = () => navigator.clipboard?.writeText(message.content).catch(() => {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 9,
        maxWidth: '100%',
      }}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: 'rgba(249,115,22,0.14)',
            border: '1px solid rgba(249,115,22,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <RobotIcon size={20} />
        </div>
      )}

      <div
        style={{
          maxWidth: isUser ? '66%' : '84%',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          alignItems: isUser ? 'flex-end' : 'flex-start',
        }}
        onMouseEnter={() => !isUser && setActionsVisible(true)}
        onMouseLeave={() => !isUser && setActionsVisible(false)}
      >
        {!isUser && (
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: '#f97316',
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginLeft: 2,
            }}
          >
            STRUCTRA
          </span>
        )}

        <div
          style={{
            padding: isUser ? '9px 13px' : '11px 15px',
            borderRadius: isUser ? '13px 3px 13px 13px' : '3px 13px 13px 13px',
            background: isUser
              ? 'rgba(120, 65, 15, 0.45)'
              : message.isError
              ? 'rgba(180, 40, 40, 0.15)'
              : 'rgba(255,255,255,0.05)',
            border: isUser
              ? '1px solid rgba(249,115,22,0.20)'
              : message.isError
              ? '1px solid rgba(200,70,70,0.25)'
              : '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {isUser ? (
            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                color: 'rgba(255,255,255,0.90)',
                fontFamily: "'Inter', system-ui, sans-serif",
                lineHeight: 1.6,
              }}
            >
              {message.content}
            </p>
          ) : (
            <>
              <RenderMarkdown text={message.content} />
              <StructuredResultCard message={message} onSelectPrompt={onSelectPrompt} />
              <SourceDocumentsRow sources={message.sources} onNavigateDoc={onNavigateDoc} />
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', fontFamily: "'Inter', system-ui, sans-serif" }}>
            {formatTime(message.timestamp)}
          </span>

          {isUser && (
            <svg width="14" height="9" viewBox="0 0 20 12" fill="none">
              <path d="M1 6l4 4L13 2M7 6l4 4 6-8" stroke="rgba(249,115,22,0.55)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}

          {!isUser && (
            <AnimatePresence>
              {actionsVisible && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.12 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  {[
                    { key: 'copy', Icon: CopyIcon, title: 'Copy', action: handleCopy },
                    { key: 'like', Icon: ThumbUpIcon, title: 'Good response' },
                    { key: 'dislike', Icon: ThumbDownIcon, title: 'Bad response' },
                  ].map(({ key, Icon, title, action }) => (
                    <button
                      key={key}
                      title={title}
                      onClick={action}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'rgba(255,255,255,0.35)',
                        padding: 3,
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'color 0.12s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.80)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                    >
                      <Icon />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Page entrance animation variants
───────────────────────────────────────────────────────────────── */
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const fadeUpVariant = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const fadeVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

/* ─────────────────────────────────────────────────────────────────
   Main AssistantPage
───────────────────────────────────────────────────────────────── */
export default function AssistantPage() {
  const navigate = useNavigate();
  const {
    messages,
    isLoading,
    sendMessage,
    clearConversation,
    hasMessages,
    draftInput = '',
    setDraftInput = () => {},
  } = useAssistant();
  const [inputFocused, setInputFocused] = useState(false);
  const conversationEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = useCallback(() => {
    const text = draftInput.trim();
    if (!text || isLoading) return;
    setDraftInput('');
    sendMessage(text);
  }, [draftInput, isLoading, sendMessage, setDraftInput]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleSuggestion = useCallback(
    (prompt) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  const handleNavigateDoc = useCallback(
    (src) => {
      if (!src?.document_id) return;
      navigate('/app/library', {
        state: {
          selectedDocId: src.document_id,
          filename: src.filename || 'Document',
        },
      });
    },
    [navigate]
  );

  const canSend = !!draftInput.trim() && !isLoading;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{
        padding: '24px 28px 0 28px',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        maxWidth: 1040,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Main glass card ── */}
      <motion.div
        variants={fadeUpVariant}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 2px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: '30px 36px 20px 36px',
            textAlign: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {/* Reset button if conversation has messages */}
          {hasMessages && (
            <button
              onClick={clearConversation}
              title="Start fresh conversation"
              style={{
                position: 'absolute',
                top: 24,
                right: 32,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 8,
                padding: '6px 10px',
                color: 'rgba(255,255,255,0.60)',
                fontSize: 11.5,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.30)';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.60)';
              }}
            >
              <TrashIcon size={12} />
              <span>Clear</span>
            </button>
          )}

          {/* Greeting */}
          <motion.div
            variants={fadeUpVariant}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              marginBottom: 8,
            }}
          >
            <SparkleIcon size={20} />
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 700,
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: '-0.01em',
                color: '#ffffff',
              }}
            >
              Hi, I am{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #ffb347 0%, #f97316 60%, #ea580c 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                STRUCTRA.
              </span>
            </h1>
          </motion.div>

          <motion.p
            variants={fadeVariant}
            style={{
              margin: '0 auto',
              maxWidth: 480,
              fontSize: 13.5,
              color: 'rgba(255,255,255,0.50)',
              fontFamily: "'Inter', system-ui, sans-serif",
              lineHeight: 1.55,
            }}
          >
            Your AI assistant for all things documents, receipts, invoices and insights.
            <br />
            Ask me anything or explore suggestions below.
          </motion.p>

          {/* Suggestion chips — only when no messages */}
          <AnimatePresence>
            {!hasMessages && (
              <motion.div
                key="suggestions"
                initial={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                {/* Chips row */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    justifyContent: 'center',
                    marginTop: 18,
                  }}
                >
                  {SUGGESTIONS.map((s, i) => (
                    <SuggestionChip key={s.id} suggestion={s} onSelect={handleSuggestion} index={i} />
                  ))}
                </div>

                {/* Tip */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35, delay: 0.5 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    marginTop: 12,
                  }}
                >
                  <LightbulbIcon />
                  <span
                    style={{
                      fontSize: 11.5,
                      color: 'rgba(255,255,255,0.33)',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    Tip: You can ask questions in natural language.
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Conversation area ── */}
        <div
          id="assistant-conversation-area"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 36px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(249,115,22,0.35) transparent',
          }}
        >
          {/* Empty state */}
          <AnimatePresence>
            {!hasMessages && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 14,
                  paddingBottom: 20,
                }}
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      '0 0 0px rgba(249,115,22,0)',
                      '0 0 22px rgba(249,115,22,0.22)',
                      '0 0 0px rgba(249,115,22,0)',
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    width: 66,
                    height: 66,
                    borderRadius: 18,
                    background: 'rgba(249,115,22,0.08)',
                    border: '1px solid rgba(249,115,22,0.20)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RobotIcon size={42} />
                </motion.div>

                <div style={{ textAlign: 'center' }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.88)',
                      fontFamily: "'Inter', system-ui, sans-serif",
                      marginBottom: 5,
                    }}
                  >
                    How can I help you today?
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.40)',
                      fontFamily: "'Inter', system-ui, sans-serif",
                      lineHeight: 1.55,
                    }}
                  >
                    Ask anything about your documents, spending,
                    <br />
                    vendors, invoices and more.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onSelectPrompt={sendMessage}
              onNavigateDoc={handleNavigateDoc}
            />
          ))}

          {/* Loading indicator */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: 'rgba(249,115,22,0.14)',
                    border: '1px solid rgba(249,115,22,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <RobotIcon size={20} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: '#f97316',
                      fontFamily: "'Inter', system-ui, sans-serif",
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginLeft: 2,
                    }}
                  >
                    STRUCTRA
                  </span>
                  <div
                    style={{
                      padding: '9px 14px',
                      borderRadius: '3px 13px 13px 13px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.55)',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontStyle: 'italic',
                      }}
                    >
                      Let me explore your Document Library...
                    </p>
                    <TypingIndicator />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={conversationEndRef} />
        </div>

        {/* ── Input bar ── */}
        <div
          style={{
            padding: '14px 36px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            flexShrink: 0,
          }}
        >
          <motion.div
            animate={{
              borderColor: inputFocused ? 'rgba(249,115,22,0.50)' : 'rgba(249,115,22,0.22)',
              boxShadow: inputFocused ? '0 0 0 3px rgba(249,115,22,0.08)' : '0 0 0 0px rgba(249,115,22,0)',
            }}
            transition={{ duration: 0.18 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(249,115,22,0.22)',
              borderRadius: 14,
              padding: '9px 9px 9px 14px',
            }}
          >
            <SparkleIcon size={13} />

            <textarea
              ref={inputRef}
              id="assistant-input"
              value={draftInput}
              onChange={(e) => setDraftInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Ask STRUCTRA anything..."
              rows={1}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: 13.5,
                color: 'rgba(255,255,255,0.90)',
                fontFamily: "'Inter', system-ui, sans-serif",
                lineHeight: 1.5,
                maxHeight: 110,
                overflow: 'auto',
                scrollbarWidth: 'none',
              }}
            />

            <button
              id="assistant-attach-btn"
              title="Attach file (coming soon)"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'default',
                padding: '5px',
                display: 'flex',
                alignItems: 'center',
                opacity: 0.45,
              }}
            >
              <PaperclipIcon />
            </button>

            <motion.button
              id="assistant-send-btn"
              aria-label="Send message"
              onClick={handleSend}
              disabled={!canSend}
              whileHover={canSend ? { scale: 1.06 } : {}}
              whileTap={canSend ? { scale: 0.94 } : {}}
              animate={{
                background: canSend
                  ? 'linear-gradient(135deg, #ffb347 0%, #f97316 55%, #ea580c 100%)'
                  : 'rgba(255,255,255,0.07)',
                boxShadow: canSend ? '0 0 14px rgba(249,115,22,0.35)' : 'none',
              }}
              transition={{ duration: 0.2 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                border: 'none',
                cursor: canSend ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <SendIcon />
            </motion.button>
          </motion.div>

          {/* Privacy note */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              marginTop: 9,
              paddingBottom: 10,
            }}
          >
            <ShieldIcon />
            <span
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.24)',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              STRUCTRA uses your document data to provide accurate insights. Responses may vary.
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
