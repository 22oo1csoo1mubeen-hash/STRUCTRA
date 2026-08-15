import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WelcomeSection from './WelcomeSection';
import UploadCard from './UploadCard';
import HowItWorks from './HowItWorks';
import RecentUploads from './RecentUploads';
import { uploadDocument, extractDocument, validateDocument, getDocumentDetail, saveDocument } from '../../../api/documents';

/**
 * UploadPage
 * The default landing page after authentication.
 * Composes: WelcomeSection + UploadCard + HowItWorks + RecentUploads
 */
export default function UploadPage() {
  const [stage, setStage] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [uploadedDocument, setUploadedDocument] = useState(null);
  const [isForcedDuplicate, setIsForcedDuplicate] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [extractionError, setExtractionError] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState(null);

  const handleFilesSelected = async (files) => {
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
    
    // 1. Perform upload & duplicate check (Stage 1 checking)
    await handleCheckDuplicateAndUpload(file, false);
  };

  const handleCheckDuplicateAndUpload = async (fileObj, forceDuplicate = false) => {
    if (!fileObj) return;
    setFileError(null);
    setIsForcedDuplicate(forceDuplicate);

    // Show Stage 3 upload/checking animation for ~2 seconds
    setStage(3);

    const minAnimationPromise = new Promise(resolve => setTimeout(resolve, 2000));
    const uploadPromise = uploadDocument(fileObj, forceDuplicate);

    try {
      const [_, response] = await Promise.all([minAnimationPromise, uploadPromise]);
      setUploadedDocument(response);

      if (response.is_duplicate && !forceDuplicate) {
        // STOP normal processing flow and switch immediately to Stage 12 (Duplicate Detected)
        setStage(12);
        return;
      }

      // Non-duplicate (or forced duplicate) -> Move to Stage 2 (File Selected / Ready to Process)
      setStage(2);
    } catch (err) {
      setFileError(err.message || 'Upload failed. Please try again.');
      setStage(1);
    }
  };

  const handleStartProcessing = async () => {
    const targetDocId = uploadedDocument?.document_id;
    if (!targetDocId) {
      if (selectedFile) {
        await handleCheckDuplicateAndUpload(selectedFile, isForcedDuplicate);
      }
      return;
    }

    // UI transition: Stage 2 -> Stage 3 (Uploading) -> Stage 4 (AI Processing)
    setStage(3);
    setFileError(null);

    // Auto-scroll smooth animation to the bottom of the workspace so the card appears fully
    setTimeout(() => {
      const scrollArea = document.getElementById('app-scroll-area');
      if (scrollArea) {
        scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' });
      } else if (uploadContainerRef.current) {
        uploadContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 60);

    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      await handleExtractDocument(targetDocId);
    } catch (err) {
      setFileError(err.message || 'Processing failed. Please try again.');
      setStage(2);
    }
  };

  const handleProcessAnyway = async () => {
    if (!selectedFile) return;
    await handleCheckDuplicateAndUpload(selectedFile, true);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadedDocument(null);
    setFileError(null);
    setStage(1);
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadedDocument(null);
    setIsForcedDuplicate(false);
    setFileError(null);
    setExtractionResult(null);
    setValidationResult(null);
    setStage(1);
    const scrollArea = document.getElementById('app-scroll-area');
    if (scrollArea) {
      scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveToLibrary = async () => {
    const targetDocId = uploadedDocument?.document_id;
    if (!targetDocId) return;

    // Immediately switch to Stage 11 ("Saved to your Document Library") with zero delay
    setStage(11);

    // Automatically push scrollbar smoothly to the middle of the page
    setTimeout(() => {
      const scrollArea = document.getElementById('app-scroll-area');
      if (scrollArea) {
        const middleScroll = Math.max(0, (scrollArea.scrollHeight - scrollArea.clientHeight) / 2);
        scrollArea.scrollTo({ top: middleScroll, behavior: 'smooth' });
      } else if (uploadContainerRef.current) {
        uploadContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);

    // Perform database persistence asynchronously
    try {
      await saveDocument(targetDocId, isForcedDuplicate);
    } catch (err) {
      console.error('Failed to save document in background:', err);
      setFileError(err.message || 'Failed to save document to library.');
    }
  };


  const handleExtractDocument = async (docId) => {
    setStage(4);
    setExtractionError(null);

    try {
      const result = await extractDocument(docId);
      setExtractionResult(result);
      // Integration 3: Proceed to Validation (Stage 5)
      await handleValidateDocument(docId, result.extraction);
    } catch (err) {
      setExtractionError(err.message || 'Extraction failed.');
      // Remains on stage 4 with error shown
    }
  };

  const handleValidateDocument = async (docId, extractionData) => {
    setStage(5);
    setValidationError(null);

    try {
      const result = await validateDocument(docId, extractionData);
      setValidationResult(result);
      
      const status = result.overall_status;
      const dupClass = result.duplicate_detection?.classification;
      
      // Wait a moment for Stage 5 animations before routing
      setTimeout(() => {
        if (dupClass === 'likely_duplicate' || dupClass === 'definite_duplicate') {
          setStage(9); // Route to Review Page for duplicate handling
        } else if (status !== 'valid' || extractionResult?.quality?.needs_review === true) {
          setStage(9); // Review Page for any discrepancy or quality review signal
        } else {
          setStage(7); // Result Page
        }
      }, 800);
    } catch (err) {
      setValidationError(err.message || 'Validation failed.');
    }
  };

  const uploadContainerRef = useRef(null);

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
        file={selectedFile}
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
        onRetryExtraction={() => handleExtractDocument(uploadedDocument?.document_id)}
        onRetryValidation={() => handleValidateDocument(uploadedDocument?.document_id, extractionResult?.extraction)}
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
