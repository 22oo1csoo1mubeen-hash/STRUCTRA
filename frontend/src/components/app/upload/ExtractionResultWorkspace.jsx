import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Image as ImageIcon, CheckCircle2, RefreshCw, RefreshCcw, ZoomIn, ZoomOut, Maximize, Maximize2,
  Download, Search, Sparkles, Building2, Calendar, MapPin, Hash, IndianRupee, 
  List, ArrowRight, Minus, Plus, AlertTriangle, AlertCircle, X, Check, Save,
  FileDown, Trash2, Edit2, ShieldCheck, Info, Loader2
} from 'lucide-react';
import ExtractionConfidenceCard from './ExtractionConfidenceCard';
import FieldConfidenceIndicator from './FieldConfidenceIndicator';
import DocumentPreviewViewer from './DocumentPreviewViewer';

// ==========================================
// SCENARIO CONFIGURATION
// State: 'VALID' | 'REVIEW_RECOMMENDED' | 'POSSIBLE_DUPLICATE'
// ==========================================

const MOCK_RESULT = {
  filename: "Receipt.png",
  fileType: "PNG",
  fileSize: "3.10 MB",
  confidence: "96%",
  vendor: "ABC MART",
  date: "09 Aug 2025",
  address: "123 Green Street,\nBangalore, Karnataka - 560001",
  invoiceNumber: "INV-2025-08-0098",
  totalAmount: "₹\u00A01,365.00",
  totalInWords: "One Thousand Three Hundred Sixty Five Rupees Only",
  lineItems: [
    { item: "Aashirvaad Atta 5kg", qty: 1, rate: "₹\u00A0289.00", amount: "₹\u00A0289.00" },
    { item: "Amul Toned Milk 1L", qty: 2, rate: "₹\u00A063.00", amount: "₹\u00A0126.00" },
    { item: "Rice 1kg", qty: 1, rate: "₹\u00A078.00", amount: "₹\u00A078.00" },
    { item: "Fortune Sunflower Oil 1L", qty: 1, rate: "₹\u00A0145.00", amount: "₹\u00A0145.00" },
    { item: "Tata Tea Premium 250g", qty: 1, rate: "₹\u00A0110.00", amount: "₹\u00A0110.00" },
  ]
};

