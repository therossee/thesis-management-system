import { useEffect } from 'react';

import { toDraftFileInfo } from '../utils/conclusionRequestDraftFiles';
import { toOption } from '../utils/conclusionRequestMappers';

export default function useConclusionBootstrap({
  API,
  i18nLanguage,
  loggedStudentId,

  setIsLoading,
  setError,

  setTeachers,
  setThesis,
  setSupervisor,
  setCoSupervisors,

  setLicenses,
  setSdgs,
  setEmbargoMotivationsList,
  setKeywordsList,
  setRequiredSummary,

  // draft -> form setters
  setTitleText,
  setTitleEngText,
  setAbstractText,
  setAbstractEngText,
  setLang,
  setLicenseChoice,
  setPrimarySdg,
  setSecondarySdg1,
  setSecondarySdg2,
  setDraftUploadedFiles,
  setDraftFilesToRemove,
}) {
  useEffect(() => {
    let cancelled = false;
    const safe =
      fn =>
      (...args) =>
        !cancelled && fn(...args);

    const safeSetIsLoading = safe(setIsLoading);
    const safeSetError = safe(setError);

    safeSetIsLoading(true);
    safeSetError('');

    Promise.all([
      API.getLoggedStudentThesis(),
      API.getThesisProposalsTeachers(),
      API.getAvailableLicenses(i18nLanguage),
      API.getSustainableDevelopmentGoals(),
      API.getEmbargoMotivations(i18nLanguage),
      API.getThesisProposalsKeywords(i18nLanguage),
      API.getRequiredSummaryForLoggedStudent(),
      API.getThesisConclusionDraft().catch(() => null),
    ])
      .then(
        ([
          thesisData,
          teachersData,
          licensesData,
          sdgsData,
          embargoMotivationsData,
          keywordsData,
          requiredSummaryData,
          draftData,
        ]) => {
          if (cancelled) return;

          if (teachersData) setTeachers(teachersData);

          if (thesisData) {
            if (thesisData.supervisor) setSupervisor(toOption(thesisData.supervisor));
            setThesis(thesisData);

            // default: topic in abstract (come nel file originale)
            setAbstractText(thesisData.topic || '');

            const coSup = thesisData.coSupervisors || thesisData.co_supervisors || [];
            setCoSupervisors(coSup.map(toOption));
          }

          if (draftData) {
            setTitleText(draftData.title || '');
            setTitleEngText(draftData.titleEng || '');
            setAbstractText(draftData.abstract || thesisData?.topic || '');
            setAbstractEngText(draftData.abstractEng || '');
            if (draftData.language) setLang(draftData.language);
            if (draftData.licenseId) setLicenseChoice(draftData.licenseId);

            if (Array.isArray(draftData.coSupervisors)) {
              setCoSupervisors(draftData.coSupervisors.map(toOption));
            }

            if (Array.isArray(draftData.sdgs)) {
              const normalizedDraftSdgs = draftData.sdgs
                .map(sdg => ({
                  goalId: Number(sdg?.goalId ?? sdg?.goal_id),
                  level: sdg?.level ?? sdg?.sdgLevel ?? sdg?.sdg_level ?? null,
                }))
                .filter(sdg => Number.isFinite(sdg.goalId));

              const primaryGoal = normalizedDraftSdgs.find(sdg => sdg.level === 'primary') || normalizedDraftSdgs[0];
              const secondaryGoals = normalizedDraftSdgs.filter(sdg => sdg.level === 'secondary');
              const fallbackSecondaryGoals = normalizedDraftSdgs.filter(sdg => sdg.goalId !== primaryGoal?.goalId);
              const resolvedSecondaryGoals =
                secondaryGoals.length > 0 ? secondaryGoals : fallbackSecondaryGoals.slice(0, 2);

              setPrimarySdg(primaryGoal ? primaryGoal.goalId : '');
              setSecondarySdg1(resolvedSecondaryGoals[0] ? resolvedSecondaryGoals[0].goalId : '');
              setSecondarySdg2(resolvedSecondaryGoals[1] ? resolvedSecondaryGoals[1].goalId : '');
            }

            setDraftUploadedFiles({
              thesis: toDraftFileInfo(draftData.thesisFilePath, 'thesis'),
              summary: toDraftFileInfo(draftData.thesisSummaryPath, 'summary'),
              additional: toDraftFileInfo(draftData.additionalZipPath, 'additional'),
            });

            setDraftFilesToRemove({ thesis: false, summary: false, additional: false });
          }

          if (licensesData) setLicenses(licensesData);
          if (sdgsData) setSdgs(sdgsData);
          if (embargoMotivationsData) setEmbargoMotivationsList(embargoMotivationsData);
          if (keywordsData) setKeywordsList(keywordsData);
          if (requiredSummaryData) setRequiredSummary(Boolean(requiredSummaryData.requiredSummary));
        },
      )
      .catch(err => {
        console.error('Error loading conclusion request data:', err);
        safeSetError('Errore nel caricamento dei dati. Riprova.');
      })
      .finally(() => safeSetIsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [API, i18nLanguage, loggedStudentId]);
}
