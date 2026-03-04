import { useEffect } from 'react';

import { toDraftFileInfo } from '../utils/conclusionRequestDraftFiles';
import { toOption } from '../utils/conclusionRequestMappers';

const DRAFT_FILES_TO_REMOVE_RESET = { thesis: false, summary: false, additional: false };

const fetchBootstrapPayload = (API, i18nLanguage) => {
  return Promise.all([
    API.getLoggedStudentThesis(),
    API.getThesisProposalsTeachers(),
    API.getAvailableLicenses(i18nLanguage),
    API.getSustainableDevelopmentGoals(),
    API.getEmbargoMotivations(i18nLanguage),
    API.getThesisProposalsKeywords(i18nLanguage),
    API.getRequiredSummaryForLoggedStudent(),
    API.getThesisConclusionDraft().catch(() => null),
  ]).then(
    ([
      thesisData,
      teachersData,
      licensesData,
      sdgsData,
      embargoMotivationsData,
      keywordsData,
      requiredSummaryData,
      draftData,
    ]) => ({
      thesisData,
      teachersData,
      licensesData,
      sdgsData,
      embargoMotivationsData,
      keywordsData,
      requiredSummaryData,
      draftData,
    }),
  );
};

const buildCustomKeywordOption = text => ({
  value: text,
  label: text,
  keyword: text,
  variant: 'keyword',
});

const buildExistingKeywordOption = (id, text) => ({
  id,
  value: id,
  label: text,
  keyword: text,
  variant: 'keyword',
});

const extractDraftKeywordText = (keyword, id, keywordById) => {
  return (
    keyword?.keyword ??
    keyword?.label ??
    (Number.isFinite(id) ? keywordById.get(id) : null) ??
    (typeof keyword?.value === 'string' ? keyword.value : null)
  );
};

const normalizeSingleDraftKeyword = (keyword, keywordById) => {
  if (typeof keyword === 'string') {
    const text = keyword.trim();
    return text ? buildCustomKeywordOption(text) : null;
  }

  const id = Number(keyword?.id ?? keyword?.value);
  const text = extractDraftKeywordText(keyword, id, keywordById);
  if (typeof text !== 'string' || text.trim().length === 0) {
    return null;
  }

  const keywordText = text.trim();
  if (Number.isFinite(id) && id > 0) {
    return buildExistingKeywordOption(id, keywordText);
  }

  return buildCustomKeywordOption(keywordText);
};

const normalizeDraftKeywords = (draftKeywords, keywordsData) => {
  if (!Array.isArray(draftKeywords)) {
    return null;
  }

  const keywordById = new Map((keywordsData || []).map(keyword => [Number(keyword.id), keyword.keyword]));
  return draftKeywords.map(keyword => normalizeSingleDraftKeyword(keyword, keywordById)).filter(Boolean);
};

const normalizeDraftEmbargoMotivations = draftData => {
  if (!Array.isArray(draftData.embargo?.motivations)) {
    return [];
  }

  return draftData.embargo.motivations
    .map(motivation => ({
      motivationId: Number(motivation?.motivationId ?? motivation?.motivation_id),
      otherMotivation: motivation?.otherMotivation ?? motivation?.other_motivation ?? '',
    }))
    .filter(motivation => Number.isFinite(motivation.motivationId));
};

const applyDraftAuthorization = (draftData, normalizedEmbargoMotivations, setters) => {
  const hasDraftEmbargo = Boolean(draftData.embargo?.duration) || normalizedEmbargoMotivations.length > 0;

  if (hasDraftEmbargo) {
    setters.setAuthorization('deny');
    setters.setEmbargoPeriod(draftData.embargo?.duration || '');
    setters.setEmbargoMotivations(normalizedEmbargoMotivations.map(motivation => motivation.motivationId));
    const otherMotivation = normalizedEmbargoMotivations.find(
      motivation =>
        motivation.motivationId === 7 &&
        typeof motivation.otherMotivation === 'string' &&
        motivation.otherMotivation.trim().length > 0,
    );
    setters.setOtherEmbargoReason(otherMotivation?.otherMotivation || '');
    return;
  }

  if (draftData.licenseId) {
    setters.setAuthorization('authorize');
    setters.setEmbargoPeriod('');
    setters.setEmbargoMotivations([]);
    setters.setOtherEmbargoReason('');
    return;
  }

  setters.setAuthorization('');
  setters.setEmbargoPeriod('');
  setters.setEmbargoMotivations([]);
  setters.setOtherEmbargoReason('');
};

const resolveNotApplicableGoalIds = sdgsData => {
  return new Set(
    (sdgsData || [])
      .filter(goal => {
        const text = String(goal?.goal ?? goal?.goal_en ?? goal?.label ?? '').toLowerCase();
        return text.includes('not applicable') || text.includes('non applicabile');
      })
      .map(goal => Number(goal?.id ?? goal?.value))
      .filter(Number.isFinite),
  );
};

const normalizeDraftSdgs = (draftSdgs, sdgsData) => {
  if (!Array.isArray(draftSdgs)) {
    return null;
  }

  const normalizedDraftSdgs = draftSdgs
    .map(sdg => ({
      goalId: Number(sdg?.goalId ?? sdg?.goal_id),
      level: sdg?.level ?? sdg?.sdgLevel ?? sdg?.sdg_level ?? null,
    }))
    .filter(sdg => Number.isFinite(sdg.goalId));

  const primaryGoal = normalizedDraftSdgs.find(sdg => sdg.level === 'primary') || normalizedDraftSdgs[0];
  const secondaryGoals = normalizedDraftSdgs.filter(sdg => sdg.level === 'secondary');
  const fallbackSecondaryGoals = normalizedDraftSdgs.filter(sdg => sdg.goalId !== primaryGoal?.goalId);
  let resolvedSecondaryGoals = secondaryGoals.length > 0 ? secondaryGoals : fallbackSecondaryGoals.slice(0, 2);

  const notApplicableGoalIds = resolveNotApplicableGoalIds(sdgsData);
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

  return {
    primarySdg: primaryGoal ? primaryGoal.goalId : '',
    secondarySdg1: resolvedSecondaryGoals[0] ? resolvedSecondaryGoals[0].goalId : '',
    secondarySdg2: resolvedSecondaryGoals[1] ? resolvedSecondaryGoals[1].goalId : '',
  };
};

