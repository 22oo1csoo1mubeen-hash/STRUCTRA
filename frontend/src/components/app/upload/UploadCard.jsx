import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, AlertCircle } from 'lucide-react';
import Stage2View from './Stage2View';
import ProcessingWorkspace from './ProcessingWorkspace';
import ExtractionResultWorkspace from './ExtractionResultWorkspace';

/**
 * UploadCard
 * True glassmorphism card — transparent with blur, warm background shows through.
 * Orange top + bottom border. Dashed orange inner border on drop zone.
 */
export default function UploadCard({ stage, setStage, file, uploadedDocument, error, onFilesSelected, onRemoveFile, onProcessDocument, resetUpload, extractionResult, extractionError, onRetryExtraction, validationResult, validationError, onRetryValidation }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && onFilesSelected) onFilesSelected(files);
  }, [onFilesSelected]);

  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0 && onFilesSelected) onFilesSelected(files);
  }, [onFilesSelected]);

  return (
    <div
      style={{ padding: '0 28px', marginTop: 14 }}
    >
      <input
        ref={fileInputRef}
        type="file"
        id="file-upload-input"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileInput}
        style={{ display: 'none' }}
        aria-label="File upload"
      />

      <motion.div
        layout
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={{
          background: isDragOver
            ? 'rgba(249,115,22,0.07)'
            : 'rgba(255,255,255,0.07)',
        }}
        transition={{ duration: 0.18 }}
        style={{
          width: '100%',
          borderRadius: 18,
          /* True glassmorphism — instant loading, no opacity animation delay */
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(28px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
          /* Intense orange top + bottom borders + stronger glow */
          borderTop: '1.5px solid rgba(249,115,22,0.65)',
          borderBottom: '1.5px solid rgba(249,115,22,0.65)',
          borderLeft: '1px solid rgba(255,255,255,0.10)',
          borderRight: '1px solid rgba(255,255,255,0.10)',
          boxShadow:
            '0 4px 50px rgba(0,0,0,0.40), inset 0 0 80px rgba(249,115,22,0.12), inset 0 1px 0 rgba(255,255,255,0.20), 0 0 30px rgba(249,115,22,0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: stage >= 7 ? 'flex-start' : 'center',
          padding: stage === 1 ? '48px 40px 42px' : stage >= 7 ? '24px 32px' : '32px 40px',
          cursor: 'default',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Inner sheen — top highlight line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '10%',
            width: '80%',
            height: 1,
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
            pointerEvents: 'none',
          }}
        />

        {/* Dashed inner drop zone border */}
        <div
          style={{
            position: 'absolute',
            inset: 12,
            borderRadius: 12,
            border: isDragOver
              ? '1.5px dashed rgba(249,115,22,0.72)'
              : stage >= 7 
                ? 'none' 
                : '1.5px dashed rgba(249,115,22,0.32)',
            pointerEvents: 'none',
            transition: 'border-color 0.18s ease',
          }}
        />

        {/* Drop radial glow */}
        <AnimatePresence>
          {isDragOver && stage === 1 && (
            <motion.div
              key="glow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(ellipse at center, rgba(249,115,22,0.10) 0%, transparent 65%)',
                pointerEvents: 'none',
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {stage === 1 && (
            <motion.div
              key="stage1"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98, position: 'absolute' }}
              transition={{ duration: 0.2 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              {/* Cloud upload icon with sparkles */}
              <motion.div
                animate={isDragOver ? { scale: 1.08, y: -4 } : { scale: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                style={{
                  marginBottom: 20,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Sparkle dots */}
                <svg
                  width="110"
                  height="86"
                  viewBox="0 0 110 86"
                  fill="none"
                  aria-hidden="true"
                  style={{ position: 'absolute' }}
                >
                  <circle cx="20"  cy="16" r="3"   fill="rgba(249,115,22,0.85)" style={{ filter: 'drop-shadow(0 0 6px #f97316)' }} />
                  <circle cx="8"   cy="30" r="2"   fill="rgba(249,115,22,0.55)" />
                  <circle cx="90"  cy="16" r="3"   fill="rgba(249,115,22,0.85)" style={{ filter: 'drop-shadow(0 0 6px #f97316)' }} />
                  <circle cx="102" cy="30" r="2"   fill="rgba(249,115,22,0.55)" />
                  <circle cx="55"  cy="6"  r="2.5" fill="rgba(249,115,22,0.50)" />
                </svg>

                {/* Cloud upload SVG icon */}
                <svg
                  width="68"
                  height="60"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 12px rgba(249,115,22,0.6))' }}
                >
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
              </motion.div>

              {/* Heading */}
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'rgba(255,250,242,0.96)',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  letterSpacing: '-0.01em',
                  marginBottom: 10,
                  textAlign: 'center',
                  textShadow: '0 2px 10px rgba(0,0,0,0.40)',
                }}
              >
                Drag &amp; drop your files here
              </h2>

              {/* "or" */}
              <p
                style={{
                  fontSize: 13,
                  color: 'rgba(255,240,220,0.60)',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  marginBottom: 18,
                }}
              >
                or
              </p>

              {/* Browse Files button - UPGRADED */}
              <motion.button
                id="browse-files-btn"
                aria-label="Browse files"
                onClick={() => fileInputRef.current?.click()}
                whileHover={{
                  scale: 1.05,
                  boxShadow: '0 0 30px rgba(204, 98, 22, 0.5), inset 0 0 12px rgba(241, 154, 23, 0.4)',
                  background: 'linear-gradient(135deg, #e47f2cff 0%, #f85b07ff 100%)',
                }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.15 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 36px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #e69e38ff 0%, #f97316 100%)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 14.5,
                  fontWeight: 700,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(198, 107, 27, 0.35), inset 0 2px 4px rgba(205, 141, 69, 0.4), inset 0 -2px 4px rgba(0,0,0,0.15)',
                  marginBottom: 24,
                  letterSpacing: '0.01em',
                  textShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }}
              >
                <FolderOpen size={18} strokeWidth={2.2} color="#fff" />
                Browse Files
              </motion.button>

              {/* Formats */}
              <p style={{ fontSize: 12.5, color: 'rgba(255,240,220,0.52)', fontFamily: "'Inter', sans-serif", marginBottom: 4, textAlign: 'center' }}>
                Supported formats: PDF, JPG, PNG
              </p>
              <p style={{ fontSize: 12.5, color: 'rgba(255,240,220,0.40)', fontFamily: "'Inter', sans-serif", textAlign: 'center' }}>
                You can upload multiple files at once
              </p>

              {/* Error Message */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: 24, padding: '12px 20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, color: '#fca5a5', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <AlertCircle size={18} />
                  {error}
                </motion.div>
              )}
            </motion.div>
          )}

          {stage === 2 && (
            <motion.div
              key="stage2"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98, position: 'absolute' }}
              transition={{ duration: 0.2 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <Stage2View file={file} onProcessDocument={onProcessDocument} onRemoveFile={onRemoveFile} />
            </motion.div>
          )}

          {stage >= 3 && stage < 7 && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98, position: 'absolute' }}
              transition={{ duration: 0.3 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <ProcessingWorkspace stage={stage} setStage={setStage} file={file} extractionError={extractionError} onRetryExtraction={onRetryExtraction} validationError={validationError} onRetryValidation={onRetryValidation} />
            </motion.div>
          )}

          {stage >= 7 && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98, position: 'absolute' }}
              transition={{ duration: 0.4 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <ExtractionResultWorkspace file={file} uploadedDocument={uploadedDocument} stage={stage} setStage={setStage} resetUpload={resetUpload} extractionResult={extractionResult} validationResult={validationResult} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
