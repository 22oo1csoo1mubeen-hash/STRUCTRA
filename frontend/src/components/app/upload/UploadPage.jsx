import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WelcomeSection from './WelcomeSection';
import UploadCard from './UploadCard';
import HowItWorks from './HowItWorks';
import RecentUploads from './RecentUploads';
import { useUploadWorkflow } from '../../../context/UploadWorkflowContext';

/**
 * UploadPage
 * The default landing page after authentication.
 * Connected to persistent global UploadWorkflowContext.
 * Composes: WelcomeSection + UploadCard + HowItWorks + RecentUploads
 */
export default function UploadPage() {
  const {
    stage,
    setStage,
    selectedFile,
    fileMeta,
    fileError,
    uploadedDocument,
    isForcedDuplicate,
    extractionResult,
    extractionError,
    validationResult,
    validationError,
    handleFilesSelected,
    handleStartProcessing,
    handleProcessAnyway,
    handleRemoveFile,
    resetUpload,
    handleSaveToLibrary,
    handleRetryExtraction,
    handleRetryValidation,
  } = useUploadWorkflow();

  const uploadContainerRef = useRef(null);

  // Construct displayFile for components (combines selectedFile or uploadedDocument metadata proxy)
  const displayFile = selectedFile || (fileMeta ? { name: fileMeta.name, size: fileMeta.size, type: fileMeta.type } : (uploadedDocument ? { name: uploadedDocument.filename, size: uploadedDocument.file_size, type: uploadedDocument.content_type } : null));

  // Maintain smooth scroll restoration on stage changes
  useEffect(() => {
    if (stage === 11) {
      setTimeout(() => {
        const scrollArea = document.getElementById('app-scroll-area');
        if (scrollArea) {
          const middleScroll = Math.max(0, (scrollArea.scrollHeight - scrollArea.clientHeight) / 2);
          scrollArea.scrollTo({ top: middleScroll, behavior: 'smooth' });
        }
      }, 100);
    } else if (stage === 1) {
      setTimeout(() => {
        const scrollArea = document.getElementById('app-scroll-area');
        if (scrollArea) {
          scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [stage]);

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
      <div ref={uploadContainerRef}>
        <UploadCard 
          stage={stage}
          setStage={setStage}
          file={displayFile}
          uploadedDocument={uploadedDocument}
          error={fileError}
          onFilesSelected={handleFilesSelected}
          onRemoveFile={handleRemoveFile}
          onProcessDocument={handleStartProcessing}
          onProcessAnyway={handleProcessAnyway}
          onSaveToLibrary={handleSaveToLibrary}
          resetUpload={resetUpload}
          extractionResult={extractionResult}
          extractionError={extractionError}
          validationResult={validationResult}
          validationError={validationError}
          onRetryExtraction={handleRetryExtraction}
          onRetryValidation={handleRetryValidation}
        />
      </div>

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

