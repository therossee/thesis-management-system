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
  setKeywords,
  setAuthorization,
  setLicenseChoice,
  setEmbargoPeriod,
  setEmbargoMotivations,
  setOtherEmbargoReason,
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

            if (Array.isArray(draftData.keywords)) {
              const keywordById = new Map((keywordsData || []).map(keyword => [Number(keyword.id), keyword.keyword]));
              const normalizedKeywords = draftData.keywords
                .map(keyword => {
                  if (typeof keyword === 'string') {
                    const text = keyword.trim();
                    if (!text) return null;
                    return {
                      value: text,
                      label: text,
                      keyword: text,
                      variant: 'keyword',
                    };
                  }

                  const id = Number(keyword?.id ?? keyword?.value);
                  const text =
                    keyword?.keyword ??
                    keyword?.label ??
                    (Number.isFinite(id) ? keywordById.get(id) : null) ??
                    (typeof keyword?.value === 'string' ? keyword.value : null);

                  if (Number.isFinite(id) && id > 0 && typeof text === 'string' && text.trim().length > 0) {
                    const keywordText = text.trim();
                    return {
                      id,
                      value: id,
                      label: keywordText,
                      keyword: keywordText,
                      variant: 'keyword',
                    };
                  }

                  if (typeof text === 'string' && text.trim().length > 0) {
                    const keywordText = text.trim();
                    return {
                      value: keywordText,
                      label: keywordText,
                      keyword: keywordText,
                      variant: 'keyword',
                    };
                  }

                  return null;
                })
                .filter(Boolean);

              setKeywords(normalizedKeywords);
            }

            const normalizedEmbargoMotivations = Array.isArray(draftData.embargo?.motivations)
              ? draftData.embargo.motivations
                  .map(motivation => ({
                    motivationId: Number(motivation?.motivationId ?? motivation?.motivation_id),
                    otherMotivation: motivation?.otherMotivation ?? motivation?.other_motivation ?? '',
                  }))
                  .filter(motivation => Number.isFinite(motivation.motivationId))
              : [];

            const hasDraftEmbargo = Boolean(draftData.embargo?.duration) || normalizedEmbargoMotivations.length > 0;

            if (hasDraftEmbargo) {
              setAuthorization('deny');
              setEmbargoPeriod(draftData.embargo?.duration || '');
              setEmbargoMotivations(normalizedEmbargoMotivations.map(motivation => motivation.motivationId));
              const otherMotivation = normalizedEmbargoMotivations.find(
                motivation =>
                  motivation.motivationId === 7 &&
                  typeof motivation.otherMotivation === 'string' &&
                  motivation.otherMotivation.trim().length > 0,
              );
              setOtherEmbargoReason(otherMotivation?.otherMotivation || '');
            } else if (draftData.licenseId) {
              setAuthorization('authorize');
              setEmbargoPeriod('');
              setEmbargoMotivations([]);
              setOtherEmbargoReason('');
            } else {
              setAuthorization('');
              setEmbargoPeriod('');
              setEmbargoMotivations([]);
              setOtherEmbargoReason('');
            }

            if (draftData.licenseId) setLicenseChoice(draftData.licenseId);

            if (Array.isArray(draftData.coSupervisors) && draftData.thesisDraftDate) {
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
              let resolvedSecondaryGoals =
                secondaryGoals.length > 0 ? secondaryGoals : fallbackSecondaryGoals.slice(0, 2);

              const notApplicableGoalIds = new Set(
                (sdgsData || [])
                  .filter(goal => {
                    const text = String(goal?.goal ?? goal?.goal_en ?? goal?.label ?? '').toLowerCase();
                    return text.includes('not applicable') || text.includes('non applicabile');
                  })
                  .map(goal => Number(goal?.id ?? goal?.value))
                  .filter(Number.isFinite),
              );
              const primaryGoalId = Number(primaryGoal?.goalId);
              const isPrimaryNotApplicable = Number.isFinite(primaryGoalId) && notApplicableGoalIds.has(primaryGoalId);

              if (isPrimaryNotApplicable && resolvedSecondaryGoals.length === 0) {
                resolvedSecondaryGoals = [
                  { goalId: primaryGoalId, level: 'secondary' },
                  { goalId: primaryGoalId, level: 'secondary' },
                ];
              } else if (
                isPrimaryNotApplicable &&
                resolvedSecondaryGoals.length === 1 &&
                Number(resolvedSecondaryGoals[0]?.goalId) === primaryGoalId
              ) {
                resolvedSecondaryGoals = [resolvedSecondaryGoals[0], { goalId: primaryGoalId, level: 'secondary' }];
              }

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
