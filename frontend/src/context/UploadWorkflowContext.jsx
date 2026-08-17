import { createContext, useContext, useState, useRef, useCallback, useMemo } from 'react';
import {
  uploadDocument,
  extractDocument,
  validateDocument,
  saveDocument,
} from '../api/documents';
import { useDocumentLibrary } from './DocumentLibraryContext';
import { broadcastDashboardInvalidation } from './DashboardContext';

/* ─── Initial State ─────────────────────────────────────────── */
const INITIAL_WORKFLOW_STATE = {
  workflowId: null,
  stage: 1, // 1 to 12
  selectedFile: null,
  fileMeta: null,
  fileError: null,
  uploadedDocument: null,
  isForcedDuplicate: false,
  isUploading: false,
  isExtracting: false,
  isValidating: false,
  isSaving: false,
  extractionResult: null,
  extractionError: null,
  validationResult: null,
  validationError: null,
};

const UploadWorkflowContext = createContext(null);

export function UploadWorkflowProvider({ children }) {
  const [workflow, setWorkflow] = useState(INITIAL_WORKFLOW_STATE);
  const activeWorkflowIdRef = useRef(null);
  const { updateDocumentLibrary } = useDocumentLibrary();

  /**
   * Helper to create a new unique workflow ID.
   */
  const generateWorkflowId = () => {
    return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  };

  /**
   * Reset / Discard current workflow completely.
   */
  const resetUpload = useCallback(() => {
    activeWorkflowIdRef.current = null;
    setWorkflow(INITIAL_WORKFLOW_STATE);

    const scrollArea = document.getElementById('app-scroll-area');
    if (scrollArea) {
      scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  /**
   * Remove selected file before processing starts.
   */
  const handleRemoveFile = useCallback(() => {
    activeWorkflowIdRef.current = null;
    setWorkflow(INITIAL_WORKFLOW_STATE);
  }, []);

  /**
   * Direct stage updater.
   */
  const setStage = useCallback((newStage) => {
    setWorkflow((prev) => ({ ...prev, stage: newStage }));
  }, []);

  /**
   * 1. Validate file and initiate upload + duplicate check.
   */
  const handleFilesSelected = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // File type validation
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setWorkflow((prev) => ({
        ...prev,
        fileError: 'Unsupported file type. Please upload a PDF, JPG, JPEG or PNG document.',
      }));
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setWorkflow((prev) => ({
        ...prev,
        fileError: 'File exceeds the maximum allowed size of 10 MB.',
      }));
      return;
    }

    const workflowId = generateWorkflowId();
    activeWorkflowIdRef.current = workflowId;

    const fileMeta = {
      name: file.name,
      size: file.size,
      type: file.type,
    };

    setWorkflow({
      ...INITIAL_WORKFLOW_STATE,
      workflowId,
      selectedFile: file,
      fileMeta,
      stage: 3,
      isUploading: true,
    });

    await executeCheckDuplicateAndUpload(file, false, workflowId);
  }, []);

  /**
   * Internal executor for uploading & checking duplicate with stale protection.
   */
  const executeCheckDuplicateAndUpload = async (fileObj, forceDuplicate, workflowId) => {
    const minAnimationPromise = new Promise((resolve) => setTimeout(resolve, 2000));
    const uploadPromise = uploadDocument(fileObj, forceDuplicate);

    try {
      const [_, response] = await Promise.all([minAnimationPromise, uploadPromise]);

      // Stale response guard
      if (activeWorkflowIdRef.current !== workflowId) return;

      if (response.is_duplicate && !forceDuplicate) {
        setWorkflow((prev) => {
          if (prev.workflowId !== workflowId) return prev;
          return {
            ...prev,
            uploadedDocument: response,
            isForcedDuplicate: false,
            isUploading: false,
            stage: 12, // Duplicate Detected
          };
        });
        return;
      }

      setWorkflow((prev) => {
        if (prev.workflowId !== workflowId) return prev;
        return {
          ...prev,
          uploadedDocument: response,
          isForcedDuplicate: forceDuplicate,
          isUploading: false,
          stage: 2, // Ready to process
        };
      });
    } catch (err) {
      if (activeWorkflowIdRef.current !== workflowId) return;

      setWorkflow((prev) => {
        if (prev.workflowId !== workflowId) return prev;
        return {
          ...prev,
          fileError: err.message || 'Upload failed. Please try again.',
          isUploading: false,
          stage: 1,
        };
      });
    }
  };

  /**
   * Process Anyway when duplicate was detected (Force duplicate upload).
   */
  const handleProcessAnyway = useCallback(async () => {
    const currentWf = workflow;
    const fileObj = currentWf.selectedFile;
    if (!fileObj) return;

    const workflowId = currentWf.workflowId || generateWorkflowId();
    activeWorkflowIdRef.current = workflowId;

    setWorkflow((prev) => ({
      ...prev,
      stage: 3,
      isUploading: true,
      fileError: null,
      isForcedDuplicate: true,
    }));

    await executeCheckDuplicateAndUpload(fileObj, true, workflowId);
  }, [workflow]);

  /**
   * 2. Start AI Processing & Validation flow.
   */
  const handleStartProcessing = useCallback(async () => {
    const currentWf = workflow;
    const targetDocId = currentWf.uploadedDocument?.document_id;
    const workflowId = currentWf.workflowId;

    if (!targetDocId) {
      if (currentWf.selectedFile) {
        const newWfId = generateWorkflowId();
        activeWorkflowIdRef.current = newWfId;
        setWorkflow((prev) => ({
          ...prev,
          workflowId: newWfId,
          stage: 3,
          isUploading: true,
          fileError: null,
        }));
        await executeCheckDuplicateAndUpload(currentWf.selectedFile, currentWf.isForcedDuplicate, newWfId);
      }
      return;
    }

    setWorkflow((prev) => ({
      ...prev,
      stage: 3,
      fileError: null,
    }));

    // Auto-scroll to workspace
    setTimeout(() => {
      const scrollArea = document.getElementById('app-scroll-area');
      if (scrollArea) {
        scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' });
      }
    }, 60);

    await new Promise((resolve) => setTimeout(resolve, 50));

    await executeExtractDocument(targetDocId, workflowId);
  }, [workflow]);

  /**
   * 3. AI Extraction executor with stale protection.
   */
  const executeExtractDocument = async (docId, workflowId) => {
    setWorkflow((prev) => {
      if (prev.workflowId !== workflowId) return prev;
      return {
        ...prev,
        stage: 4,
        isExtracting: true,
        extractionError: null,
      };
    });

    try {
      const result = await extractDocument(docId);

      // Stale guard
      if (activeWorkflowIdRef.current !== workflowId) return;

      setWorkflow((prev) => {
        if (prev.workflowId !== workflowId) return prev;
        return {
          ...prev,
          extractionResult: result,
          isExtracting: false,
        };
      });

      // Proceed to Validation (Stage 5)
      await executeValidateDocument(docId, result.extraction, workflowId, result);
    } catch (err) {
      if (activeWorkflowIdRef.current !== workflowId) return;

      setWorkflow((prev) => {
        if (prev.workflowId !== workflowId) return prev;
        return {
          ...prev,
          extractionError: err.message || 'Extraction failed.',
          isExtracting: false,
          stage: 4,
        };
      });
    }
  };

  /**
   * 4. Validation executor with stale protection.
   */
  const executeValidateDocument = async (docId, extractionData, workflowId, currentExtResult = null) => {
    setWorkflow((prev) => {
      if (prev.workflowId !== workflowId) return prev;
      return {
        ...prev,
        stage: 5,
        isValidating: true,
        validationError: null,
      };
    });

    try {
      const result = await validateDocument(docId, extractionData);

      // Stale guard
      if (activeWorkflowIdRef.current !== workflowId) return;

      const status = result.overall_status;
      const dupClass = result.duplicate_detection?.classification;
      const needsReview = currentExtResult?.quality?.needs_review === true;

      setWorkflow((prev) => {
        if (prev.workflowId !== workflowId) return prev;
        return {
          ...prev,
          validationResult: result,
          isValidating: false,
        };
      });

      // Allow Stage 5 animations before transition to Result / Review workspace
      setTimeout(() => {
        if (activeWorkflowIdRef.current !== workflowId) return;

        setWorkflow((prev) => {
          if (prev.workflowId !== workflowId) return prev;
          if (dupClass === 'likely_duplicate' || dupClass === 'definite_duplicate' || status !== 'valid' || needsReview) {
            return { ...prev, stage: 9 }; // Review Workspace
          }
          return { ...prev, stage: 7 }; // Valid Result Workspace
        });
      }, 800);
    } catch (err) {
      if (activeWorkflowIdRef.current !== workflowId) return;

      setWorkflow((prev) => {
        if (prev.workflowId !== workflowId) return prev;
        return {
          ...prev,
          validationError: err.message || 'Validation failed.',
          isValidating: false,
          stage: 5,
        };
      });
    }
  };

  /**
   * 5. Save to Library persistence with background safety & immediate client sync.
   */
  const handleSaveToLibrary = useCallback(async (updatedData = null) => {
    const currentWf = workflow;
    const targetDocId = currentWf.uploadedDocument?.document_id;
    const workflowId = currentWf.workflowId;
    if (!targetDocId) return;

    // Immediately switch to Stage 11 ("Saved to your Document Library")
    setWorkflow((prev) => ({
      ...prev,
      stage: 11,
      isSaving: true,
    }));

    // Smooth auto-scroll
    setTimeout(() => {
      const scrollArea = document.getElementById('app-scroll-area');
      if (scrollArea) {
        const middleScroll = Math.max(0, (scrollArea.scrollHeight - scrollArea.clientHeight) / 2);
        scrollArea.scrollTo({ top: middleScroll, behavior: 'smooth' });
      }
    }, 60);

    const confidenceOverride = updatedData?.confidenceOverride ?? null;
    let extractionPayload = null;

    if (updatedData) {
      const parseNum = (str) => {
        if (typeof str === 'number') return str;
        if (!str) return 0;
        const cleaned = String(str).replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };
      const lineItems = (updatedData.lineItems || []).map((item) => ({
        description: item.item || item.description || '',
        quantity: typeof item.qty === 'number' ? item.qty : (parseInt(String(item.qty).replace(/[^0-9]/g, '')) || 1),
        unit_price: parseNum(item.rate || item.unit_price),
        line_total: parseNum(item.amount || item.line_total),
      }));
      const total = parseNum(updatedData.totalAmount);
      extractionPayload = {
        vendor_company: updatedData.vendor ?? currentWf.extractionResult?.extraction?.vendor_company ?? '',
        date: updatedData.date ?? currentWf.extractionResult?.extraction?.date ?? '',
        address: updatedData.address ?? currentWf.extractionResult?.extraction?.address ?? '',
        invoice_number: updatedData.invoiceNumber ?? currentWf.extractionResult?.extraction?.invoice_number ?? '',
        total: total,
        subtotal: currentWf.extractionResult?.extraction?.subtotal ?? total,
        tax: currentWf.extractionResult?.extraction?.tax ?? 0,
        discount: currentWf.extractionResult?.extraction?.discount ?? 0,
        line_items: lineItems,
      };
    }

    try {
      const savedDocDetail = await saveDocument(targetDocId, currentWf.isForcedDuplicate, extractionPayload, confidenceOverride);
      
      // IMMEDIATELY synchronize authoritative saved document into Document Library state/cache!
      if (savedDocDetail) {
        updateDocumentLibrary(savedDocDetail);
      }
      broadcastDashboardInvalidation();

      if (activeWorkflowIdRef.current === workflowId) {
        setWorkflow((prev) => {
          if (prev.workflowId !== workflowId) return prev;
          return { ...prev, isSaving: false };
        });
      }
    } catch (err) {
      console.error('Failed to save document to library:', err);
      if (activeWorkflowIdRef.current === workflowId) {
        setWorkflow((prev) => {
          if (prev.workflowId !== workflowId) return prev;
          return {
            ...prev,
            isSaving: false,
            fileError: err.message || 'Failed to save document to library.',
          };
        });
      }
    }
  }, [workflow, updateDocumentLibrary]);

  /**
   * Retry handlers for extraction and validation.
   */
  const handleRetryExtraction = useCallback(() => {
    if (workflow.uploadedDocument?.document_id && workflow.workflowId) {
      executeExtractDocument(workflow.uploadedDocument.document_id, workflow.workflowId);
    }
  }, [workflow]);

  const handleRetryValidation = useCallback(() => {
    if (workflow.uploadedDocument?.document_id && workflow.extractionResult?.extraction && workflow.workflowId) {
      executeValidateDocument(
        workflow.uploadedDocument.document_id,
        workflow.extractionResult.extraction,
        workflow.workflowId,
        workflow.extractionResult
      );
    }
  }, [workflow]);

  const value = useMemo(() => ({
    ...workflow,
    setStage,
    handleFilesSelected,
    handleStartProcessing,
    handleProcessAnyway,
    handleRemoveFile,
    resetUpload,
    handleSaveToLibrary,
    handleRetryExtraction,
    handleRetryValidation,
  }), [
    workflow,
    setStage,
    handleFilesSelected,
    handleStartProcessing,
    handleProcessAnyway,
    handleRemoveFile,
    resetUpload,
    handleSaveToLibrary,
    handleRetryExtraction,
    handleRetryValidation,
  ]);

  return (
    <UploadWorkflowContext.Provider value={value}>
      {children}
    </UploadWorkflowContext.Provider>
  );
}

export function useUploadWorkflow() {
  const ctx = useContext(UploadWorkflowContext);
  if (!ctx) {
    throw new Error('useUploadWorkflow must be used within an UploadWorkflowProvider');
  }
  return ctx;
}
