import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Image as ImageIcon, CheckCircle2, RefreshCw, RefreshCcw, ZoomIn, ZoomOut, Maximize, Maximize2,
  Download, Search, Sparkles, Building2, Calendar, MapPin, Hash, IndianRupee, 
  List, ArrowRight, Minus, Plus, AlertTriangle, AlertCircle, X, Check, Save,
  FileDown, Trash2, Edit2, ShieldCheck, Info, Loader2
} from 'lucide-react';

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
  totalAmount: "₹ 1,365.00",
  totalInWords: "One Thousand Three Hundred Sixty Five Rupees Only",
  lineItems: [
    { item: "Aashirvaad Atta 5kg", qty: 1, rate: "₹289.00", amount: "₹289.00" },
    { item: "Amul Toned Milk 1L", qty: 2, rate: "₹63.00", amount: "₹126.00" },
    { item: "Rice 1kg", qty: 1, rate: "₹78.00", amount: "₹78.00" },
    { item: "Fortune Sunflower Oil 1L", qty: 1, rate: "₹145.00", amount: "₹145.00" },
    { item: "Tata Tea Premium 250g", qty: 1, rate: "₹110.00", amount: "₹110.00" },
  ]
};

const MOCK_VALIDATION = {
  calculatedTotal: "₹ 1,361.00",
  documentTotal: "₹ 1,365.00",
  difference: "₹ 4.00"
};

