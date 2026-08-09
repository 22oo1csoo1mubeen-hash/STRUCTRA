import { motion } from 'framer-motion';
import { FileCheck, Image as ImageIcon, FileText, CheckCircle2, Sparkles, Trash2, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';

export default function Stage2View({ file, onProcessDocument, onRemoveFile }) {
  // Determine if it's an image or pdf for the preview icon
  const isImage = file?.type?.startsWith('image/');
  
  // Create object URL for actual image preview
  const previewUrl = useMemo(() => {
    if (isImage && file) {
      return URL.createObjectURL(file);
    }
    return null;
  }, [file, isImage]);

  const fileTypeStr = file?.name?.split('.').pop()?.toUpperCase() || 'FILE';
  const sizeStr = file ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : '0 MB';
  
  // Format date nicely
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
      
      {/* Top Header */}
      <motion.div 
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div style={{ position: 'relative', marginBottom: 16 }}>
          {/* Subtle glowing ring behind icon */}
          <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', background: 'rgba(249,115,22,0.15)', filter: 'blur(10px)' }} />
          <FileCheck size={48} color="#f97316" strokeWidth={1.5} style={{ position: 'relative' }} />
          
          {/* Sparkles decorations */}
          <div style={{ position: 'absolute', top: -4, right: -12 }}>
            <Sparkles size={14} color="rgba(249,115,22,0.8)" />
          </div>
          <div style={{ position: 'absolute', bottom: -4, left: -16 }}>
            <Sparkles size={12} color="rgba(249,115,22,0.5)" />
          </div>
        </div>
        
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'rgba(255,250,242,0.96)', marginBottom: 8, letterSpacing: '-0.01em' }}>
          File ready to process
        </h2>
        <p style={{ color: 'rgba(255,240,220,0.60)', fontSize: 14.5 }}>
          Review your file details and start processing.
        </p>
      </motion.div>

      {/* Detail Card Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: 720,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: '12px 20px',
          marginTop: 12,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 16,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 30px rgba(0,0,0,0.2)'
        }}
      >
        {/* Document Icon / Thumbnail */}
        <div style={{
          width: 70, 
          height: 84, 
          borderRadius: 10, 
          background: previewUrl ? '#1a1a1a' : 'linear-gradient(135deg, #f97316 0%, #e85d04 100%)', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          position: 'relative',
          boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          {previewUrl ? (
            <img 
              src={previewUrl} 
              alt="Preview" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} 
            />
          ) : (
            isImage ? <ImageIcon size={34} color="#fff" strokeWidth={1.5} /> : <FileText size={34} color="#fff" strokeWidth={1.5} />
          )}
          
          <div style={{ 
            position: 'absolute', 
            bottom: 6, 
            left: '50%', 
            transform: 'translateX(-50%)',
            background: 'rgba(30,30,30,0.95)', 
            padding: '2px 8px', 
            borderRadius: 6, 
            fontSize: 7.5, 
            fontWeight: 700, 
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(4px)'
          }}>
            {fileTypeStr}
          </div>
        </div>

        {/* Document Info Grid */}
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          
          <div style={{ flex: '1 1 150px', paddingRight: 10 }}>
            <h3 style={{ 
              fontSize: 16, 
              fontWeight: 600, 
              color: 'rgba(255,250,242,0.95)', 
              marginBottom: 4,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 200
            }} title={file?.name}>
              {file?.name || 'Document'}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4ade80', fontSize: 13, fontWeight: 500 }}>
              <CheckCircle2 size={15} strokeWidth={2.5} /> File ready
            </div>
          </div>
          
          <div style={{ flex: '1 1 80px' }}>
            <p style={{ fontSize: 12.5, color: 'rgba(255,240,220,0.5)', marginBottom: 4 }}>File Type</p>
            <p style={{ fontSize: 14.5, color: 'rgba(255,250,242,0.9)', fontWeight: 500 }}>{fileTypeStr}</p>
          </div>

          <div style={{ flex: '1 1 80px' }}>
            <p style={{ fontSize: 12.5, color: 'rgba(255,240,220,0.5)', marginBottom: 4 }}>File Size</p>
            <p style={{ fontSize: 14.5, color: 'rgba(255,250,242,0.9)', fontWeight: 500 }}>{sizeStr}</p>
          </div>

          <div style={{ flex: '1 1 150px' }}>
            <p style={{ fontSize: 12.5, color: 'rgba(255,240,220,0.5)', marginBottom: 4 }}>Added On</p>
            <p style={{ fontSize: 14.5, color: 'rgba(255,250,242,0.9)', fontWeight: 500, whiteSpace: 'nowrap' }}>{dateStr} • {timeStr}</p>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 20 }}
      >
        <motion.button 
          whileHover={{ 
            scale: 1.05, 
            boxShadow: '0 0 30px rgba(204, 98, 22, 0.5), inset 0 0 12px rgba(241, 154, 23, 0.4)',
            background: 'linear-gradient(135deg, #e47f2cff 0%, #f85b07ff 100%)'
          }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.15 }}
          onClick={onProcessDocument}
          style={{
            padding: '12px 36px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #e69e38ff 0%, #f97316 100%)',
            border: 'none',
            color: '#fff',
            fontSize: 14.5,
            fontWeight: 700,
            fontFamily: "'Inter', system-ui, sans-serif",
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(198, 107, 27, 0.35), inset 0 2px 4px rgba(205, 141, 69, 0.4), inset 0 -2px 4px rgba(0,0,0,0.15)',
            textShadow: '0 1px 4px rgba(0,0,0,0.2)',
            letterSpacing: '0.01em'
          }}
        >
          <Sparkles size={18} strokeWidth={2.2} /> Process Document
        </motion.button>
        
        <motion.button 
          whileHover={{ 
            scale: 1.03, 
            background: 'rgba(255,255,255,0.06)',
            borderColor: 'rgba(255,255,255,0.3)'
          }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.15 }}
          onClick={onRemoveFile}
          style={{
            padding: '12px 36px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,250,242,0.9)',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            transition: 'background 0.2s, border-color 0.2s'
          }}
        >
          <Trash2 size={18} strokeWidth={2} /> Remove File
        </motion.button>
      </motion.div>

      {/* Footer text */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, color: 'rgba(255,240,220,0.5)', fontSize: 13.5 }}
      >
        <ShieldCheck size={16} strokeWidth={1.5} /> Your file is secure and will only be used to extract information.
      </motion.div>
    </div>
  );
}
