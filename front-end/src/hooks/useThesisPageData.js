import { useEffect, useState } from 'react';

export default function useThesisPageData({ thesis, thesisApplication, dataId, API }) {
  const [isLoading, setIsLoading] = useState(false);
  const [sessionDeadlines, setSessionDeadlines] = useState({ graduationSession: null, deadlines: [] });
  const [isEligible, setIsEligible] = useState(true);
  const [requiredSummary, setRequiredSummary] = useState(false);
  const [appStatusHistory, setAppStatusHistory] = useState(thesis ? thesis.applicationStatusHistory : []);

  useEffect(() => {
    let cancelled = false;
    const safe =
      fn =>
      (...args) =>
        !cancelled && fn(...args);

    const safeSetIsLoading = safe(setIsLoading);
    const safeSetSessionDeadlines = safe(setSessionDeadlines);
    const safeSetIsEligible = safe(setIsEligible);
    const safeSetRequiredSummary = safe(setRequiredSummary);
    const safeSetAppStatusHistory = safe(setAppStatusHistory);

    async function run() {
      safeSetIsLoading(true);

      try {
        const eligibilityRes = await API.checkStudentEligibility();
        safeSetIsEligible(Boolean(eligibilityRes?.eligible));

        if (thesis) {
          const [deadlinesRes, requiredSummaryRes] = await Promise.all([
            API.getSessionDeadlines('thesis'),
            API.getRequiredSummaryForLoggedStudent(),
          ]);

          safeSetSessionDeadlines(deadlinesRes);
          safeSetRequiredSummary(Boolean(requiredSummaryRes?.requiredSummary));
          safeSetAppStatusHistory(thesis.applicationStatusHistory || []);
          return;
        }

        if (thesisApplication) {
          const [historyRes, deadlinesRes] = await Promise.all([
            API.getStatusHistoryApplication(dataId),
            API.getSessionDeadlines('application'),
          ]);

          safeSetAppStatusHistory(historyRes || []);
          safeSetSessionDeadlines(deadlinesRes);
          return;
        }

        const deadlinesRes = await API.getSessionDeadlines('no_application');
        safeSetSessionDeadlines(deadlinesRes);
        safeSetAppStatusHistory([]);
      } catch (err) {
        console.error('Error fetching thesis page data:', err);
      } finally {
        safeSetIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [thesis, thesisApplication, dataId, API]);

  return {
    isLoading,
    sessionDeadlines,
    isEligible,
    requiredSummary,
    appStatusHistory,
    setAppStatusHistory,
  };
}
