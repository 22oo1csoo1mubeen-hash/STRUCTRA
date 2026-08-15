import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudUploadIcon, AISparkIcon, ShieldValidationIcon, SuccessReadyIcon } from './ProcessingIcons';
import { CheckCircle2, Circle, FileText, Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';

// --- Checklist Items ---
const STAGE4_STEPS = [
  "Document uploaded",
  "Reading document",
  "Extracting information",
  "Validating results"
];

const STAGE5_STEPS = [
  "Information extracted",
  "Structure validated",
  "Checking calculations",
  "Checking duplicates"
];

const STAGE4_MESSAGES = [
  "Reading document...",
  "Extracting key information...",
  "Identifying important fields...",
  "Structuring extracted information..."
];

export default function ProcessingWorkspace({ stage, setStage, file, extractionError, onRetryExtraction, validationError, onRetryValidation }) {
  const workspaceRef = useRef(null);
  // Stage 3 progress
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Stage 4 state
  const [processingStep, setProcessingStep] = useState(0); // 0 to 4
  const [processingMsgIdx, setProcessingMsgIdx] = useState(0);

  // Stage 5 state
  const [validationStep, setValidationStep] = useState(0); // 0 to 4

  // --- Mock Timing Controller ---
  useEffect(() => {
    // Auto-scroll smooth animation to the bottom of the workspace so the card appears fully
    setTimeout(() => {
      const scrollArea = document.getElementById('app-scroll-area');
      if (scrollArea) {
        scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' });
      } else if (workspaceRef.current) {
        workspaceRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 60);

    let timer;
    if (stage === 3) {
      const startTime = Date.now();
      const duration = 4000;
      
      const animateProgress = () => {
        const elapsed = Date.now() - startTime;
        const rawProgress = Math.min((elapsed / duration) * 100, 100);
        const easeOut = 1 - Math.pow(1 - rawProgress / 100, 3);
        setUploadProgress(Math.round(easeOut * 100));

        if (elapsed < duration) {
          requestAnimationFrame(animateProgress);
        }
      };
      requestAnimationFrame(animateProgress);
    } 
    else if (stage === 4) {
      if (extractionError) return; // Stop timer if there is an error
      const interval = setInterval(() => {
        setProcessingStep(prev => prev < 4 ? prev + 1 : prev);
      }, 1500);
      return () => clearInterval(interval);
    }
    else if (stage === 5) {
      if (validationError) return;
      const interval = setInterval(() => {
        setValidationStep(prev => prev < 4 ? prev + 1 : prev);
      }, 1250);
      return () => clearInterval(interval);
    }
    else if (stage === 6) {
      // Document Ready transition to Stage 8 (Validation Results router)
      timer = setTimeout(() => setStage(8), 2000);
    }
    return () => clearTimeout(timer);
  }, [stage, setStage]);

  // Stage 3 -> 4 Transition
  useEffect(() => {
    if (stage === 3 && uploadProgress === 100) {
      // BACKEND INTEGRATION 1: Isolate mock transition so extraction isn't triggered
      // TODO (Integration 2): Replace with actual real extraction request
      // const t = setTimeout(() => setStage(4), 800);
      // return () => clearTimeout(t);
    }
  }, [stage, uploadProgress, setStage]);

  // Stage 4 -> 5 Transition
  useEffect(() => {
    if (stage === 4) {
      setProcessingMsgIdx(Math.min(processingStep, STAGE4_MESSAGES.length - 1));
      if (processingStep >= 4) {
        // BACKEND INTEGRATION 1: Isolate mock transition
        // const t = setTimeout(() => setStage(5), 800);
        // return () => clearTimeout(t);
      }
    }
  }, [stage, processingStep, setStage]);

  // Stage 5 -> 6 Transition
  useEffect(() => {
    if (stage === 5 && validationStep >= 4) {
      // BACKEND INTEGRATION 1: Isolate mock transition
      // const t = setTimeout(() => setStage(6), 1200);
      // return () => clearTimeout(t);
    }
  }, [stage, validationStep, setStage]);

  // --- Document Preview Props ---
  const isImage = file?.type?.startsWith('image/');
  const previewUrl = useMemo(() => isImage && file ? URL.createObjectURL(file) : null, [file, isImage]);
  const fileTypeStr = file?.name?.split('.').pop()?.toUpperCase() || 'FILE';
  const sizeStr = file ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : '0 MB';

  // --- Header Text Logic ---
  let title = "Uploading document...";
  let subtitle = "Your document is being uploaded securely to STRUCTRA.";
  if (stage === 3 && uploadProgress === 100) {
    subtitle = "Upload complete. Preparing for AI processing...";
  } else if (stage === 3) {
    subtitle = "Secure and encrypted upload in progress...";
  } else if (stage === 4) {
    if (extractionError) {
      title = "Processing Failed";
      subtitle = "We encountered an issue while extracting information.";
    } else {
      title = "AI Processing...";
      subtitle = STAGE4_MESSAGES[processingMsgIdx] || "STRUCTRA AI is analyzing your document.";
    }
  } else if (stage === 5) {
    if (validationError) {
      title = "Validation Failed";
      subtitle = "We encountered an issue while validating the document.";
    } else {
      title = "Validating document...";
      subtitle = validationStep >= 4 ? "Validation complete. Preparing your results..." : "We're validating the extracted information to ensure accuracy.";
    }
  } else if (stage === 6) {
    title = "Document Ready";
    subtitle = "Your document has been processed successfully.";
  }

  return (
    <div ref={workspaceRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Top Animated Icon Container */}
      <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <AnimatePresence mode="wait">
          {stage === 3 && <CloudUploadIcon key="icon3" />}
          {stage === 4 && <AISparkIcon key="icon4" />}
          {stage === 5 && <ShieldValidationIcon key="icon5" />}
          {stage >= 6 && <SuccessReadyIcon key="icon6" />}
        </AnimatePresence>
      </div>

      {/* Header Text */}
      <div style={{ height: 70, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <AnimatePresence mode="wait">
          <motion.h2
            key={title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,250,242,0.96)', margin: 0, letterSpacing: '-0.01em', textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}
          >
            {title}
          </motion.h2>
        </AnimatePresence>
        
        <AnimatePresence mode="wait">
          <motion.p
            key={subtitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ fontSize: 13.5, color: 'rgba(255,240,220,0.6)', margin: '8px 0 0 0' }}
          >
            {subtitle}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Persistent Mini Document Card */}
      <AnimatePresence>
        {stage < 6 && (
          <motion.div 
            initial={{ opacity: 1, scale: 1, height: 'auto' }}
            exit={{ opacity: 0, scale: 0.95, height: 0, marginTop: 0, overflow: 'hidden' }}
            transition={{ duration: 0.3 }}
            style={{
              width: '100%', maxWidth: 460, background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12,
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16,
              marginTop: 24, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 30px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{
              width: 48, height: 56, borderRadius: 8,
              background: previewUrl ? '#1a1a1a' : 'linear-gradient(135deg, #f97316 0%, #e85d04 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(249,115,22,0.25)', position: 'relative', overflow: 'hidden'
            }}>
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
              ) : (
                <FileText size={24} color="#fff" />
              )}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <h4 style={{ fontSize: 14.5, fontWeight: 600, color: 'rgba(255,250,242,0.95)', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {file?.name || 'Document'}
              </h4>
              <p style={{ fontSize: 12.5, color: 'rgba(255,240,220,0.5)', margin: 0 }}>
                {fileTypeStr} • {sizeStr}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Bottom Section (Progress Bar OR Checklist) */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 460, marginTop: 32, minHeight: stage >= 6 ? 80 : 180 }}>
        <AnimatePresence mode="wait">
          
          {/* STAGE 3: Progress Bar */}
          {stage === 3 && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15, position: 'absolute', width: '100%' }}
              transition={{ duration: 0.4 }}
              style={{ width: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,240,220,0.7)', fontWeight: 500 }}>Uploading...</span>
                <span style={{ fontSize: 13, color: '#f97316', fontWeight: 700 }}>{uploadProgress}%</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <motion.div
                  style={{ height: '100%', background: 'linear-gradient(90deg, #f97316 0%, #fca5a5 100%)', borderRadius: 3, boxShadow: '0 0 10px rgba(249,115,22,0.5)' }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
              </div>
            </motion.div>
          )}

          {/* STAGE 4: Processing Checklist or Error */}
          {stage === 4 && (
            <motion.div
              key="checklist4"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15, position: 'absolute', width: '100%' }}
              transition={{ duration: 0.4 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {extractionError ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <div style={{ 
                    padding: '12px 20px', background: 'rgba(239, 68, 68, 0.1)', 
                    border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, 
                    color: '#fca5a5', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 10, width: '100%' 
                  }}>
                    <AlertCircle size={18} />
                    {extractionError}
                  </div>
                  <motion.button
                    onClick={onRetryExtraction}
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: '10px 24px', borderRadius: 8, background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 14, 
                      fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                    }}
                  >
                    <RefreshCw size={16} /> Retry Extraction
                  </motion.button>
                </div>
              ) : (
                STAGE4_STEPS.map((step, idx) => {
                  const isComplete = processingStep > idx;
                  const isActive = processingStep === idx;
                  return (
                    <ChecklistItem key={idx} step={step} isComplete={isComplete} isActive={isActive} />
                  );
                })
              )}
            </motion.div>
          )}

          {/* STAGE 5: Validation Checklist */}
          {stage === 5 && (
            <motion.div
              key="checklist5"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15, position: 'absolute', width: '100%' }}
              transition={{ duration: 0.4 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {validationError ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <div style={{ 
                    padding: '12px 20px', background: 'rgba(239, 68, 68, 0.1)', 
                    border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, 
                    color: '#fca5a5', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 10, width: '100%' 
                  }}>
                    <AlertCircle size={18} />
                    {validationError}
                  </div>
                  <motion.button
                    onClick={onRetryValidation}
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: '10px 24px', borderRadius: 8, background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 14, 
                      fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                    }}
                  >
                    <RefreshCw size={16} /> Retry Validation
                  </motion.button>
                </div>
              ) : (
                STAGE5_STEPS.map((step, idx) => {
                  const isComplete = validationStep > idx;
                  const isActive = validationStep === idx;
                  return (
                    <ChecklistItem key={idx} step={step} isComplete={isComplete} isActive={isActive} isSuccess={true} />
                  );
                })
              )}
            </motion.div>
          )}

          {/* STAGE 6: Preparing Results loader */}
          {stage >= 6 && (
            <motion.div
              key="preparing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15, position: 'absolute', width: '100%' }}
              transition={{ duration: 0.4 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 20 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{ width: 28, height: 28, position: 'relative', marginBottom: 16 }}
              >
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    top: 0, left: '50%',
                    width: 4, height: 4,
                    marginLeft: -2,
                    background: i === 0 ? '#f97316' : 'rgba(249,115,22,0.3)',
                    borderRadius: '50%',
                    transformOrigin: '50% 14px',
                    transform: `rotate(${i * 60}deg)`
                  }} />
                ))}
              </motion.div>
              <p style={{ fontSize: 14.5, color: 'rgba(255,240,220,0.6)', margin: 0 }}>
                Preparing your results...
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}

// Helper for Checklist Items
function ChecklistItem({ step, isComplete, isActive, isSuccess = false }) {
  const iconColor = isComplete ? (isSuccess ? '#10b981' : '#f97316') : isActive ? '#f97316' : 'rgba(255,240,220,0.3)';
  const textColor = isComplete || isActive ? 'rgba(255,250,242,0.95)' : 'rgba(255,240,220,0.4)';
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      style={{ display: 'flex', alignItems: 'center', gap: 14 }}
    >
      <div style={{ position: 'relative', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isComplete ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
            <CheckCircle2 size={20} color={iconColor} strokeWidth={2.5} style={{ filter: `drop-shadow(0 0 6px ${iconColor}80)` }} />
          </motion.div>
        ) : isActive ? (
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Circle size={16} color={iconColor} fill={iconColor} style={{ filter: `drop-shadow(0 0 6px ${iconColor}A0)` }} />
          </motion.div>
        ) : (
          <Circle size={16} color={iconColor} strokeWidth={2} />
        )}
      </div>
      <span style={{ fontSize: 14.5, fontWeight: isActive ? 600 : 500, color: textColor, transition: 'color 0.3s ease' }}>
        {step}
      </span>
    </motion.div>
  );
}
