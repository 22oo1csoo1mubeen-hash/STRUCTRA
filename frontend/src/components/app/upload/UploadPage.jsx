import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WelcomeSection from './WelcomeSection';
import UploadCard from './UploadCard';
import HowItWorks from './HowItWorks';
import RecentUploads from './RecentUploads';
import { uploadDocument, extractDocument, validateDocument } from '../../../api/documents';

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
  const [extractionResult, setExtractionResult] = useState(null);
  const [extractionError, setExtractionError] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState(null);

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
    const scrollArea = document.getElementById('app-scroll-area');
    if (scrollArea) {
      scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleProcessDocument = async () => {
    if (!selectedFile) return;
    
    // UI transition to Stage 3 (Uploading)
    setStage(3);
    setFileError(null);

    // Yield to browser to ensure Stage 3 renders before the upload blocks or fails
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const response = await uploadDocument(selectedFile);
      setUploadedDocument(response);
      
      // Integration 2: Proceed to Extraction (Stage 4)
      await handleExtractDocument(response.document_id);
    } catch (err) {
      setFileError(err.message || 'Upload failed. Please try again.');
      setStage(2); // Return to stage 2 on failure
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
          setStage(10); // Duplicate Warning
        } else if (status === 'warning' || status === 'invalid') {
          setStage(9); // Review Page
        } else if (status === 'valid') {
          setStage(7); // Result Page
        } else {
          // unable_to_validate (not handled above)
          setValidationError('The document could not be validated.');
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
        if (uploadContainerRef.current) {
          uploadContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else if (stage === 1) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        error={fileError}
        onFilesSelected={handleFilesSelected}
        onRemoveFile={handleRemoveFile}
        onProcessDocument={handleProcessDocument}
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
