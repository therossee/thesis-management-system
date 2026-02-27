// components/conclusion-request/hooks/useConclusionDraft.js
import { useCallback, useEffect, useRef } from 'react';

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
        thesis: draftFilesToRemove.thesis
          ? null
          : pdfFile
            ? { fileType: 'thesis', fileName: pdfFile.name, canPreview: true }
            : prev.thesis,
        summary: draftFilesToRemove.summary
          ? null
          : summaryPdf
            ? { fileType: 'summary', fileName: summaryPdf.name, canPreview: true }
            : prev.summary,
        additional: draftFilesToRemove.additional
          ? null
          : supplementaryZip
            ? { fileType: 'additional', fileName: supplementaryZip.name, canPreview: false }
            : prev.additional,
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
