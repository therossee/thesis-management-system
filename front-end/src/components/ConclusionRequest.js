// components/ConclusionRequest.jsx
import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';

import { Button, Card, Col, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import PropTypes from 'prop-types';

import API from '../API';
import { LoggedStudentContext, ThemeContext, ToastContext } from '../App';
import useConclusionBootstrap from '../hooks/useConclusionBootstrap';
import useConclusionDraft from '../hooks/useConclusionDraft';
import useConclusionNavWidth from '../hooks/useConclusionNavWidth';
import useConclusionValidation from '../hooks/useConclusionValidation';
import '../styles/conclusion-process.css';
import { emptyDraftFiles, emptyDraftFilesToRemove } from '../utils/conclusionRequestDraftFiles';
import { makeTeacherOverviewPayload, toKeywordPayload, toOption } from '../utils/conclusionRequestMappers';
import { getSystemTheme } from '../utils/utils';
import CustomModal from './CustomModal';
import CustomSteps from './CustomSteps';
import LoadingModal from './LoadingModal';
import NotEligible from './NotEligible';
import { ConclusionRequestProvider } from './conclusion-request-steps/ConclusionRequestContext';
import StepAuthorization from './conclusion-request-steps/StepAuthorization';
import StepDeclarations from './conclusion-request-steps/StepDeclarations';
import StepDetails from './conclusion-request-steps/StepDetails';
import StepOutcome from './conclusion-request-steps/StepOutcome';
import StepSubmit from './conclusion-request-steps/StepSubmit';
import StepUploads from './conclusion-request-steps/StepUploads';

export default function ConclusionRequest({ onSubmitResult, saveDraftTrigger = 0, onSaveDraftResult }) {
  const { t, i18n } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const { loggedStudent } = useContext(LoggedStudentContext);
  const { showToast } = useContext(ToastContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;

  //eslint-disable-next-line no-unused-vars
  const [error, setError] = useState('');

  // form state (rimane qui, ma ora è “solo stato”)
  const [titleText, setTitleText] = useState('');
  const [titleEngText, setTitleEngText] = useState('');
  const [abstractText, setAbstractText] = useState('');
  const [abstractEngText, setAbstractEngText] = useState('');

  const [supervisor, setSupervisor] = useState(null);
  const [coSupervisors, setCoSupervisors] = useState([]);
  const [thesis, setThesis] = useState(null);

  const [keywords, setKeywords] = useState([]);
  const [lang, setLang] = useState('it');

  const [licenses, setLicenses] = useState([]);
  const [sdgs, setSdgs] = useState([]);
  const [keywordsList, setKeywordsList] = useState([]);
  const [embargoMotivationsList, setEmbargoMotivationsList] = useState([]);

  const [primarySdg, setPrimarySdg] = useState('');
  const [secondarySdg1, setSecondarySdg1] = useState('');
  const [secondarySdg2, setSecondarySdg2] = useState('');

  const [authorization, setAuthorization] = useState('');
  const [licenseChoice, setLicenseChoice] = useState(6);
  const [embargoPeriod, setEmbargoPeriod] = useState('');
  const [embargoMotivations, setEmbargoMotivations] = useState([]);
  const [otherEmbargoReason, setOtherEmbargoReason] = useState('');

  const [requiredResume, setRequiredResume] = useState(false);
  const [resumePdf, setResumePdf] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [supplementaryZip, setSupplementaryZip] = useState(null);

  const [draftUploadedFiles, setDraftUploadedFiles] = useState(emptyDraftFiles);
  const [draftFilesToRemove, setDraftFilesToRemove] = useState(emptyDraftFilesToRemove);

  const [decl, setDecl] = useState({
    decl1: false,
    decl2: false,
    decl3: false,
    decl4: false,
    decl5: false,
    decl6: false,
  });

  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showSdgDescription, setShowSdgDescription] = useState(false);
  const [submissionOutcome, setSubmissionOutcome] = useState(null);

  const formBodyRef = useRef(null);
  const prevButtonRef = useRef(null);
  const nextButtonRef = useRef(null);

  // bootstrap data (ex useEffect gigante)
  useConclusionBootstrap({
    API,
    i18nLanguage: i18n.language,
    loggedStudentId: loggedStudent?.id,
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
    setRequiredResume,

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
  });

  // derived options
  const languageOptions = useMemo(
    () => [
      { value: 'it', label: t('carriera.conclusione_tesi.languages.it') },
      { value: 'en', label: t('carriera.conclusione_tesi.languages.en') },
    ],
    [t],
  );

  const selectedLanguage = useMemo(
    () => languageOptions.find(option => option.value === lang) || languageOptions[0],
    [languageOptions, lang],
  );

  const flagSelector = () => {
    switch (lang) {
      case 'en':
        return 'fi fi-gb';
      case 'it':
      default:
        return 'fi fi-it';
    }
  };

  const coSupervisorOptions = useMemo(() => {
    const supervisorId = supervisor ? supervisor.value : null;
    return teachers.filter(teacher => teacher.id !== supervisorId).map(toOption);
  }, [teachers, supervisor]);

  const sdgOptions = useMemo(() => {
    return (sdgs || []).map(sdg => ({
      value: sdg.id ?? sdg.value,
      label: sdg.goal ? `${sdg.id} - ${sdg.goal}` : sdg.label || `SDG ${sdg.id ?? sdg.value}`,
    }));
  }, [sdgs]);

  const isNotApplicableSdg = option => {
    const text = String(option?.label || '').toLowerCase();
    return text.includes('not applicable') || text.includes('non applicabile');
  };

  const checkRecommendedLicense = license => {
    return license?.name ? license.name.includes('CC BY-NC-ND') : license?.name_en?.includes('CC BY-NC-ND');
  };

  // validations
  const {
    needsEnglishTranslation,
    detailsValid,
    allDeclarationsChecked,
    resumeValid,
    canSubmit,
    denyValid,
    authorizeValid,
    authorizationSelected,
  } = useConclusionValidation({
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
    requiredResume,
    resumePdf,
    pdfFile,
  });

  const steps = useMemo(
    () => [
      { key: 'details', label: t('carriera.conclusione_tesi.steps.details') },
      { key: 'authorization', label: t('carriera.conclusione_tesi.steps.authorizations') },
      { key: 'uploads', label: t('carriera.conclusione_tesi.steps.uploads') },
      { key: 'declarations', label: t('carriera.conclusione_tesi.steps.declarations') },
      {
        key: 'submit',
        label: submissionOutcome
          ? t('carriera.conclusione_tesi.steps.outcome')
          : t('carriera.conclusione_tesi.steps.submit'),
      },
    ],
    [t, submissionOutcome],
  );

  const stepValidity = useMemo(
    () => [
      detailsValid,
      authorizationSelected && denyValid && authorizeValid,
      !!pdfFile && resumeValid,
      allDeclarationsChecked(),
      canSubmit,
    ],
    [
      detailsValid,
      authorizationSelected,
      denyValid,
      authorizeValid,
      pdfFile,
      resumeValid,
      allDeclarationsChecked,
      canSubmit,
    ],
  );

  const submitStepIndex = steps.length - 1;

  const stepItems = useMemo(
    () =>
      steps.map((step, index) => {
        if (index === submitStepIndex && currentStep === submitStepIndex) {
          if (submissionOutcome === 'success') return { label: step.label, status: 'done' };
          if (submissionOutcome === 'error') return { label: step.label, status: 'error' };
        }

        return {
          label: step.label,
          status:
            index < currentStep
              ? stepValidity[index]
                ? 'done'
                : 'in-progress'
              : index === currentStep
                ? 'current'
                : 'todo',
        };
      }),
    [steps, submitStepIndex, currentStep, submissionOutcome, stepValidity],
  );

  // nav buttons width
  const { navButtonsWidth, shouldSyncNavButtonsWidth } = useConclusionNavWidth({
    currentStep,
    stepsLength: steps.length,
    submissionOutcome,
    i18nLanguage: i18n.language,
    isSubmitting,
    prevButtonRef,
    nextButtonRef,
  });

  // scroll top on step
  React.useEffect(() => {
    if (formBodyRef.current) formBodyRef.current.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentStep]);

  // draft helpers
  const removeDraftUploadedFile = useCallback(fileType => {
    const keyByType = { thesis: 'thesis', resume: 'resume', additional: 'additional' };
    const key = keyByType[fileType];
    if (!key) return;

    setDraftUploadedFiles(prev => ({ ...prev, [key]: null }));
    setDraftFilesToRemove(prev => ({ ...prev, [key]: true }));
  }, []);

  const handleDraftFileAction = useCallback(
    async (fileType, fileName, openInNewTab = false) => {
      if (!thesis?.id) return;
      try {
        const response = await API.getThesisFile(thesis.id, fileType);
        const contentType = response.headers?.['content-type'];
        const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: contentType });
        const objectUrl = globalThis.URL.createObjectURL(blob);

        if (openInNewTab) {
          globalThis.open(objectUrl, '_blank', 'noopener,noreferrer');
          setTimeout(() => globalThis.URL.revokeObjectURL(objectUrl), 60000);
          return;
        }

        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName || `draft_${fileType}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => globalThis.URL.revokeObjectURL(objectUrl), 1000);
      } catch (err) {
        console.error('Error fetching draft file:', err);
        showToast?.({
          success: false,
          title: t('carriera.conclusione_tesi.download_error'),
          message: t('carriera.conclusione_tesi.download_error_content'),
        });
      }
    },
    [showToast, t, thesis?.id],
  );

  const toggleMotivation = (code, checked) => {
    setEmbargoMotivations(prev => {
      if (checked) return prev.includes(code) ? prev : [...prev, code];
      return prev.filter(x => x !== code);
    });
  };

  const buildConclusionFormData = useCallback(
    isDraft => {
      const formData = new FormData();

      const alignedTitleEng =
        lang === 'en' ? titleText : isDraft ? titleEngText : titleEngText === '' ? titleText : titleEngText;

      const alignedAbstractEng =
        lang === 'en'
          ? abstractText
          : isDraft
            ? abstractEngText
            : abstractEngText === ''
              ? abstractText
              : abstractEngText;

      formData.append('title', titleText);
      formData.append('titleEng', alignedTitleEng);
      formData.append('abstract', abstractText);
      formData.append('abstractEng', alignedAbstractEng);
      formData.append('language', lang);

      if (supervisor?.id) formData.append('supervisor', supervisor.id);

      if (coSupervisors?.length) {
        const toTeacher = makeTeacherOverviewPayload(teachers);
        const coSupervisorsPayload = coSupervisors.map(toTeacher).filter(Boolean);
        formData.append('coSupervisors', JSON.stringify(coSupervisorsPayload));
      }

      if (keywords?.length) {
        const keywordPayload = keywords.map(toKeywordPayload).filter(Boolean);
        formData.append('keywords', JSON.stringify(keywordPayload));
      }

      if (authorization === 'authorize') formData.append('licenseId', licenseChoice);

      if (primarySdg || secondarySdg1 || secondarySdg2) {
        formData.append(
          'sdgs',
          JSON.stringify([
            ...(primarySdg ? [{ goalId: primarySdg, level: 'primary' }] : []),
            ...(secondarySdg1 ? [{ goalId: secondarySdg1, level: 'secondary' }] : []),
            ...(secondarySdg2 ? [{ goalId: secondarySdg2, level: 'secondary' }] : []),
          ]),
        );
      }

      if (authorization === 'deny') {
        formData.append(
          'embargo',
          JSON.stringify({
            duration: embargoPeriod,
            motivations: embargoMotivations.map(m => ({
              motivationId: m,
              otherMotivation: m === 7 ? otherEmbargoReason : undefined,
            })),
          }),
        );
      }

      if (resumePdf) formData.append('thesisResume', resumePdf);
      if (pdfFile) formData.append('thesisFile', pdfFile);
      if (supplementaryZip) formData.append('additionalZip', supplementaryZip);

      if (isDraft && draftFilesToRemove.resume) formData.append('removeThesisResume', 'true');
      if (isDraft && draftFilesToRemove.thesis) formData.append('removeThesisFile', 'true');
      if (isDraft && draftFilesToRemove.additional) formData.append('removeAdditionalZip', 'true');

      return formData;
    },
    [
      abstractEngText,
      abstractText,
      authorization,
      coSupervisors,
      embargoMotivations,
      embargoPeriod,
      keywords,
      lang,
      licenseChoice,
      otherEmbargoReason,
      pdfFile,
      primarySdg,
      resumePdf,
      secondarySdg1,
      secondarySdg2,
      supplementaryZip,
      supervisor,
      titleEngText,
      titleText,
      teachers,
      draftFilesToRemove,
    ],
  );

  const { handleSaveDraft } = useConclusionDraft({
    API,
    saveDraftTrigger,
    onSaveDraftResult,
    setIsSubmitting,
    buildConclusionFormData,
    draftFilesToRemove,
    pdfFile,
    resumePdf,
    supplementaryZip,
    setDraftUploadedFiles,
    setDraftFilesToRemove,
  });

  const goToNextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    handleSaveDraft();
  };

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleUpload = async () => {
    setError('');
    if (!canSubmit) {
      setError('Compila tutti i campi obbligatori prima di inviare la richiesta.');
      return;
    }

    setIsSubmitting(true);
    try {
      setShowConfirmationModal(false);
      const formData = buildConclusionFormData(false);
      await API.sendThesisConclusionRequest(formData);

      setSubmissionOutcome('success');
      setCurrentStep(steps.length - 1);
      onSubmitResult(true);
    } catch (err) {
      console.error(err);
      setError('Invio fallito. Controlla i campi e riprova.');
      setSubmissionOutcome('error');
      setCurrentStep(steps.length - 1);
      onSubmitResult(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFileText = i18n.language === 'it' ? 'Rimuovi file' : 'Remove file';
  const status = thesis?.status;
  const canRequestConclusion = status === 'ongoing';

  const contextValue = useMemo(
    () => ({
      t,
      i18n,
      appliedTheme,

      supervisor,
      coSupervisorOptions,
      coSupervisors,
      setCoSupervisors,

      languageOptions,
      lang,
      selectedLanguage,
      setLang,

      titleText,
      setTitleText,
      titleEngText,
      setTitleEngText,
      abstractText,
      setAbstractText,
      abstractEngText,
      setAbstractEngText,

      keywords,
      setKeywords,
      keywordsList,

      needsEnglishTranslation,
      flagSelector,

      isSubmitting,
      showSdgDescription,
      setShowSdgDescription,
      sdgOptions,
      isNotApplicableSdg,
      primarySdg,
      setPrimarySdg,
      secondarySdg1,
      setSecondarySdg1,
      secondarySdg2,
      setSecondarySdg2,

      authorization,
      setAuthorization,
      embargoMotivationsList,
      embargoMotivations,
      toggleMotivation,
      otherEmbargoReason,
      setOtherEmbargoReason,
      embargoPeriod,
      setEmbargoPeriod,

      licenses,
      licenseChoice,
      setLicenseChoice,
      checkRecommendedLicense,

      resumePdf,
      setResumePdf,
      pdfFile,
      setPdfFile,
      supplementaryZip,
      setSupplementaryZip,

      draftUploadedFiles,
      handleDraftFileAction,
      removeDraftUploadedFile,
      removeFileText,

      decl,
      setDecl,
      allDeclarationsChecked,

      submissionOutcome,
      requiredResume,
    }),
    [
      t,
      i18n,
      appliedTheme,
      supervisor,
      coSupervisorOptions,
      coSupervisors,
      languageOptions,
      lang,
      selectedLanguage,
      titleText,
      titleEngText,
      abstractText,
      abstractEngText,
      keywords,
      keywordsList,
      needsEnglishTranslation,
      flagSelector,
      isSubmitting,
      showSdgDescription,
      sdgOptions,
      primarySdg,
      secondarySdg1,
      secondarySdg2,
      authorization,
      embargoMotivationsList,
      embargoMotivations,
      otherEmbargoReason,
      embargoPeriod,
      licenses,
      licenseChoice,
      checkRecommendedLicense,
      resumePdf,
      pdfFile,
      supplementaryZip,
      draftUploadedFiles,
      handleDraftFileAction,
      removeDraftUploadedFile,
      removeFileText,
      decl,
      allDeclarationsChecked,
      submissionOutcome,
      requiredResume,
    ],
  );

  if (isLoading) return <LoadingModal show={true} onHide={() => setIsLoading(false)} />;
  if (!canRequestConclusion) return <NotEligible />;

  return (
    <>
      {(isLoading || isSubmitting) && <LoadingModal show={true} onHide={() => {}} />}

      <Col className="mx-auto cr-conclusion-layout">
        <Card className="mb-3 roundCard py-2 d-flex justify-content-center align-items-center cr-steps-card">
          <Card.Body className="w-100">
            <div className={`cr-steps-header-row ${submissionOutcome ? 'cr-steps-header-row--steps-only' : ''}`}>
              {!submissionOutcome && (
                <>
                  <div className="cr-steps-actions cr-steps-actions-left">
                    <Button
                      ref={prevButtonRef}
                      className={`btn-outlined-${appliedTheme} cr-steps-nav-btn`}
                      size="md"
                      onClick={goToPreviousStep}
                      disabled={isSubmitting}
                      aria-hidden={currentStep === 0}
                      tabIndex={currentStep === 0 ? -1 : undefined}
                      style={{
                        ...(shouldSyncNavButtonsWidth && navButtonsWidth ? { width: `${navButtonsWidth}px` } : {}),
                        ...(currentStep === 0 ? { visibility: 'hidden', pointerEvents: 'none' } : {}),
                      }}
                    >
                      <i className="fa-solid fa-arrow-left pe-2" />
                      {t('carriera.conclusione_tesi.previous_step')}
                    </Button>
                  </div>

                  <CustomSteps steps={stepItems} title="Stato richiesta" />

                  <div className="cr-steps-actions cr-steps-actions-right">
                    {currentStep < steps.length - 1 ? (
                      <Button
                        ref={nextButtonRef}
                        className={`btn-primary-${appliedTheme} cr-steps-nav-btn`}
                        onClick={goToNextStep}
                        disabled={isSubmitting || !stepValidity[currentStep]}
                        style={
                          shouldSyncNavButtonsWidth && navButtonsWidth ? { width: `${navButtonsWidth}px` } : undefined
                        }
                      >
                        {t('carriera.conclusione_tesi.next_step')} <i className="fa-solid fa-arrow-right ps-2" />
                      </Button>
                    ) : (
                      <Button
                        ref={nextButtonRef}
                        className={`btn-primary-${appliedTheme} cr-steps-nav-btn`}
                        onClick={() => setShowConfirmationModal(true)}
                        disabled={!canSubmit || isSubmitting}
                      >
                        <i className="fa-solid fa-paper-plane pe-2" />
                        {isSubmitting ? t('carriera.conclusione_tesi.sending') : t('carriera.conclusione_tesi.submit')}
                      </Button>
                    )}
                  </div>
                </>
              )}

              {submissionOutcome && <CustomSteps steps={stepItems} title="Stato richiesta" />}
            </div>
          </Card.Body>
        </Card>

        <Card className="mb-3 roundCard py-2 d-flex justify-content-center align-items-center cr-form-card">
          <Card.Body className="cr-form-body w-100" ref={formBodyRef}>
            <div className="conclusion-process-content cr-clean">
              <ConclusionRequestProvider value={contextValue}>
                <Form>
                  {currentStep === 0 && <StepDetails />}
                  {currentStep === 1 && <StepAuthorization />}
                  {currentStep === 2 && <StepUploads />}
                  {currentStep === 3 && <StepDeclarations />}
                  {currentStep === 4 && (submissionOutcome ? <StepOutcome /> : <StepSubmit />)}
                </Form>
              </ConclusionRequestProvider>
            </div>
          </Card.Body>
        </Card>

        <CustomModal
          show={showConfirmationModal}
          handleClose={() => setShowConfirmationModal(false)}
          handleConfirm={handleUpload}
          titleText={t('carriera.conclusione_tesi.confirmation_modal.title')}
          bodyText={t('carriera.conclusione_tesi.confirmation_modal.body')}
          confirmText={t('carriera.conclusione_tesi.confirmation_modal.confirm_button')}
          confirmIcon="fa-solid fa-paper-plane"
          closeText={t('carriera.conclusione_tesi.confirmation_modal.cancel_button')}
          isLoading={isSubmitting}
        />
      </Col>
    </>
  );
}

ConclusionRequest.propTypes = {
  onSubmitResult: PropTypes.func.isRequired,
  saveDraftTrigger: PropTypes.number,
  onSaveDraftResult: PropTypes.func,
};