const applyThesisData = (thesisData, setters) => {
  if (!thesisData) {
    return;
  }

  if (thesisData.supervisor) {
    setters.setSupervisor(toOption(thesisData.supervisor));
  }
  setters.setThesis(thesisData);
  setters.setAbstractText(thesisData.topic || '');
  const coSup = thesisData.coSupervisors || thesisData.co_supervisors || [];
  setters.setCoSupervisors(coSup.map(toOption));
};

const applyDraftData = ({ draftData, thesisData, keywordsData, sdgsData }, setters) => {
  if (!draftData) {
    return;
  }

  setters.setTitleText(draftData.title || '');
  setters.setTitleEngText(draftData.titleEng || '');
  setters.setAbstractText(draftData.abstract || thesisData?.topic || '');
  setters.setAbstractEngText(draftData.abstractEng || '');

  if (draftData.language) {
    setters.setLang(draftData.language);
  }

  const normalizedKeywords = normalizeDraftKeywords(draftData.keywords, keywordsData);
  if (normalizedKeywords) {
    setters.setKeywords(normalizedKeywords);
  }

  const normalizedEmbargoMotivations = normalizeDraftEmbargoMotivations(draftData);
  applyDraftAuthorization(draftData, normalizedEmbargoMotivations, setters);

  if (draftData.licenseId) {
    setters.setLicenseChoice(draftData.licenseId);
  }

  if (Array.isArray(draftData.coSupervisors) && draftData.thesisDraftDate) {
    setters.setCoSupervisors(draftData.coSupervisors.map(toOption));
  }

  const normalizedSdgs = normalizeDraftSdgs(draftData.sdgs, sdgsData);
  if (normalizedSdgs) {
    setters.setPrimarySdg(normalizedSdgs.primarySdg);
    setters.setSecondarySdg1(normalizedSdgs.secondarySdg1);
    setters.setSecondarySdg2(normalizedSdgs.secondarySdg2);
  }

  setters.setDraftUploadedFiles({
    thesis: toDraftFileInfo(draftData.thesisFilePath, 'thesis'),
    summary: toDraftFileInfo(draftData.thesisSummaryPath, 'summary'),
    additional: toDraftFileInfo(draftData.additionalZipPath, 'additional'),
  });
  setters.setDraftFilesToRemove(DRAFT_FILES_TO_REMOVE_RESET);
};

const applyReferenceData = (
  { teachersData, licensesData, sdgsData, embargoMotivationsData, keywordsData, requiredSummaryData },
  setters,
) => {
  if (teachersData) setters.setTeachers(teachersData);
  if (licensesData) setters.setLicenses(licensesData);
  if (sdgsData) setters.setSdgs(sdgsData);
  if (embargoMotivationsData) setters.setEmbargoMotivationsList(embargoMotivationsData);
  if (keywordsData) setters.setKeywordsList(keywordsData);
  if (requiredSummaryData) setters.setRequiredSummary(Boolean(requiredSummaryData.requiredSummary));
};

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
    const safe = setter => value => !cancelled && setter(value);

    const setters = {
      setIsLoading: safe(setIsLoading),
      setError: safe(setError),
      setTeachers: safe(setTeachers),
      setThesis: safe(setThesis),
      setSupervisor: safe(setSupervisor),
      setCoSupervisors: safe(setCoSupervisors),
      setLicenses: safe(setLicenses),
      setSdgs: safe(setSdgs),
      setEmbargoMotivationsList: safe(setEmbargoMotivationsList),
      setKeywordsList: safe(setKeywordsList),
      setRequiredSummary: safe(setRequiredSummary),
      setTitleText: safe(setTitleText),
      setTitleEngText: safe(setTitleEngText),
      setAbstractText: safe(setAbstractText),
      setAbstractEngText: safe(setAbstractEngText),
      setLang: safe(setLang),
      setKeywords: safe(setKeywords),
      setAuthorization: safe(setAuthorization),
      setLicenseChoice: safe(setLicenseChoice),
      setEmbargoPeriod: safe(setEmbargoPeriod),
      setEmbargoMotivations: safe(setEmbargoMotivations),
      setOtherEmbargoReason: safe(setOtherEmbargoReason),
      setPrimarySdg: safe(setPrimarySdg),
      setSecondarySdg1: safe(setSecondarySdg1),
      setSecondarySdg2: safe(setSecondarySdg2),
      setDraftUploadedFiles: safe(setDraftUploadedFiles),
      setDraftFilesToRemove: safe(setDraftFilesToRemove),
    };

    setters.setIsLoading(true);
    setters.setError('');

    const bootstrap = async () => {
      try {
        const payload = await fetchBootstrapPayload(API, i18nLanguage);
        if (cancelled) return;

        applyReferenceData(payload, setters);
        applyThesisData(payload.thesisData, setters);
        applyDraftData(payload, setters);
      } catch (err) {
        console.error('Error loading conclusion request data:', err);
        setters.setError('Errore nel caricamento dei dati. Riprova.');
      } finally {
        setters.setIsLoading(false);
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [API, i18nLanguage, loggedStudentId]);
}