export default function ExtractionResultWorkspace({ file, uploadedDocument, stage, setStage, resetUpload, onSaveToLibrary, extractionResult, validationResult }) {

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '—';
    return `₹\u00A0${parseFloat(val).toFixed(2)}`;
  };

  const [editedData, setEditedData] = useState(null);
  const [successBannerDismissed, setSuccessBannerDismissed] = useState(false);
  const [warningBannerDismissed, setWarningBannerDismissed] = useState(false);
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showDetailsPopup) {
        setShowDetailsPopup(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDetailsPopup]);

  // Reset editedData and dismiss state when extractionResult changes
  useEffect(() => {
    setEditedData(null);
    setSuccessBannerDismissed(false);
    setWarningBannerDismissed(false);
  }, [extractionResult]);

  const baseData = useMemo(() => {
    return extractionResult?.extraction ? {
      vendor: extractionResult.extraction.vendor_company || '—',
      date: extractionResult.extraction.date || '—',
      address: extractionResult.extraction.address || '—',
      invoiceNumber: extractionResult.extraction.invoice_number || '—',
      totalAmount: formatCurrency(extractionResult.extraction.total),
      lineItems: (extractionResult.extraction.line_items || []).map(li => ({
        item: li.description || '—',
        qty: li.quantity !== null && li.quantity !== undefined ? li.quantity : '—',
        rate: li.unit_price !== null && li.unit_price !== undefined ? formatCurrency(li.unit_price) : '—',
        amount: li.line_total !== null && li.line_total !== undefined ? formatCurrency(li.line_total) : '—'
      }))
    } : MOCK_RESULT;
  }, [extractionResult]);

  const displayData = editedData || baseData;

  const handleSaveData = (newData) => {
    setEditedData(newData);
  };
  const displayFilename = useMemo(() => {
    if (file?.name) return file.name;
    if (uploadedDocument?.original_filename) return uploadedDocument.original_filename;
    if (uploadedDocument?.filename && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(uploadedDocument.filename)) {
      return uploadedDocument.filename;
    }
    return MOCK_RESULT.filename;
  }, [file, uploadedDocument]);

  const displayType = file?.name?.split('.').pop()?.toUpperCase() || uploadedDocument?.file_type?.toUpperCase() || MOCK_RESULT.fileType;
  const displaySize = file ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : MOCK_RESULT.fileSize;
  
  const now = new Date();
  const dateOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  const formattedDate = now.toLocaleDateString('en-GB', dateOptions);
  const formattedTime = now.toLocaleTimeString('en-US', timeOptions);
  const realtimeProcessedAt = `${formattedDate}, ${formattedTime}`;

  // Dynamic Routing Logic is now handled by UploadPage.jsx

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ 
            width: 48, height: 56, borderRadius: 8, 
            background: 'linear-gradient(135deg, #f97316 0%, #e85d04 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(249,115,22,0.25)'
          }}>
            <ImageIcon size={24} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#fff',
                  margin: 0,
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 440
                }}
                title={displayFilename}
              >
                {displayFilename}
              </h2>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: 6, 
                padding: '4px 10px', borderRadius: 20, 
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)'
              }}>
                <CheckCircle2 size={12} color="#10b981" />
                <span style={{ fontSize: 11.5, fontWeight: 500, color: '#10b981' }}>Processed Successfully</span>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,240,220,0.5)', margin: 0 }}>
              {displayType} • {displaySize} • Processed on {realtimeProcessedAt}
            </p>
          </div>
        </div>

        {/* Top Right Action Button & Confidence Ring */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {stage !== 10 && stage !== 11 && (
            <ExtractionConfidenceCard quality={extractionResult?.quality} />
          )}

          {stage === 7 ? (
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStage(9)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Edit2 size={16} />
              Review
            </motion.button>
          ) : stage !== 10 && stage !== 11 ? (
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={resetUpload}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <RefreshCw size={16} />
              Process Another
            </motion.button>
          ) : null}
        </div>
      </div>

      {/* Success Validation Banner */}
      <AnimatePresence>
        {stage === 7 && validationResult?.overall_status === 'valid' && !successBannerDismissed && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 0, marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, padding: 0, overflow: 'hidden' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ position: 'relative' }}
          >
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button 
                onClick={() => setSuccessBannerDismissed(true)}
                style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: 'rgba(16,185,129,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 4, transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <X size={16} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontWeight: 600 }}>
                <CheckCircle2 size={16} /> Document Validated
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,250,242,0.85)', lineHeight: 1.5, paddingRight: 24 }}>
                All validation checks passed successfully.
              </div>
            </div>
          </motion.div>
        )}
        {/* Warning Validation Banner */}
        {stage === 9 && validationResult?.overall_status !== 'valid' && !warningBannerDismissed && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 0, marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, padding: 0, overflow: 'hidden' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ position: 'relative' }}
          >
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button 
                onClick={() => setWarningBannerDismissed(true)}
                style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: 'rgba(245,158,11,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 4, transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <X size={16} />
              </button>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {validationResult?.duplicate_detection?.classification === 'likely_duplicate' || validationResult?.duplicate_detection?.classification === 'definite_duplicate' ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontWeight: 600 }}>
                      <AlertTriangle size={16} /> Duplicate Detected
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,250,242,0.85)', lineHeight: 1.5, paddingRight: 24 }}>
                      This document appears similar to an existing document. Review before proceeding.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontWeight: 600 }}>
                      <AlertTriangle size={16} /> Review Recommended
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,250,242,0.85)', lineHeight: 1.5, paddingRight: 24 }}>
                      Some extracted values could not be mathematically reconciled. Review the detected discrepancies.
                    </div>
                  </>
                )}
                <div>
                  <button 
                    onClick={() => setShowDetailsPopup(true)}
                    style={{ background: 'transparent', border: 'none', color: '#f59e0b', fontSize: 13, fontWeight: 500, textDecoration: 'underline', cursor: 'pointer', padding: 0, marginTop: 4 }}
                  >
                    Details
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation Details Popover */}
      <AnimatePresence>
        {showDetailsPopup && validationResult?.issues && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowDetailsPopup(false)}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90, background: 'rgba(0,0,0,0.4)' }}
            />
            <motion.div 
              initial={{ opacity: 0, y: '-45%', x: '-50%', scale: 0.98 }}
              animate={{ opacity: 1, y: '-50%', x: '-50%', scale: 1 }}
              exit={{ opacity: 0, y: '-45%', x: '-50%', scale: 0.98 }}
              transition={{ duration: 0.2 }}
              style={{ 
                position: 'fixed', top: '50%', left: '50%', zIndex: 100,
                background: 'rgba(15,20,25,0.95)', backdropFilter: 'blur(16px)', 
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, 
                width: 400, boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                display: 'flex', flexDirection: 'column', maxHeight: '90vh'
              }}
            >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, color: '#fff', fontSize: 15 }}>Review Details</div>
              <button 
                onClick={() => setShowDetailsPopup(false)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>
            
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20, maxHeight: 400, overflowY: 'auto' }}>
              {validationResult.issues.map((issue, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: 14 }}>{issue.title}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                    {issue.message}
                  </div>
                  {(issue.expected !== undefined && issue.expected !== null) && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {issue.type === 'subtotal_mismatch' ? 'Calculated from line items' : 'Calculated / Expected'}
                        </span>
                        <span style={{ color: '#fff', fontFamily: 'monospace' }}>{formatCurrency(issue.expected)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {issue.type === 'subtotal_mismatch' ? 'Document subtotal' : 'Extracted / Document'}
                        </span>
                        <span style={{ color: '#fff', fontFamily: 'monospace' }}>{formatCurrency(issue.actual)}</span>
                      </div>
                      <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.05)' }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Difference</span>
                        <span style={{ color: '#f97316', fontFamily: 'monospace' }}>{formatCurrency(issue.difference)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Layout Conditional */}
      {stage < 11 ? (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: 760, paddingBottom: 16 }}>
          {/* Main columns row */}
          <div style={{ display: 'flex', gap: 24, width: '100%', alignItems: 'stretch', flex: 1, minHeight: 0 }}>
          
            {/* Left Column: Document Preview Component */}
            <DocumentPreviewViewer
              file={file}
              documentId={uploadedDocument?.document_id || extractionResult?.document_id}
            />

        {/* Right Column: Dynamic Content Based on Stage */}
        <motion.div 
          layout 
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ flex: 1, display: 'grid' }}
        >
          <AnimatePresence>
            {stage === 10 ? (
              <motion.div
                key="stage10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{ gridArea: '1 / 1 / 2 / 2', display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}
              >
                <DuplicateWarningView setStage={setStage} displayData={displayData} />
              </motion.div>
            ) : stage === 9 ? (
              <motion.div
                key="stage9"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{ gridArea: '1 / 1 / 2 / 2', display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}
              >
                <ReviewEditView setStage={setStage} displayData={displayData} onSave={handleSaveData} extractionResult={extractionResult} />
              </motion.div>
            ) : stage >= 7 ? (
              <motion.div
                key="right-panel"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, position: 'absolute', right: 0 }}
                transition={{ duration: 0.35 }}
                style={{ gridArea: '1 / 1 / 2 / 2', display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}
              >
                <ExtractionResultsRightPanel stage={stage} setStage={setStage} validationResult={validationResult} resetUpload={resetUpload} displayData={displayData} extractionResult={extractionResult} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>

        </div> {/* End of main columns row */}

        {/* Bottom Spanning Action Bar (Stage 7 only) */}
        <AnimatePresence>
          {stage === 7 && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 15, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', y: 0, marginTop: 24 }}
              exit={{ opacity: 0, height: 0, y: 15, marginTop: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: '100%', overflow: 'hidden' }}
            >
              <div
                style={{ 
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', 
                  borderRadius: 12, padding: 16, display: 'flex', gap: 16, alignItems: 'center',
                  width: '100%', boxSizing: 'border-box'
                }}
              >
                <motion.button 
                  whileHover={{ color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)' }}
                  style={{ flex: 1, justifyContent: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '12px 20px', borderRadius: 8, transition: 'all 0.2s', fontWeight: 500 }}
                >
                  <FileDown size={16} /> Export
                </motion.button>
                <motion.button 
                  whileHover={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' }}
                  style={{ flex: 1, justifyContent: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '12px 20px', borderRadius: 8, transition: 'all 0.2s', fontWeight: 500 }}
                >
                  <Trash2 size={16} /> Delete
                </motion.button>
                <motion.button 
                  onClick={resetUpload} 
                  whileHover={{ color: '#fff', backgroundColor: 'rgba(255,255,255,0.1)' }}
                  style={{ flex: 1, justifyContent: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '12px 20px', borderRadius: 8, transition: 'all 0.2s', fontWeight: 500 }}
                >
                  <RefreshCcw size={16} /> Process Another
                </motion.button>
                <motion.button
                  onClick={() => {
                    if (onSaveToLibrary) {
                      onSaveToLibrary();
                    } else {
                      setStage(11);
                    }
                  }}
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 20px rgba(249,115,22,0.4)' }}
                  whileTap={{ scale: 0.98 }}
                  style={{ 
                    flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #f97316 0%, #e85d04 100%)', 
                    border: 'none', borderRadius: 8, padding: '12px 24px', color: '#fff', fontSize: 14, fontWeight: 600, 
                    cursor: 'pointer', boxShadow: '0 4px 12px rgba(249,115,22,0.3)'
                  }}
                >
                  <Save size={16} /> Save to Library
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        </div>
      ) : (
        <AnimatePresence mode="wait">
          {stage === 11 && (
            <motion.div
              key="stage11"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: '100%' }}
            >
              <Stage11SuccessView file={file} resetUpload={resetUpload} displayData={displayData} />
            </motion.div>
          )}
        </AnimatePresence>
      )}

    </motion.div>
  );
}

