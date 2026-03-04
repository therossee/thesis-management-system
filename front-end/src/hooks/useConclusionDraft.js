// components/conclusion-request/hooks/useConclusionDraft.js
import { useCallback, useEffect, useRef } from 'react';

const resolveDraftUploadedFile = ({ shouldRemove, file, previousValue, fileType, canPreview }) => {
  if (shouldRemove) {
    return null;
  }

  if (file) {
    return {
      fileType,
      fileName: file.name,
      canPreview,
    };
  }

  return previousValue;
};

export default function useConclusionDraft({
  API,
  saveDraftTrigger,
  onSaveDraftResult,
  setIsSubmitting,
  buildConclusionFormData,
  draftFilesToRemove,
  pdfFile,
  summaryPdf,
  supplementaryZip,
  setDraftUploadedFiles,
  setDraftFilesToRemove,
}) {
  const lastHandledDraftTriggerRef = useRef(0);

  const handleSaveDraft = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const formData = buildConclusionFormData(true);
      await API.saveThesisConclusionDraft(formData);

      setDraftUploadedFiles(prev => ({
        thesis: resolveDraftUploadedFile({
          shouldRemove: draftFilesToRemove.thesis,
          file: pdfFile,
          previousValue: prev.thesis,
          fileType: 'thesis',
          canPreview: true,
        }),
        summary: resolveDraftUploadedFile({
          shouldRemove: draftFilesToRemove.summary,
          file: summaryPdf,
          previousValue: prev.summary,
          fileType: 'summary',
          canPreview: true,
        }),
        additional: resolveDraftUploadedFile({
          shouldRemove: draftFilesToRemove.additional,
          file: supplementaryZip,
          previousValue: prev.additional,
          fileType: 'additional',
          canPreview: false,
        }),
      }));

      setDraftFilesToRemove({ thesis: false, summary: false, additional: false });

      if (onSaveDraftResult) onSaveDraftResult(true);
      return true;
    } catch (err) {
      console.error(err);
      if (onSaveDraftResult) onSaveDraftResult(false);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    API,
    buildConclusionFormData,
    draftFilesToRemove,
    onSaveDraftResult,
    pdfFile,
    summaryPdf,
    supplementaryZip,
    setDraftUploadedFiles,
    setDraftFilesToRemove,
    setIsSubmitting,
  ]);

  useEffect(() => {
    if (!saveDraftTrigger || saveDraftTrigger === lastHandledDraftTriggerRef.current) return;
    lastHandledDraftTriggerRef.current = saveDraftTrigger;
    handleSaveDraft();
  }, [handleSaveDraft, saveDraftTrigger]);

  return { handleSaveDraft };
}
