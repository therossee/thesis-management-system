// components/conclusion-request/hooks/useConclusionNavWidth.js
import { useEffect, useState } from 'react';

export default function useConclusionNavWidth({
  currentStep,
  stepsLength,
  submissionOutcome,
  i18nLanguage,
  isSubmitting,
  prevButtonRef,
  nextButtonRef,
}) {
  const [navButtonsWidth, setNavButtonsWidth] = useState(null);

  const shouldSync = currentStep < stepsLength - 1 && !submissionOutcome;

  useEffect(() => {
    if (!shouldSync) {
      setNavButtonsWidth(null);
      return;
    }

    const calc = () => {
      const prevWidth = prevButtonRef.current?.getBoundingClientRect().width || 0;
      const nextWidth = nextButtonRef.current?.getBoundingClientRect().width || 0;
      const maxWidth = Math.max(prevWidth, nextWidth);
      setNavButtonsWidth(maxWidth > 0 ? Math.ceil(maxWidth) : null);
    };

    calc();
    globalThis.addEventListener('resize', calc);
    return () => globalThis.removeEventListener('resize', calc);
  }, [
    currentStep,
    stepsLength,
    submissionOutcome,
    i18nLanguage,
    isSubmitting,
    shouldSync,
    prevButtonRef,
    nextButtonRef,
  ]);

  return { navButtonsWidth, shouldSyncNavButtonsWidth: shouldSync };
}
