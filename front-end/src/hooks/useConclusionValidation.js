// components/conclusion-request/hooks/useConclusionValidation.js
import { useMemo } from 'react';

export default function useConclusionValidation({
  supervisor,
  titleText,
  titleEngText,
  abstractText,
  abstractEngText,
  lang,
  primarySdg,
  secondarySdg1,
  secondarySdg2,
  authorization,
  decl,
  embargoMotivations,
  embargoPeriod,
  otherEmbargoReason,
  licenseChoice,
  requiredSummary,
  summaryPdf,
  pdfFile,
  draftUploadedFiles,
}) {
  const needsEnglishTranslation = lang !== 'en';

  const detailsValid = useMemo(() => {
    return (
      supervisor &&
      String(titleText || '').trim().length > 0 &&
      String(abstractText || '').trim().length > 0 &&
      abstractText.length <= 3550 &&
      (!needsEnglishTranslation || String(titleEngText || '').trim().length > 0) &&
      (!needsEnglishTranslation || String(abstractEngText || '').trim().length > 0) &&
      (!needsEnglishTranslation || abstractEngText.length <= 3550) &&
      String(primarySdg || '').trim().length > 0 &&
      String(secondarySdg1 || '').trim().length > 0 &&
      String(secondarySdg2 || '').trim().length > 0
    );
  }, [
    supervisor,
    titleText,
    abstractText,
    abstractText?.length,
    needsEnglishTranslation,
    titleEngText,
    abstractEngText,
    abstractEngText?.length,
    primarySdg,
    secondarySdg1,
    secondarySdg2,
  ]);

  const allDeclarationsChecked = () => {
    switch (authorization) {
      case 'deny':
        return decl.decl1 && decl.decl3 && decl.decl4 && decl.decl5 && decl.decl6;
      case 'authorize':
        return decl.decl1 && decl.decl2 && decl.decl3 && decl.decl4 && decl.decl5 && decl.decl6;
      default:
        return false;
    }
  };

  const hasThesisUpload = !!pdfFile || !!draftUploadedFiles?.thesis;
  const hasSummaryUpload = !!summaryPdf || !!draftUploadedFiles?.summary;
  const summaryValid = !requiredSummary || hasSummaryUpload;
  const uploadsValid = hasThesisUpload && summaryValid;
  const baseValid = detailsValid && allDeclarationsChecked() && uploadsValid;

  const denyValid =
    authorization !== 'deny'
      ? true
      : embargoMotivations.length > 0 &&
        String(embargoPeriod || '').trim().length > 0 &&
        (!embargoMotivations.includes(7) || String(otherEmbargoReason || '').trim().length > 0);

  const authorizeValid = authorization !== 'authorize' ? true : String(licenseChoice || '').trim().length > 0;
  const authorizationSelected = authorization === 'authorize' || authorization === 'deny';

  const canSubmit = baseValid && denyValid && authorizeValid;

  return {
    needsEnglishTranslation,
    detailsValid,
    allDeclarationsChecked,
    uploadsValid,
    summaryValid,
    canSubmit,
    denyValid,
    authorizeValid,
    authorizationSelected,
  };
}
