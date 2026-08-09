import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WelcomeSection from './WelcomeSection';
import UploadCard from './UploadCard';
import HowItWorks from './HowItWorks';
import RecentUploads from './RecentUploads';

/**
 * UploadPage
 * The default landing page after authentication.
 * Composes: WelcomeSection + UploadCard + HowItWorks + RecentUploads
 */
export default function UploadPage() {
  const [stage, setStage] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState(null);

  const handleFilesSelected = (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    
    // File Validation
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setFileError('Unsupported file type. Please upload a PDF, JPG, JPEG or PNG document.');
      return;
    }
    
    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File exceeds the maximum allowed size of 10 MB.');
      return;
    }

    setFileError(null);
    setSelectedFile(file);
    setStage(2);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError(null);
    setStage(1);
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setFileError(null);
    setStage(1);
  };

  const handleProcessDocument = () => {
    // UI-only transition to a placeholder Stage 3
    setStage(3);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        paddingBottom: 40,
      }}
    >
      {/* Welcome greeting */}
      <WelcomeSection />

      {/* Upload drag-and-drop card / Workspace */}
      <UploadCard 
        stage={stage}
        setStage={setStage}
        file={selectedFile}
        error={fileError}
        onFilesSelected={handleFilesSelected}
        onRemoveFile={handleRemoveFile}
        onProcessDocument={handleProcessDocument}
        resetUpload={resetUpload}
      />

      <AnimatePresence>
        {stage < 3 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* How it works steps */}
            <HowItWorks />

            {/* Recent uploads / empty state */}
            <RecentUploads uploads={[]} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
