import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Minus, Plus, Maximize, Download, X, AlertCircle, Loader2, FileText, ImageIcon, RotateCcw
} from 'lucide-react';
import { downloadDocument } from '../../../api/documents';

/**
 * DocumentPreviewViewer
 * Production-quality interactive Document Viewer for STRUCTRA.
 * Features:
 * - Perfectly centered image positioning in both in-panel and Full View modal states
 * - React Portal modal mounting directly onto document.body (completely covers sidebar & top navigation)
 * - Truncated header titles preventing button overlap on long UUID filenames
 * - 360° GPU-accelerated Drag-to-Pan (pan document in any direction without clipping)
 * - Glowing Orange Cursor Dot (#f97316) tracking pointer position
 * - Dynamic grab / grabbing cursor states
 * - Linear smooth zoom scaling (proportional to container fit size)
 * - Robust object URL lifecycle (prevents blob revoking on re-render / broken image icons)
 * - Precision zoom controls (25% to 300% in 10% steps)
 * - Centered single Download Original button in in-panel footer
 * - Fullscreen & Expanded modal viewing mode with ESC key navigation
 */
export default function DocumentPreviewViewer({ file, documentId, className, style }) {
  const [zoom, setZoom] = useState(80);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [isLoadingBlob, setIsLoadingBlob] = useState(false);
  const [imageError, setImageError] = useState(false);

  // 360° Pan offset state (in pixels)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [modalPan, setModalPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Orange Glowing Cursor Dot tracking state
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, show: false });
  const [modalCursorPos, setModalCursorPos] = useState({ x: 0, y: 0, show: false });

  const prevUrlRef = useRef(null);
  const isMouseDownRef = useRef(false);
  const startMouseRef = useRef({ x: 0, y: 0 });
  const startPanRef = useRef({ x: 0, y: 0 });
  const inPanelViewportRef = useRef(null);
  const modalViewportRef = useRef(null);

  // Wheel scroll to zoom (forward/up = zoom in, backward/down = zoom out)
  useEffect(() => {
    const handleWheelZoom = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const step = 10;
      if (e.deltaY < 0) {
        setZoom((prev) => Math.min(300, prev + step));
      } else if (e.deltaY > 0) {
        setZoom((prev) => Math.max(25, prev - step));
      }
    };

    const inPanelEl = inPanelViewportRef.current;
    if (inPanelEl) {
      inPanelEl.addEventListener('wheel', handleWheelZoom, { passive: false });
    }

    return () => {
      if (inPanelEl) {
        inPanelEl.removeEventListener('wheel', handleWheelZoom);
      }
    };
  }, []);

  // Fullscreen Modal wheel zoom listener
  useEffect(() => {
    if (!isFullscreen) return;
    const modalEl = modalViewportRef.current;
    if (!modalEl) return;

    const handleWheelZoom = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const step = 10;
      if (e.deltaY < 0) {
        setZoom((prev) => Math.min(300, prev + step));
      } else if (e.deltaY > 0) {
        setZoom((prev) => Math.max(25, prev - step));
      }
    };

    modalEl.addEventListener('wheel', handleWheelZoom, { passive: false });
    return () => {
      modalEl.removeEventListener('wheel', handleWheelZoom);
    };
  }, [isFullscreen]);

  // File metadata resolution
  const rawFileName = file?.name || (documentId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(documentId) ? documentId : null);
  const fileName = rawFileName || 'Receipt.png';
  const fileType = file?.type || '';
  const isPdf = fileType === 'application/pdf' || /\.pdf$/i.test(fileName);

  // Reset pan offset when document or fullscreen state changes
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setModalPan({ x: 0, y: 0 });
  }, [file, documentId, isFullscreen]);

  // Manage Object URL Lifecycle safely without revoking on re-render
  useEffect(() => {
    let isCancelled = false;
    setImageError(false);

    const safeSetPreview = (url) => {
      if (isCancelled) return;
      if (prevUrlRef.current && prevUrlRef.current !== url) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
      prevUrlRef.current = url;
      setPreviewSrc(url);
    };

    if (file && file instanceof Blob) {
      try {
        const url = URL.createObjectURL(file);
        safeSetPreview(url);
      } catch (err) {
        console.error('[DocumentPreview] Failed to create local blob URL:', err);
      }
    } else if (documentId) {
      setIsLoadingBlob(true);
      downloadDocument(documentId)
        .then(({ blob }) => {
          if (!isCancelled && blob) {
            const url = URL.createObjectURL(blob);
            safeSetPreview(url);
          }
        })
        .catch((err) => {
          console.error('[DocumentPreview] Remote document fetch error:', err);
          if (!isCancelled) setImageError(true);
        })
        .finally(() => {
          if (!isCancelled) setIsLoadingBlob(false);
        });
    } else {
      setPreviewSrc(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [file, documentId]);

  // Revoke object URL only on final component unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = null;
      }
    };
  }, []);

  // Mouse Drag-Pan Handler (360° Translation)
  const handleMouseDown = useCallback((e, isModal = false) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isMouseDownRef.current = true;
    startMouseRef.current = { x: e.clientX, y: e.clientY };
    startPanRef.current = isModal ? { ...modalPan } : { ...pan };
    setIsPanning(true);
  }, [pan, modalPan]);

  // Global mousemove and mouseup listeners for 60fps pan translation
  useEffect(() => {
    if (!isPanning) return;

    const onGlobalMove = (e) => {
      if (!isMouseDownRef.current) return;
      e.preventDefault();
      const dx = e.clientX - startMouseRef.current.x;
      const dy = e.clientY - startMouseRef.current.y;

      if (isFullscreen) {
        setModalPan({
          x: startPanRef.current.x + dx,
          y: startPanRef.current.y + dy
        });
      } else {
        setPan({
          x: startPanRef.current.x + dx,
          y: startPanRef.current.y + dy
        });
      }
    };

    const onGlobalUp = () => {
      isMouseDownRef.current = false;
      setIsPanning(false);
    };

    window.addEventListener('mousemove', onGlobalMove, { passive: false });
    window.addEventListener('mouseup', onGlobalUp);
    return () => {
      window.removeEventListener('mousemove', onGlobalMove);
      window.removeEventListener('mouseup', onGlobalUp);
    };
  }, [isPanning, isFullscreen]);

  // Viewport Hover Cursor Tracking for Orange Glowing Pointer Dot
  const handleViewportMouseMove = (e, isModal = false) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      show: true
    };
    if (isModal) {
      setModalCursorPos(pos);
    } else {
      setCursorPos(pos);
    }
  };

  const handleViewportMouseLeave = (isModal = false) => {
    if (isModal) {
      setModalCursorPos((prev) => ({ ...prev, show: false }));
    } else {
      setCursorPos((prev) => ({ ...prev, show: false }));
    }
  };

  // Zoom Stepper Handlers (Min 25%, Max 300%, Step 10%)
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(300, prev + 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(25, prev - 10));
  }, []);

  // Keyboard navigation: Escape key exits fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Download Original Document handler
  const handleDownloadOriginal = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadError(null);

    try {
      if (documentId) {
        const { blob, filename } = await downloadDocument(documentId);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (file && file instanceof Blob) {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name || fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        throw new Error('No original document file available for download.');
      }
    } catch (err) {
      console.error('[DocumentPreview] Download error:', err);
      setDownloadError(err.message || 'Download failed.');
      setTimeout(() => setDownloadError(null), 4000);
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const willBeFullscreen = !prev;
      if (willBeFullscreen) {
        setZoom(100);
        setModalPan({ x: 0, y: 0 });
      }
      return willBeFullscreen;
    });
  };

  return (
    <>
      {/* Standard In-Panel Preview Card Container */}
      <motion.div
        style={{
          flex: '0 0 42%',
          background: 'rgba(14, 11, 8, 0.75)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 30px rgba(0,0,0,0.3)',
          minHeight: 0,
          ...style
        }}
        className={className}
      >
        {/* Top Header Bar — Perfectly Aligned & Spaced */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
            gap: 12,
            boxSizing: 'border-box',
            width: '100%'
          }}
        >
          {/* Header Title */}
          <div
            style={{
              fontSize: 14.5,
              fontWeight: 600,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
              flexShrink: 1
            }}
          >
            {isPdf ? (
              <FileText size={17} color="#f97316" style={{ flexShrink: 0 }} />
            ) : (
              <ImageIcon size={17} color="#f97316" style={{ flexShrink: 0 }} />
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Document Preview</span>
          </div>

          {/* Right Header Controls */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexShrink: 0,
              marginLeft: 'auto'
            }}
          >
            {/* Zoom Stepper Glass Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '2px 4px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
            >
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 25}
                aria-label="Zoom out"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '5px 9px',
                  color: zoom <= 25 ? 'rgba(255,255,255,0.25)' : '#fff',
                  cursor: zoom <= 25 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 4,
                  transition: 'background 0.15s'
                }}
              >
                <Minus size={14} />
              </button>

              <span
                style={{
                  fontSize: 12.5,
                  color: '#fff',
                  padding: '0 8px',
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  minWidth: 40,
                  textAlign: 'center',
                  userSelect: 'none'
                }}
              >
                {zoom}%
              </span>

              <button
                onClick={handleZoomIn}
                disabled={zoom >= 300}
                aria-label="Zoom in"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '5px 9px',
                  color: zoom >= 300 ? 'rgba(255,255,255,0.25)' : '#fff',
                  cursor: zoom >= 300 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 4,
                  transition: 'background 0.15s'
                }}
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Fullscreen Icon Button */}
            <button
              onClick={toggleFullscreen}
              aria-label="Enter fullscreen"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '7px 9px',
                borderRadius: 8,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                transition: 'all 0.15s'
              }}
            >
              <Maximize size={15} />
            </button>
          </div>
        </div>

        {/* Viewport Body Container (Centered & 360° Drag Panning) */}
        <div
          ref={inPanelViewportRef}
          onMouseDown={(e) => handleMouseDown(e, false)}
          onMouseMove={(e) => handleViewportMouseMove(e, false)}
          onMouseLeave={() => handleViewportMouseLeave(false)}
          style={{
            flex: 1,
            background: '#090b0e',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
            cursor: isPanning ? 'grabbing' : 'grab',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        >
          {/* Orange Glowing Pointer Dot */}
          {cursorPos.show && (
            <div
              style={{
                position: 'absolute',
                left: cursorPos.x,
                top: cursorPos.y,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#f97316',
                border: '2px solid #ffffff',
                boxShadow: '0 0 16px rgba(249,115,22,0.9), 0 0 8px #f97316',
                pointerEvents: 'none',
                transform: 'translate(-50%, -50%)',
                zIndex: 40,
                transition: isPanning ? 'none' : 'transform 0.05s ease-out'
              }}
            />
          )}

          {isLoadingBlob ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.6)' }}>
              <Loader2 size={24} className="animate-spin" color="#f97316" />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Loading preview...</span>
            </div>
          ) : imageError || (!previewSrc && !file) ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'rgba(255,240,220,0.6)', padding: 30, textAlign: 'center' }}>
              <AlertCircle size={32} color="#f97316" />
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>Unable to preview document</span>
            </div>
          ) : previewSrc ? (
            isPdf ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom / 100})`,
                  transformOrigin: 'center center',
                  transition: isPanning ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <object
                  data={previewSrc}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                  style={{ borderRadius: 8, border: 'none', pointerEvents: 'none' }}
                >
                  <iframe
                    src={previewSrc}
                    title="PDF Document Preview"
                    width="100%"
                    height="100%"
                    style={{ border: 'none', borderRadius: 8, pointerEvents: 'none' }}
                  />
                </object>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '100%',
                  height: '100%',
                  padding: 10
                }}
              >
                <img
                  src={previewSrc}
                  alt="Document Preview"
                  onDragStart={(e) => e.preventDefault()}
                  onError={() => {
                    console.warn('[DocumentPreview] Image load error, attempting fallback recovery');
                    setImageError(true);
                  }}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom / 100})`,
                    transformOrigin: 'center center',
                    transition: isPanning ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                    borderRadius: 4,
                    objectFit: 'contain',
                    pointerEvents: 'none'
                  }}
                />
              </div>
            )
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13.5 }}>No document preview available</div>
          )}
        </div>

        {/* Footer Actions Bar — Centered Download Original Button */}
        <div
          style={{
            padding: '14px 20px',
            background: 'rgba(0,0,0,0.3)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {/* Download Original Button */}
          <button
            onClick={handleDownloadOriginal}
            disabled={isDownloading}
            aria-label="Download original document"
            style={{
              background: 'transparent',
              border: 'none',
              color: isDownloading ? 'rgba(255,255,255,0.5)' : '#fff',
              fontSize: 13.5,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: isDownloading ? 'not-allowed' : 'pointer',
              transition: 'color 0.15s'
            }}
          >
            {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>{isDownloading ? 'Downloading...' : 'Download Original'}</span>
          </button>
        </div>

        {/* Download Error Banner */}
        <AnimatePresence>
          {downloadError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(239,68,68,0.15)',
                borderTop: '1px solid rgba(239,68,68,0.3)',
                padding: '8px 16px',
                color: '#fca5a5',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <AlertCircle size={14} />
              <span>{downloadError}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Expanded Fullscreen Glassmorphism Viewer Modal rendered directly in document.body via Portal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isFullscreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 999999,
                background: 'rgba(5, 7, 10, 0.98)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                display: 'flex',
                flexDirection: 'column',
                padding: '16px 28px',
                boxSizing: 'border-box',
              }}
            >
              {/* Modal Header — Clean Spacing & High Contrast Controls */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: 14,
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  width: '100%',
                  boxSizing: 'border-box',
                  gap: 16,
                  flexShrink: 0,
                }}
              >
                {/* Modal Header Left Title Section */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    minWidth: 0,
                    flex: '1 1 auto',
                  }}
                >
                  {isPdf ? (
                    <FileText size={20} color="#f97316" style={{ flexShrink: 0 }} />
                  ) : (
                    <ImageIcon size={20} color="#f97316" style={{ flexShrink: 0 }} />
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h2
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#fff',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 420,
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                      title={fileName}
                    >
                      {fileName}
                    </h2>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', fontFamily: "'Inter', system-ui, sans-serif" }}>
                      Expanded Document Viewer • Esc to exit
                    </span>
                  </div>
                </div>

                {/* Modal Top Right Action Controls — Fully Visible & Clear */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexShrink: 0,
                    marginLeft: 'auto',
                  }}
                >
                  {/* Modal Zoom Controls Stepper */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.15)',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      onClick={handleZoomOut}
                      disabled={zoom <= 25}
                      aria-label="Zoom out"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '8px 12px',
                        color: zoom <= 25 ? 'rgba(255,255,255,0.25)' : '#fff',
                        cursor: zoom <= 25 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Minus size={15} />
                    </button>

                    <span
                      style={{
                        fontSize: 13,
                        color: '#fff',
                        padding: '0 10px',
                        fontWeight: 600,
                        minWidth: 48,
                        textAlign: 'center',
                        userSelect: 'none',
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      {zoom}%
                    </span>

                    <button
                      onClick={handleZoomIn}
                      disabled={zoom >= 300}
                      aria-label="Zoom in"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '8px 12px',
                        color: zoom >= 300 ? 'rgba(255,255,255,0.25)' : '#fff',
                        cursor: zoom >= 300 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Plus size={15} />
                    </button>
                  </div>

                  {/* Reset Zoom & Pan Button */}
                  <button
                    onClick={() => {
                      setZoom(100);
                      setModalPan({ x: 0, y: 0 });
                    }}
                    title="Reset Zoom & Pan"
                    aria-label="Reset zoom"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      fontSize: 12.5,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>Reset</span>
                  </button>

                  {/* Modal Download Original Button */}
                  <button
                    onClick={handleDownloadOriginal}
                    disabled={isDownloading}
                    aria-label="Download original document"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 16px',
                      borderRadius: 8,
                      background: 'rgba(249, 115, 22, 0.15)',
                      border: '1px solid rgba(249, 115, 22, 0.35)',
                      color: isDownloading ? 'rgba(255,255,255,0.5)' : '#f97316',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: isDownloading ? 'not-allowed' : 'pointer',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                    <span>Download</span>
                  </button>

                  {/* Exit Fullscreen Close Button */}
                  <button
                    onClick={toggleFullscreen}
                    aria-label="Exit fullscreen"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      padding: '8px',
                      borderRadius: 8,
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body Container (Centered & 360° Drag Panning) */}
              <div
                ref={modalViewportRef}
                onMouseDown={(e) => handleMouseDown(e, true)}
                onMouseMove={(e) => handleViewportMouseMove(e, true)}
                onMouseLeave={() => handleViewportMouseLeave(true)}
                style={{
                  flex: 1,
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 20,
                  width: '100%',
                  height: 'calc(100vh - 84px)',
                  boxSizing: 'border-box',
                  cursor: isPanning ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
              >
                {/* Modal Orange Glowing Pointer Dot */}
                {modalCursorPos.show && (
                  <div
                    style={{
                      position: 'absolute',
                      left: modalCursorPos.x,
                      top: modalCursorPos.y,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: '#f97316',
                      border: '2px solid #ffffff',
                      boxShadow: '0 0 16px rgba(249,115,22,0.9), 0 0 8px #f97316',
                      pointerEvents: 'none',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 40,
                      transition: isPanning ? 'none' : 'transform 0.05s ease-out',
                    }}
                  />
                )}

                {previewSrc && (
                  isPdf ? (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        height: '100%',
                        margin: 'auto',
                      }}
                    >
                      <div
                        style={{
                          width: '85vw',
                          height: '82vh',
                          transform: `translate3d(${modalPan.x}px, ${modalPan.y}px, 0px) scale(${zoom / 100})`,
                          transformOrigin: 'center center',
                          transition: isPanning ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: '0 32px 90px rgba(0, 0, 0, 0.98), 0 16px 40px rgba(0, 0, 0, 0.92), 0 0 0 1px rgba(255, 255, 255, 0.14)',
                          borderRadius: 8,
                          overflow: 'hidden',
                        }}
                      >
                        <object
                          data={previewSrc}
                          type="application/pdf"
                          width="100%"
                          height="100%"
                          style={{ borderRadius: 8, pointerEvents: 'none' }}
                        >
                          <iframe src={previewSrc} title="Fullscreen PDF Preview" width="100%" height="100%" style={{ pointerEvents: 'none' }} />
                        </object>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        height: '100%',
                        margin: 'auto',
                      }}
                    >
                      <img
                        src={previewSrc}
                        alt={fileName}
                        onDragStart={(e) => e.preventDefault()}
                        style={{
                          maxWidth: '85vw',
                          maxHeight: '82vh',
                          width: 'auto',
                          height: 'auto',
                          margin: 'auto',
                          display: 'block',
                          objectFit: 'contain',
                          transform: `translate3d(${modalPan.x}px, ${modalPan.y}px, 0px) scale(${zoom / 100})`,
                          transformOrigin: 'center center',
                          transition: isPanning ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: '0 32px 90px rgba(0, 0, 0, 0.98), 0 16px 40px rgba(0, 0, 0, 0.92), 0 0 0 1px rgba(255, 255, 255, 0.14)',
                          borderRadius: 8,
                          pointerEvents: 'none',
                        }}
                      />
                    </div>
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