export default function ExtractionResultWorkspace({ file, stage, setStage, resetUpload }) {
  // Use state so we can mock/switch scenarios
  const [validationCase, setValidationCase] = useState('REVIEW_RECOMMENDED');
  const displayFilename = file?.name || MOCK_RESULT.filename;
  const displayType = file?.name?.split('.').pop()?.toUpperCase() || MOCK_RESULT.fileType;
  const displaySize = file ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : MOCK_RESULT.fileSize;
  
  const now = new Date();
  const dateOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  const formattedDate = now.toLocaleDateString('en-GB', dateOptions);
  const formattedTime = now.toLocaleTimeString('en-US', timeOptions);
  const realtimeProcessedAt = `${formattedDate}, ${formattedTime}`;

  // Dynamic Routing Logic based on ACTIVE_SCENARIO
  useEffect(() => {
    
    if (stage === 8) {
      if (validationCase === 'VALID') {
        const t = setTimeout(() => setStage(7), 3500); 
        return () => clearTimeout(t);
      }
      else if (validationCase === 'REVIEW_RECOMMENDED') {
        const t = setTimeout(() => setStage(9), 3500); 
        return () => clearTimeout(t);
      }
      else if (validationCase === 'POSSIBLE_DUPLICATE') {
        const t = setTimeout(() => setStage(10), 3500); 
        return () => clearTimeout(t);
      }
    }
  }, [stage, setStage]);

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
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
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

        {/* Top Right Action Button */}
        {stage === 7 || stage === 11 ? (
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
        ) : stage !== 10 ? (
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

      {/* Main Layout Conditional */}
      {stage < 11 ? (
        <div style={{ display: 'flex', gap: 24, width: '100%', alignItems: 'stretch', paddingBottom: 16 }}>
        
        {/* Left Column: Document Preview */}
        <div style={{ 
          flex: '0 0 42%', 
          background: 'rgba(10,12,16,0.5)', 
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 16,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)'
        }}>
          {/* Preview Header */}
          <div style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
            padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>Document Preview</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden' }}>
                <button style={{ background: 'transparent', border: 'none', padding: '6px 10px', color: '#fff', cursor: 'pointer' }}><Minus size={14} /></button>
                <span style={{ fontSize: 13, color: '#fff', padding: '0 8px', fontWeight: 500 }}>80%</span>
                <button style={{ background: 'transparent', border: 'none', padding: '6px 10px', color: '#fff', cursor: 'pointer' }}><Plus size={14} /></button>
              </div>
              <button style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '6px', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>
                <Maximize size={16} />
              </button>
            </div>
          </div>

          {/* Preview Body (Mock Receipt) */}
          <div style={{ 
            flex: 1, 
            background: '#0d1117', 
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            padding: 32,
            overflowY: 'auto',
            minHeight: 400
          }}>
            <div style={{ 
              background: '#f4ecd8',
              width: '100%', maxWidth: 320,
              padding: '24px 20px',
              color: '#333', fontFamily: 'monospace',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              border: '1px solid #e0d8c3',
              borderRadius: 2
            }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 24, fontWeight: 'bold', margin: '0 0 4px 0', letterSpacing: 1 }}>ABC MART</h2>
                <p style={{ fontSize: 12, margin: 0 }}>123 Green Street,</p>
                <p style={{ fontSize: 12, margin: 0 }}>Bangalore, Karnataka - 560001</p>
                <p style={{ fontSize: 12, margin: 0 }}>Ph: 080-12345678</p>
              </div>
              
              <div style={{ borderBottom: '1px dashed #999', paddingBottom: 12, marginBottom: 12 }}>
                <table style={{ width: '100%', fontSize: 11 }}>
                  <tbody>
                    <tr><td style={{ width: 80 }}>Invoice No</td><td>: {MOCK_RESULT.invoiceNumber}</td></tr>
                    <tr><td>Date</td><td>: {MOCK_RESULT.date}, 11:23 AM</td></tr>
                    <tr><td>Cashier</td><td>: Ramesh</td></tr>
                  </tbody>
                </table>
              </div>

              <table style={{ width: '100%', fontSize: 11, marginBottom: 12, borderBottom: '1px dashed #999', paddingBottom: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ paddingBottom: 8 }}>Item</th>
                    <th style={{ paddingBottom: 8 }}>Qty</th>
                    <th style={{ paddingBottom: 8 }}>Rate</th>
                    <th style={{ paddingBottom: 8, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_RESULT.lineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ paddingBottom: 4 }}>{item.item}</td>
                      <td style={{ paddingBottom: 4 }}>{item.qty}</td>
                      <td style={{ paddingBottom: 4 }}>{item.rate}</td>
                      <td style={{ paddingBottom: 4, textAlign: 'right' }}>{item.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span>Subtotal</span>
                <span>{MOCK_VALIDATION.documentTotal}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 12, borderBottom: '1px dashed #999', paddingBottom: 12 }}>
                <span>Tax (18%)</span>
                <span>209.00</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 'bold', marginBottom: 24 }}>
                <span>TOTAL</span>
                <span>₹ {MOCK_RESULT.totalAmount}</span>
              </div>

              <div style={{ fontSize: 11, textAlign: 'center' }}>
                <p style={{ margin: '0 0 8px 0', textAlign: 'left' }}>Paid via : UPI</p>
                <p style={{ margin: 0 }}>Thank you! Visit Again.</p>
              </div>
            </div>
          </div>
          
          <div style={{ 
            padding: 16, background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', justifyContent: 'center', gap: 24
          }}>
            <button style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <Download size={14} /> Download Original
            </button>
            <button style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <Maximize2 size={14} /> Zoom
            </button>
          </div>
        </div>

        {/* Right Column: Dynamic Content Based on Stage */}
        <AnimatePresence mode="wait">
          {stage === 10 ? (
            <motion.div
              key="stage10"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <DuplicateWarningView setStage={setStage} />
            </motion.div>
          ) : stage === 9 ? (
            <motion.div
              key="stage9"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <ReviewEditView setStage={setStage} />
            </motion.div>
          ) : stage >= 7 ? (
            <motion.div
              key="stage78"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <ExtractionResultsRightPanel stage={stage} setStage={setStage} validationCase={validationCase} resetUpload={resetUpload} />
            </motion.div>
          ) : null}
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
              <Stage11SuccessView setStage={setStage} file={file} resetUpload={resetUpload} />
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
function ExtractionResultsRightPanel({ stage, setStage, validationCase, resetUpload }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={20} color="#f97316" />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 }}>Extracted Information</h3>
        </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            Confidence: <span style={{ color: '#10b981', fontWeight: 600, marginLeft: 4 }}>{MOCK_RESULT.confidence}</span>
            <svg width="24" height="12" style={{ marginLeft: 8 }}>
              <polyline points="0,10 6,4 12,8 20,2" fill="none" stroke="#10b981" strokeWidth="1.5" />
              <polyline points="20,2 24,0" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.3" />
            </svg>
          </div>
        </div>

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <InfoCard icon={Building2} label="Vendor / Company" value={MOCK_RESULT.vendor} />
        <InfoCard icon={Calendar} label="Date" value={MOCK_RESULT.date} />
        <InfoCard icon={MapPin} label="Address" value={MOCK_RESULT.address} />
        <InfoCard icon={Hash} label="Invoice / Bill No." value={MOCK_RESULT.invoiceNumber} />
        {stage !== 8 && (
          <InfoCard icon={IndianRupee} label="Total Amount" value={MOCK_RESULT.totalAmount} fullWidth highlight />
        )}
      </div>

      {/* Stage 8 Validation Card - Dynamic Based on Scenario */}
      <AnimatePresence mode="wait">
        {stage >= 8 && stage !== 11 && (
          <motion.div 
            key="validation"
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }}
            style={{ marginBottom: 16 }}
          >
              {validationCase === 'VALID' ? (
                // SUCCESS STATE
                <div style={{ 
                  background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', 
                  borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
                  boxShadow: 'inset 0 0 20px rgba(16,185,129,0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShieldCheck size={18} color="#10b981" />
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: '#10b981', margin: 0 }}>Validation Results</h4>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle2 size={20} color="#10b981" />
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>Document is Valid</span>
                  </div>
  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'rgba(255,250,242,0.85)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={14} color="#10b981" />
                      <span>Document structure is valid</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={14} color="#10b981" />
                      <span>All calculations are correct</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={14} color="#10b981" />
                      <span>No duplicates detected</span>
                    </div>
                  </div>
                </div>
              ) : validationCase === 'REVIEW_RECOMMENDED' ? (
                // WARNING STATE
                <div style={{ 
                  background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', 
                  borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
                  boxShadow: 'inset 0 0 20px rgba(245,158,11,0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertTriangle size={18} color="#f59e0b" />
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: '#f59e0b', margin: 0 }}>Validation Results</h4>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertCircle size={20} color="#f59e0b" />
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>Review Recommended</span>
                  </div>
  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'rgba(255,250,242,0.85)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', border: '1.5px solid #f59e0b' }} />
                      <span>Line item total: {MOCK_VALIDATION.calculatedTotal}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', border: '1.5px solid #f59e0b' }} />
                      <span>Document total: {MOCK_VALIDATION.documentTotal}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', border: '1.5px solid #f59e0b' }} />
                      <span>Difference: {MOCK_VALIDATION.difference}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', border: '1.5px solid #f59e0b' }} />
                      <span>Please review the highlighted fields.</span>
                    </div>
                  </div>
                </div>
              ) : validationCase === 'POSSIBLE_DUPLICATE' ? (
                // DUPLICATE STATE
                <div style={{ 
                  background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', 
                  borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
                  boxShadow: 'inset 0 0 20px rgba(59,130,246,0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShieldCheck size={18} color="#3b82f6" />
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: '#3b82f6', margin: 0 }}>Validation Results</h4>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertCircle size={20} color="#3b82f6" />
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>Possible Duplicate</span>
                  </div>
  
                  <div style={{ fontSize: 13, color: 'rgba(255,250,242,0.85)', lineHeight: 1.5 }}>
                    This document appears similar to an existing document.
                  </div>
                </div>
              ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable Line Items in Result - Only show in stage 7 and 11 */}
      <AnimatePresence>
        {(stage === 7 || stage === 11) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              flex: 1, minHeight: 0,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', 
              borderRadius: 12, overflow: 'hidden', marginBottom: stage === 7 ? 16 : 0, display: 'flex', flexDirection: 'column'
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>Line Items ({MOCK_RESULT.lineItems.length})</h4>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'rgba(255,240,220,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Item</th>
                    <th style={{ padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'rgba(255,240,220,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Qty</th>
                    <th style={{ padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'rgba(255,240,220,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Rate</th>
                    <th style={{ padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'rgba(255,240,220,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_RESULT.lineItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: 'rgba(255,250,242,0.95)' }}>{item.item}</td>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: 'rgba(255,250,242,0.95)' }}>{item.qty}</td>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: 'rgba(255,250,242,0.95)' }}>{item.rate}</td>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: 'rgba(255,250,242,0.95)' }}>{item.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Page (Stage 7) - Sticky Action Bar */}
      {stage === 7 && (
        <div style={{ 
          marginTop: 'auto', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', 
          borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button 
              whileHover={{ color: '#10b981' }}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, transition: 'color 0.2s' }}
            >
              <FileDown size={16} /> Export
            </motion.button>
            <motion.button 
              whileHover={{ color: '#ef4444' }}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, transition: 'color 0.2s' }}
            >
              <Trash2 size={16} /> Delete
            </motion.button>
            <motion.button 
              onClick={resetUpload} 
              whileHover={{ color: '#fff' }}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, transition: 'color 0.2s', textAlign: 'left' }}
            >
              <RefreshCcw size={16} /> 
              <div style={{ lineHeight: 1.2 }}>Process<br/>Another</div>
            </motion.button>
          </div>
          <motion.button
            onClick={() => setStage(11)}
            whileHover={{ scale: 1.02, boxShadow: '0 8px 20px rgba(249,115,22,0.4)' }}
            whileTap={{ scale: 0.98 }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #f97316 0%, #e85d04 100%)', 
              border: 'none', borderRadius: 8, padding: '10px 24px', color: '#fff', fontSize: 14, fontWeight: 600, 
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(249,115,22,0.3)', marginLeft: 8
            }}
          >
            <Save size={16} /> Save to Library
          </motion.button>
        </div>
      )}

    </div>
  );
}

