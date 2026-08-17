import { useState } from 'react';
import { motion } from 'framer-motion';
import DashboardModal, { EyeButton } from './DashboardModal';

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function ItemIcon({ name }) {
  const n = (name || '').toLowerCase();
  if (n.includes('milk') || n.includes('drink') || n.includes('beverage') || n.includes('tea') || n.includes('coffee')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2h8a2 2 0 0 1 2 2v2H6V4a2 2 0 0 1 2-2z" />
        <path d="M6 6h12l-1 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 6z" />
      </svg>
    );
  }
  if (n.includes('rice') || n.includes('atta') || n.includes('dal') || n.includes('wheat') || n.includes('food')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function ItemRow({ item, idx }) {
  const qty = item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 8px',
        borderRadius: 10,
        background: 'rgba(255, 255, 255, 0.025)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* Icon Box */}
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <ItemIcon name={item.name} />
      </div>

      {/* Item info */}
      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#ffffff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={item.name}
        >
          {item.name}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.40)' }}>
          {formatCurrency(item.total_spent)} • {item.document_count} doc{item.document_count === 1 ? '' : 's'}
        </span>
      </div>

      {/* Quantity badge */}
      <span
        style={{
          padding: '2px 7px',
          borderRadius: 5,
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.28)',
          color: '#34d399',
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "'Inter', monospace, sans-serif",
          flexShrink: 0,
        }}
      >
        {qty}
      </span>
    </div>
  );
}

/**
 * MostPurchasedItemsSection
 * Transparent glass styling matching the document library.
 */
export default function MostPurchasedItemsSection({ itemData, loading }) {
  const [modalOpen, setModalOpen] = useState(false);
  const items = itemData?.items || [];
  const previewItems = items.slice(0, 3);
  const hasItems = items.length > 0;

  return (
    <>
      <motion.div
        whileHover={{
          y: -2.5,
          borderColor: 'rgba(255, 255, 255, 0.20)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.22)',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.085) 0%, rgba(255, 255, 255, 0.035) 100%)',
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.065) 0%, rgba(255, 255, 255, 0.022) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.11)',
          backdropFilter: 'blur(28px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.16)',
          padding: '16px 18px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          height: '100%',
          minHeight: 220,
          cursor: 'default',
        }}
      >
        {/* Top sheen highlight */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '10%',
            width: '80%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent)',
            pointerEvents: 'none',
          }}
        />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#f97316',
                boxShadow: '0 0 8px #f97316',
              }}
            />
            <h2
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: '#ffffff',
                margin: 0,
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Most Purchased Items
            </h2>
          </div>
          <EyeButton
            id="most-purchased-eye"
            onClick={() => setModalOpen(true)}
            title="View all purchased items"
          />
        </div>

        {/* 3 Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, justifyContent: 'center' }}>
          {!hasItems ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <span style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.40)' }}>
                No purchase items recorded yet.
              </span>
            </div>
          ) : (
            previewItems.map((item, idx) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: idx * 0.03 }}
              >
                <ItemRow item={item} idx={idx} />
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Modal */}
      <DashboardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Most Purchased Items"
        subtitle={`Top ${items.length} items by purchase quantity`}
        accentColor="#10b981"
        maxWidth={580}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item, idx) => (
            <ItemRow key={item.name} item={item} idx={idx} />
          ))}
        </div>
      </DashboardModal>
    </>
  );
}