// ------------------------------------------------------------------
// RIGHT PANEL: STAGE 7, 8 & 11 (Results + Validation + Final Result)
// ------------------------------------------------------------------
function ExtractionResultsRightPanel({ stage, setStage, validationResult, resetUpload, displayData, extractionResult }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={20} color="#f97316" />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 }}>Extracted Information</h3>
        </div>
      </div>

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <InfoCard icon={Building2} label="Vendor / Company" value={displayData.vendor} />
        <InfoCard icon={Calendar} label="Date" value={displayData.date} />
        <InfoCard icon={MapPin} label="Address" value={displayData.address} />
        <InfoCard icon={Hash} label="Invoice / Bill No." value={displayData.invoiceNumber} />
        {stage !== 8 && (
          <InfoCard icon={IndianRupee} label="Total Amount" value={displayData.totalAmount} fullWidth highlight />
        )}
      </div>

      {/* Scrollable Line Items in Result - Only show in stage 7 and 11 */}
      <AnimatePresence>
        {(stage === 7 || stage === 11) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ 
              flex: '0 1 auto', minHeight: 0, maxHeight: 320,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', 
              borderRadius: 12, overflow: 'hidden', marginBottom: stage === 7 ? 16 : 0, display: 'flex', flexDirection: 'column'
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>Line Items ({displayData.lineItems.length})</h4>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 500, color: 'rgba(255,240,220,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Item</th>
                    <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 500, color: 'rgba(255,240,220,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>Qty</th>
                    <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 500, color: 'rgba(255,240,220,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>Rate</th>
                    <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 500, color: 'rgba(255,240,220,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.lineItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,250,242,0.95)' }}>{item.item}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,250,242,0.95)', whiteSpace: 'nowrap' }}>{item.qty}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,250,242,0.95)', whiteSpace: 'nowrap' }}>{item.rate}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,250,242,0.95)', whiteSpace: 'nowrap' }}>{item.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function InfoCard({ icon: Icon, label, value, fullWidth = false, highlight = false }) {
  const [isHovered, setIsHovered] = useState(false);
  const textRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth + 1);
      }
    };
    
    checkTruncation();
    
    const observer = new ResizeObserver(() => {
      checkTruncation();
    });
    
    if (textRef.current) {
      observer.observe(textRef.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, [value]);

  const cardStyle = {
    background: highlight ? 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(232,93,4,0.02) 100%)' : 'rgba(255,255,255,0.03)', 
    border: highlight ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(255,255,255,0.06)', 
    borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12
  };

  const expandedBg = highlight 
    ? 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(232,93,4,0.05) 100%), #18181b' 
    : 'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0.05)), #18181b';

  return (
    <div 
      style={{ gridColumn: fullWidth ? '1 / -1' : 'auto', minWidth: 0, position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Base Card (Maintains grid layout) */}
      <motion.div 
        whileHover={!isTruncated ? { y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)' } : {}}
        style={{ ...cardStyle, opacity: (isHovered && isTruncated) ? 0 : 1 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Icon size={16} color="#f97316" />
            <span style={{ fontSize: 13, color: highlight ? 'rgba(249,115,22,0.9)' : 'rgba(255,240,220,0.6)' }}>{label}</span>
          </div>
          {!highlight && <CheckCircle2 size={16} color="#10b981" />}
        </div>
        <div 
          ref={textRef}
          style={{ fontSize: highlight ? 20 : 15, fontWeight: highlight ? 700 : 600, color: highlight ? '#fff' : 'rgba(255,250,242,0.95)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {value}
        </div>
      </motion.div>

      {/* Expanded Card (Overlays on hover) */}
      <AnimatePresence>
        {(isHovered && isTruncated) && (
          <motion.div 
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -4, boxShadow: '0 16px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)' }}
            exit={{ opacity: 0, y: 0, transition: { duration: 0.15 } }}
            style={{ 
              ...cardStyle, 
              background: expandedBg,
              position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 50
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Icon size={16} color="#f97316" />
                <span style={{ fontSize: 13, color: highlight ? 'rgba(249,115,22,0.9)' : 'rgba(255,240,220,0.6)' }}>{label}</span>
              </div>
              {!highlight && <CheckCircle2 size={16} color="#10b981" />}
            </div>
            <div style={{ fontSize: highlight ? 20 : 15, fontWeight: highlight ? 700 : 600, color: highlight ? '#fff' : 'rgba(255,250,242,0.95)', whiteSpace: 'pre-wrap' }}>
              {value}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------------
// RIGHT PANEL: STAGE 10 (Duplicate Warning)
// ------------------------------------------------------------------
function DuplicateWarningView({ setStage, resetUpload, displayData }) {
  const [isOpening, setIsOpening] = useState(false);

  if (isOpening) {
    return (
      <div style={{ 
        flex: 1, background: 'rgba(59,130,246,0.03)', border: '1px solid rgba(59,130,246,0.15)', 
        borderRadius: 16, padding: '40px 40px 100px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center',
        boxShadow: 'inset 0 0 40px rgba(59,130,246,0.05)'
      }}>
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ 
            width: 96, height: 96, borderRadius: '50%', 
            background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            border: '1px solid rgba(59,130,246,0.5)',
            marginBottom: 32, 
            boxShadow: '0 0 120px rgba(59,130,246,0.9), 0 0 40px rgba(59,130,246,0.6), inset 0 0 20px rgba(59,130,246,0.4)'
          }}
        >
          <Info size={40} color="#3b82f6" strokeWidth={3} fill="rgba(59,130,246,0.2)" style={{ filter: 'drop-shadow(0 0 16px #3b82f6)' }} />
        </motion.div>
        
        <h3 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Opening Existing Document</h3>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 32 }}>
          Redirecting you to the existing document...
        </p>

        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          style={{ marginTop: 24, filter: 'drop-shadow(0 0 8px rgba(249,115,22,0.6))' }}
        >
          <Loader2 size={40} color="#f97316" strokeWidth={2.5} />
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ 
      flex: 1, background: 'rgba(249,115,22,0.03)', border: '1px solid rgba(249,115,22,0.15)', 
      borderRadius: 16, padding: '40px 40px 100px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center',
      boxShadow: 'inset 0 0 40px rgba(249,115,22,0.05)'
    }}>
      <div style={{ 
        width: 96, height: 96, borderRadius: '50%', 
        background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        border: '1px solid rgba(239,68,68,0.5)',
        marginBottom: 32, 
        boxShadow: '0 0 120px rgba(239,68,68,0.9), 0 0 40px rgba(239,68,68,0.6), inset 0 0 20px rgba(239,68,68,0.4)'
      }}>
        <AlertTriangle size={40} color="#ef4444" strokeWidth={3} fill="rgba(239,68,68,0.2)" style={{ filter: 'drop-shadow(0 0 16px #ef4444)' }} />
      </div>
      
      <h3 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Possible Duplicate Detected</h3>
      <p style={{ fontSize: 14, color: 'rgba(255,240,220,0.6)', marginBottom: 32 }}>
        This document appears similar to an existing document.
      </p>

      {/* Existing Document Card */}
      <div style={{ 
        width: '100%', maxWidth: 440, background: 'rgba(10,12,16,0.6)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32,
        textAlign: 'left'
      }}>
        <div style={{ 
          width: 44, height: 44, borderRadius: 8, background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <ImageIcon size={20} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{displayData?.vendor || 'Unknown Vendor'}</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            <span>{displayData?.date || 'Unknown Date'}</span>
            <span>{displayData?.totalAmount || '₹ 0.00'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', 
            borderRadius: 20, padding: '4px 10px', color: '#10b981', fontSize: 11, fontWeight: 600
          }}>
            92% match
          </div>
          <button style={{ 
            background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 4
          }}>
            <Search size={18} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <motion.button
          onClick={() => setIsOpening(true)}
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '12px 24px', borderRadius: 8, background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}
        >
          View Existing
        </motion.button>
        <motion.button
          onClick={() => setStage(7)}
          whileHover={{ scale: 1.02, background: 'linear-gradient(135deg, #e85d04 0%, #dc2f02 100%)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '12px 24px', borderRadius: 8, background: 'linear-gradient(135deg, #f97316 0%, #e85d04 100%)',
            border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(249,115,22,0.3)'
          }}
        >
          Save Anyway
        </motion.button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// RIGHT PANEL: STAGE 9 (Review / Edit)
// ------------------------------------------------------------------
function ReviewEditView({ setStage, displayData, onSave, extractionResult }) {
  const [localData, setLocalData] = useState(displayData);
  const [isSaving, setIsSaving] = useState(false);

  // Sync local data if displayData completely changes from upstream (e.g. new file uploaded)
  useEffect(() => {
    setLocalData(displayData);
  }, [displayData]);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      if (onSave) onSave(localData);
      setStage(7);
    }, 1000);
  };

  const updateField = (field, value) => setLocalData(prev => ({ ...prev, [field]: value }));
  const updateLineItem = (idx, val) => {
    const newItems = [...localData.lineItems];
    newItems[idx] = val;
    setLocalData(prev => ({ ...prev, lineItems: newItems }));
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Edit2 size={20} color="#f97316" />
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 }}>Edit Extracted Information</h3>
      </div>

      {/* Editable Fields Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <EditableField icon={Building2} label="Vendor / Company" initialValue={localData.vendor} onChange={v => updateField('vendor', v)} />
        <EditableField icon={Calendar} label="Date" initialValue={localData.date} onChange={v => updateField('date', v)} />
        <EditableField icon={MapPin} label="Address" initialValue={localData.address} onChange={v => updateField('address', v)} />
        <EditableField icon={Hash} label="Invoice / Bill No." initialValue={localData.invoiceNumber} onChange={v => updateField('invoiceNumber', v)} />
        <EditableField icon={IndianRupee} label="Total Amount" initialValue={localData.totalAmount} fullWidth highlight onChange={v => updateField('totalAmount', v)} />
      </div>

      {/* Editable Line Items Scrollable */}
      <div style={{ 
        flex: '0 1 auto', minHeight: 0, maxHeight: 320,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', 
        borderRadius: 12, overflow: 'hidden', marginBottom: 16, display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>Line Items ({localData.lineItems.length})</h4>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 500, color: 'rgba(255,240,220,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Item</th>
                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 500, color: 'rgba(255,240,220,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>Qty</th>
                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 500, color: 'rgba(255,240,220,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>Rate</th>
                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 500, color: 'rgba(255,240,220,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>Amount</th>
                <th style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}></th>
              </tr>
            </thead>
            <tbody>
              {localData.lineItems.map((item, idx) => (
                <EditableRow key={idx} initialItem={item} onChange={v => updateLineItem(idx, v)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky Action Bar (For Review Mode: Complete Review) */}
      <div style={{ 
        marginTop: 'auto', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', 
        borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center'
      }}>
        <motion.button
          onClick={handleSave}
          disabled={isSaving}
          whileHover={!isSaving ? { scale: 1.02 } : {}}
          whileTap={!isSaving ? { scale: 0.98 } : {}}
          style={{ 
            display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #f97316 0%, #e85d04 100%)', 
            border: 'none', borderRadius: 8, padding: '10px 24px', color: '#fff', fontSize: 14, fontWeight: 600, 
            cursor: isSaving ? 'default' : 'pointer', opacity: isSaving ? 0.8 : 1,
            boxShadow: '0 4px 12px rgba(249,115,22,0.3)'
          }}
        >
          {isSaving ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Loader2 size={16} />
              </motion.div>
              Saving...
            </>
          ) : (
            <>
              <Save size={16} /> Save Changes
            </>
          )}
        </motion.button>
      </div>

    </div>
  );
}

function EditableRow({ initialItem, onChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [item, setItem] = useState(initialItem);
  const [draft, setDraft] = useState(initialItem);

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', 
    borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none',
    boxSizing: 'border-box'
  };

  if (isEditing) {
    return (
      <tr style={{ background: 'rgba(249,115,22,0.05)', borderBottom: '1px solid rgba(249,115,22,0.2)' }}>
        <td style={{ padding: '8px 16px' }}>
          <input type="text" value={draft.item} onChange={e => setDraft({...draft, item: e.target.value})} style={inputStyle} />
        </td>
        <td style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}>
          <input type="text" value={draft.qty} onChange={e => setDraft({...draft, qty: e.target.value})} style={inputStyle} />
        </td>
        <td style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}>
          <input type="text" value={draft.rate} onChange={e => setDraft({...draft, rate: e.target.value})} style={inputStyle} />
        </td>
        <td style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}>
          <input type="text" value={draft.amount} onChange={e => setDraft({...draft, amount: e.target.value})} style={inputStyle} />
        </td>
        <td style={{ padding: '8px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
            <button 
              onClick={() => { setItem(draft); setIsEditing(false); if (onChange) onChange(draft); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, width: 28, height: 28, color: '#10b981', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <Check size={14} />
            </button>
            <button 
              onClick={() => { setDraft(item); setIsEditing(false); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, width: 28, height: 28, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <X size={14} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,250,242,0.95)' }}>{item.item}</td>
      <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,250,242,0.95)', whiteSpace: 'nowrap' }}>{item.qty}</td>
      <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,250,242,0.95)', whiteSpace: 'nowrap' }}>{item.rate}</td>
      <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,250,242,0.95)', whiteSpace: 'nowrap' }}>{item.amount}</td>
      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <button 
          onClick={() => setIsEditing(true)}
          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
        >
          <Edit2 size={14} />
        </button>
      </td>
    </tr>
  );
}


function EditableField({ icon: Icon, label, initialValue, isTextarea = false, fullWidth = false, highlight = false, onChange }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [draft, setDraft] = useState(initialValue);
  const textRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    if (textRef.current && !isEditing) {
      setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
  }, [value, isEditing]);

  const expanded = (isHovered && isTruncated) || isEditing;

  const cardStyle = {
    background: isEditing ? 'rgba(249,115,22,0.05)' : (highlight ? 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(232,93,4,0.02) 100%)' : 'rgba(255,255,255,0.03)'), 
    border: isEditing ? '1px solid rgba(249,115,22,0.4)' : (highlight ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(255,255,255,0.06)'), 
    borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, boxSizing: 'border-box'
  };

  const expandedBg = isEditing 
    ? 'rgba(30, 20, 15, 0.98)'
    : (highlight 
      ? 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(232,93,4,0.05) 100%), #18181b' 
      : 'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0.05)), #18181b');

  return (
    <div 
      style={{ gridColumn: fullWidth ? '1 / -1' : 'auto', minWidth: 0, position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Base Card (Hidden when expanded) */}
      <motion.div 
        whileHover={(!expanded && !isEditing) ? { y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)' } : {}}
        style={{ ...cardStyle, opacity: expanded ? 0 : 1 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Icon size={14} color="#f97316" />
            <span style={{ fontSize: 13, color: highlight ? 'rgba(249,115,22,0.9)' : 'rgba(255,240,220,0.6)' }}>{label}</span>
          </div>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
            >
              <Edit2 size={14} />
            </button>
          )}
        </div>
        <div 
          ref={textRef}
          style={{ fontSize: highlight ? 20 : 14, fontWeight: highlight ? 700 : 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {value}
        </div>
      </motion.div>

      {/* Expanded Card */}
      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -4, boxShadow: '0 16px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)' }}
            exit={{ opacity: 0, y: 0, transition: { duration: 0.15 } }}
            style={{ 
              ...cardStyle,
              background: expandedBg,
              position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 50
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Icon size={14} color="#f97316" />
                <span style={{ fontSize: 13, color: highlight ? 'rgba(249,115,22,0.9)' : 'rgba(255,240,220,0.6)' }}>{label}</span>
              </div>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                >
                  <Edit2 size={14} />
                </button>
              )}
            </div>
            
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                {isTextarea ? (
                  <textarea 
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                      padding: '12px 14px', color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                      minHeight: 80, resize: 'vertical', boxSizing: 'border-box'
                    }}
                    autoFocus
                  />
                ) : (
                  <input 
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                      padding: '12px 14px', color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    autoFocus
                  />
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => { setDraft(value); setIsEditing(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '8px 16px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' }}
                  >
                    <X size={14} /> Cancel
                  </button>
                  <button 
                    onClick={() => { setValue(draft); setIsEditing(false); if (onChange) onChange(draft); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', borderRadius: 6, padding: '8px 16px', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}
                  >
                    <Check size={14} /> Save
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: highlight ? 20 : 14, fontWeight: highlight ? 700 : 500, color: '#fff', whiteSpace: 'pre-wrap' }}>
                {value}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


// ------------------------------------------------------------------
// STAGE 11 (Saved Successfully - Full Workspace View)
// ------------------------------------------------------------------
function Stage11SuccessView({ file, resetUpload, displayData }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (file && file.type && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  useEffect(() => {
    setTimeout(() => {
      const scrollArea = document.getElementById('app-scroll-area');
      if (scrollArea) {
        const middleScroll = Math.max(0, (scrollArea.scrollHeight - scrollArea.clientHeight) / 2);
        scrollArea.scrollTo({ top: middleScroll, behavior: 'smooth' });
      }
    }, 100);
  }, []);

  return (
    <div style={{
      width: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 0 40px 0',
      position: 'relative'
    }}>
      {/* Background Glow */}
      <div style={{
        position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 400, background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Success Icon */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'transparent',
        border: '2px solid rgba(249,115,22,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        boxShadow: '0 0 30px rgba(249,115,22,0.4), inset 0 0 16px rgba(249,115,22,0.2)',
        position: 'relative'
      }}>
        <motion.svg 
          width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          style={{ filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.6))' }}
        >
          <motion.polyline points="20 6 9 17 4 12" />
        </motion.svg>
        
        {/* Subtle Particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
            animate={{ 
              scale: [0, 1, 0], opacity: [0, 1, 0],
              x: Math.cos(i * 60 * Math.PI / 180) * 50,
              y: Math.sin(i * 60 * Math.PI / 180) * 50
            }}
            transition={{ duration: 1.5, delay: 0.2 + i * 0.1, repeat: Infinity, repeatDelay: 3 }}
            style={{
              position: 'absolute', width: 4, height: 4, borderRadius: '50%',
              background: '#f97316', filter: 'blur(1px)'
            }}
          />
        ))}
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4, textAlign: 'center' }}>
        Saved to your Document Library!
      </h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 20, textAlign: 'center' }}>
        Your document has been saved successfully.
      </p>

      {/* Document Summary Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        style={{ 
          width: '100%', maxWidth: 540, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
          borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20,
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)'
        }}
      >
        {/* Top Row: Icon and Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ 
            width: 44, height: 44, borderRadius: 10, background: previewUrl ? '#0d1117' : '#f97316', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            overflow: 'hidden', border: previewUrl ? '1px solid rgba(255,255,255,0.1)' : 'none'
          }}>
            {previewUrl ? (
              <img src={previewUrl} alt="Document thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <ImageIcon size={20} color="#fff" />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{file?.name || 'Document'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 11, fontWeight: 600 }}>
                <CheckCircle2 size={14} /> Saved
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{displayData?.vendor || 'Unknown Vendor'}</div>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

        {/* Bottom Row: Metadata */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
          <div style={{ display: 'flex', gap: 20, color: 'rgba(255,255,255,0.6)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> {displayData?.date || 'Unknown Date'}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{displayData?.totalAmount || '₹ 0.00'}</span>
          </div>
          <div style={{ color: '#10b981', fontWeight: 500 }}>Saved to Library</div>
        </div>
      </motion.div>

      {/* Information Message */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        style={{ 
          width: '100%', maxWidth: 540, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', 
          borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24
        }}
      >
        <ShieldCheck size={18} color="#f97316" flexShrink={0} />
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.4 }}>
          You can view, edit or download this document anytime from your <span style={{ color: '#f97316', cursor: 'pointer', fontWeight: 500 }}>Document Library</span>.
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        style={{ display: 'flex', gap: 16, marginBottom: 24 }}
      >
        <motion.button 
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
          whileTap={{ scale: 0.98 }}
          style={{ 
            display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', 
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '12px 24px',
            color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          View Document
        </motion.button>
        <motion.button 
          onClick={resetUpload}
          whileHover={{ scale: 1.02, boxShadow: '0 8px 20px rgba(249,115,22,0.4)' }}
          whileTap={{ scale: 0.98 }}
          style={{ 
            display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #f97316 0%, #e85d04 100%)', 
            border: 'none', borderRadius: 8, padding: '12px 24px',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(249,115,22,0.3)'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          Process Another
        </motion.button>
      </motion.div>

      {/* Tip Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 'auto' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>
        <span style={{ color: '#f97316', fontWeight: 500 }}>Tip:</span> Upload more documents to keep organized.
      </motion.div>
    </div>
  );
}