function InfoCard({ icon: Icon, label, value, fullWidth = false, highlight = false }) {
  const [isHovered, setIsHovered] = useState(false);
  const textRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    if (textRef.current) {
      setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
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
function DuplicateWarningView({ setStage, resetUpload }) {
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
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>ABC MART</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            <span>09 Aug 2025</span>
            <span>₹ 1,365.00</span>
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
function ReviewEditView({ setStage }) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setStage(7);
    }, 1000);
  };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Edit2 size={20} color="#f97316" />
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 }}>Edit Extracted Information</h3>
      </div>

      {/* Editable Fields Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <EditableField icon={Building2} label="Vendor / Company" initialValue={MOCK_RESULT.vendor} />
        <EditableField icon={Calendar} label="Date" initialValue={MOCK_RESULT.date} />
        <EditableField icon={MapPin} label="Address" initialValue={MOCK_RESULT.address} />
        <EditableField icon={Hash} label="Invoice / Bill No." initialValue={MOCK_RESULT.invoiceNumber} />
        <EditableField icon={IndianRupee} label="Total Amount" initialValue={MOCK_RESULT.totalAmount} fullWidth highlight />
      </div>

      {/* Editable Line Items Scrollable */}
      <div style={{ 
        flex: 1, minHeight: 0,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', 
        borderRadius: 12, overflow: 'hidden', marginBottom: 16, display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>Line Items ({MOCK_RESULT.lineItems.length})</h4>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'rgba(255,240,220,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Item</th>
                <th style={{ padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'rgba(255,240,220,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Qty</th>
                <th style={{ padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'rgba(255,240,220,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Rate</th>
                <th style={{ padding: '10px 20px', fontSize: 11, fontWeight: 500, color: 'rgba(255,240,220,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Amount</th>
                <th style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}></th>
              </tr>
            </thead>
            <tbody>
              {MOCK_RESULT.lineItems.map((item, idx) => (
                <EditableRow key={idx} initialItem={item} />
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

function EditableRow({ initialItem }) {
  const [isEditing, setIsEditing] = useState(false);
  const [item, setItem] = useState(initialItem);
  const [draft, setDraft] = useState(initialItem);

  const inputStyle = {
    width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', 
    borderRadius: 4, padding: '6px 8px', color: '#fff', fontSize: 13, outline: 'none'
  };

  if (isEditing) {
    return (
      <tr style={{ background: 'rgba(249,115,22,0.05)', borderBottom: '1px solid rgba(249,115,22,0.2)' }}>
        <td style={{ padding: '8px 20px' }}>
          <input type="text" value={draft.item} onChange={e => setDraft({...draft, item: e.target.value})} style={inputStyle} />
        </td>
        <td style={{ padding: '8px 20px' }}>
          <input type="text" value={draft.qty} onChange={e => setDraft({...draft, qty: e.target.value})} style={inputStyle} />
        </td>
        <td style={{ padding: '8px 20px' }}>
          <input type="text" value={draft.rate} onChange={e => setDraft({...draft, rate: e.target.value})} style={inputStyle} />
        </td>
        <td style={{ padding: '8px 20px' }}>
          <input type="text" value={draft.amount} onChange={e => setDraft({...draft, amount: e.target.value})} style={inputStyle} />
        </td>
        <td style={{ padding: '8px 20px', textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button 
            onClick={() => { setItem(draft); setIsEditing(false); }}
            style={{ background: 'rgba(16,185,129,0.15)', border: 'none', borderRadius: 4, padding: '4px 6px', color: '#10b981', cursor: 'pointer' }}
          >
            <Check size={14} />
          </button>
          <button 
            onClick={() => { setDraft(item); setIsEditing(false); }}
            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 4, padding: '4px 6px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <td style={{ padding: '12px 20px', fontSize: 13, color: 'rgba(255,250,242,0.95)' }}>{item.item}</td>
      <td style={{ padding: '12px 20px', fontSize: 13, color: 'rgba(255,250,242,0.95)' }}>{item.qty}</td>
      <td style={{ padding: '12px 20px', fontSize: 13, color: 'rgba(255,250,242,0.95)' }}>{item.rate}</td>
      <td style={{ padding: '12px 20px', fontSize: 13, color: 'rgba(255,250,242,0.95)' }}>{item.amount}</td>
      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
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


function EditableField({ icon: Icon, label, initialValue, isTextarea = false, fullWidth = false, highlight = false }) {
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
    borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12,
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
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {isTextarea ? (
                  <textarea 
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    style={{
                      flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                      padding: '8px 12px', color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                      minHeight: 60, resize: 'vertical'
                    }}
                    autoFocus
                  />
                ) : (
                  <input 
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    style={{
                      flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                      padding: '8px 12px', color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none'
                    }}
                    autoFocus
                  />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button 
                    onClick={() => { setValue(draft); setIsEditing(false); }}
                    style={{ background: 'rgba(16,185,129,0.15)', border: 'none', borderRadius: 4, padding: 6, color: '#10b981', cursor: 'pointer' }}
                  >
                    <Check size={14} />
                  </button>
                  <button 
                    onClick={() => { setDraft(value); setIsEditing(false); }}
                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 4, padding: 6, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                  >
                    <X size={14} />
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
function Stage11SuccessView({ setStage, file, resetUpload }) {
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
            width: 44, height: 44, borderRadius: 10, background: '#f97316', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
          }}>
            <ImageIcon size={20} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{file?.name || MOCK_RESULT.filename}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 11, fontWeight: 600 }}>
                <CheckCircle2 size={14} /> Saved
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{MOCK_RESULT.vendor}</div>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

        {/* Bottom Row: Metadata */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
          <div style={{ display: 'flex', gap: 20, color: 'rgba(255,255,255,0.6)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> {MOCK_RESULT.date}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{MOCK_RESULT.totalAmount}</span>
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
