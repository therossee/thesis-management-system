import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';

import { Button, Card, Col, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import PropTypes from 'prop-types';

import API from '../API';
import { LoggedStudentContext, ThemeContext } from '../App';
import '../styles/conclusion-process.css';
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

export default function ConclusionRequest({ onSubmitResult }) {
  const { t, i18n } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const { loggedStudent } = useContext(LoggedStudentContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;

  const [error, setError] = useState('');

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

  const [resumePdf, setResumePdf] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [supplementaryZip, setSupplementaryZip] = useState(null);
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

  const toOption = teacher => ({
    value: teacher.id,
    label: `${teacher.lastName} ${teacher.firstName}`,
    email: teacher.email,
    variant: 'teacher',
  });

  const languageOptions = [
    { value: 'it', label: t('carriera.conclusione_tesi.languages.it') },
    { value: 'en', label: t('carriera.conclusione_tesi.languages.en') },
  ];

  const flagSelector = () => {
    switch (lang) {
      case 'it':
        return 'fi fi-it';
      case 'en':
        return 'fi fi-gb';
      default:
        return 'fi fi-it';
    }
  };

  const selectedLanguage = languageOptions.find(option => option.value === lang) || languageOptions[0];

  const coSupervisorOptions = useMemo(() => {
    const supervisorId = supervisor ? supervisor.value : null;
    return teachers.filter(teacher => teacher.id !== supervisorId).map(toOption);
  }, [teachers, supervisor]);

  useEffect(() => {
    setIsLoading(true);
    setError('');

    Promise.all([
      API.getLoggedStudentThesis(),
      API.getThesisProposalsTeachers(),
      API.getAvailableLicenses(i18n.language),
      API.getSustainableDevelopmentGoals(),
      API.getEmbargoMotivations(i18n.language),
      API.getThesisProposalsKeywords(i18n.language),
    ])
      .then(([thesisData, teachersData, licensesData, sdgsData, embargoMotivationsData, keywordsData]) => {
        if (teachersData) setTeachers(teachersData);

        if (thesisData) {
          if (thesisData.supervisor) setSupervisor(toOption(thesisData.supervisor));
          setThesis(thesisData);
          setAbstractText(thesisData.topic || '');
          const coSup = thesisData.coSupervisors || thesisData.co_supervisors || [];
          setCoSupervisors(coSup.map(toOption));
        }
        if (licensesData) {
          setLicenses(licensesData);
        }
        if (sdgsData) {
          setSdgs(sdgsData);
        }
        if (embargoMotivationsData) {
          setEmbargoMotivationsList(embargoMotivationsData);
        }
        if (keywordsData) {
          setKeywordsList(keywordsData);
        }
      })
      .catch(err => {
        console.error('Error loading conclusion request data:', err);
        setError('Errore nel caricamento dei dati. Riprova.');
        console.error(error);
      })
      .finally(() => setIsLoading(false));
  }, [i18n.language, loggedStudent?.id]);

  const sdgOptions = useMemo(() => {
    return (sdgs || []).map(sdg => ({
      value: sdg.id ?? sdg.value,
      label: sdg.goal ? `${sdg.id} - ${sdg.goal}` : sdg.label || `SDG ${sdg.id ?? sdg.value}`,
    }));
  }, [sdgs, t]);

  const handleSaveDraft = () => {};

  const resetForm = () => {
    setError('');
    setCoSupervisors(thesis?.coSupervisors ? thesis.coSupervisors.map(toOption) : []);
    setTitleText('');
    setTitleEngText('');
    setAbstractText(thesis ? thesis.topic || '' : '');
    setAbstractEngText('');
    setKeywords([]);
    setLang('it');

    setPrimarySdg('');
    setSecondarySdg1('');
    setSecondarySdg2('');

    setAuthorization('');
    setLicenseChoice(6);
    setEmbargoPeriod('');
    setEmbargoMotivations([]);
    setOtherEmbargoReason('');

    setResumePdf(null);
    setPdfFile(null);
    setSupplementaryZip(null);

    setDecl({ decl1: false, decl2: false, decl3: false, decl4: false, decl5: false, decl6: false });
    setCurrentStep(0);
    setSubmissionOutcome(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setError('');
  };

  const toggleMotivation = (code, checked) => {
    setEmbargoMotivations(prev => {
      if (checked) return prev.includes(code) ? prev : [...prev, code];
      return prev.filter(x => x !== code);
    });
  };

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

  const needsEnglishTranslation = lang !== 'en';

  const detailsValid =
    supervisor &&
    String(titleText || '').trim().length > 0 &&
    String(abstractText || '').trim().length > 0 &&
    abstractText.length <= 3550 &&
    (!needsEnglishTranslation || String(titleEngText || '').trim().length > 0) &&
    (!needsEnglishTranslation || String(abstractEngText || '').trim().length > 0) &&
    (!needsEnglishTranslation || abstractEngText.length <= 3550);

  const baseValid = detailsValid && allDeclarationsChecked() && !!pdfFile; // almeno la tesi pdf/a deve esserci per inviare

  const denyValid =
    authorization !== 'deny'
      ? true
      : embargoMotivations.length > 0 &&
        String(embargoPeriod || '').trim().length > 0 &&
        (!embargoMotivations.includes('0') || String(otherEmbargoReason || '').trim().length > 0);

  const authorizeValid = authorization !== 'authorize' ? true : String(licenseChoice || '').trim().length > 0;
  const authorizationSelected = authorization === 'authorize' || authorization === 'deny';

  const canSubmit = baseValid && denyValid && authorizeValid;

  const steps = [
    { key: 'details', label: 'Dettagli' },
    { key: 'authorization', label: 'Autorizzazione' },
    { key: 'uploads', label: 'Caricamento file' },
    { key: 'declarations', label: 'Dichiarazioni' },
    { key: 'submit', label: 'Invio' },
    { key: 'outcome', label: 'Esito' },
  ];

  const stepValidity = [
    detailsValid,
    authorizationSelected && denyValid && authorizeValid,
    !!pdfFile,
    allDeclarationsChecked(),
    canSubmit,
    true, // outcome step is always valid
  ];

  const stepItems = steps.map((step, index) => ({
    label: step.label,
    status:
      index < currentStep ? (stepValidity[index] ? 'done' : 'in-progress') : index === currentStep ? 'current' : 'todo',
  }));

  const goToNextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  useEffect(() => {
    if (formBodyRef.current) {
      formBodyRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [currentStep]);

  const handleUpload = async () => {
    setError('');
    if (!canSubmit) {
      setError('Compila tutti i campi obbligatori prima di inviare la richiesta.');
      return;
    }

    setIsSubmitting(true);
    try {
      setShowConfirmationModal(false);
      const formData = new FormData();
      formData.append('title', titleText);
      formData.append('titleEng', titleEngText === '' ? titleText : titleEngText);
      formData.append('abstract', abstractText);
      formData.append('abstractEng', abstractEngText === '' ? abstractText : abstractEngText);
      formData.append('language', lang);
      if (supervisor?.id) formData.append('supervisor', supervisor.id);
      if (coSupervisors?.length) {
        formData.append('coSupervisors', JSON.stringify(coSupervisors.map(cs => ({ id: cs.value ?? cs.id ?? cs }))));
      }
      if (keywords?.length) {
        const keywordPayload = keywords.map(k => k?.id ?? k?.value ?? k);
        formData.append('keywords', JSON.stringify(keywordPayload));
      }
      if (authorization === 'authorize') {
        formData.append('licenseId', licenseChoice);
      }
      if (primarySdg || secondarySdg1 || secondarySdg2) {
        formData.append(
          'sdgs',
          JSON.stringify([
            ...(primarySdg ? [{ id: primarySdg, level: 'primary' }] : []),
            ...(secondarySdg1 ? [{ id: secondarySdg1, level: 'secondary' }] : []),
            ...(secondarySdg2 ? [{ id: secondarySdg2, level: 'secondary' }] : []),
          ]),
        );
      }
      if (authorization === 'deny') {
        formData.append(
          'embargo',
          JSON.stringify({
            duration: embargoPeriod,
            motivations: embargoMotivations.map(m => ({
              id: m,
              other: m === 7 ? otherEmbargoReason : undefined,
            })),
          }),
        );
      }
      if (resumePdf) formData.append('thesisResume', resumePdf);
      if (pdfFile) formData.append('thesisFile', pdfFile);
      if (supplementaryZip) formData.append('additionalZip', supplementaryZip);

      await API.sendThesisConclusionRequest(formData);

      setSubmissionOutcome('success');
      setCurrentStep(steps.length - 1);
      onSubmitResult(true);
      handleClose();
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

  const checkRecommendedLicense = license => {
    return license.name ? license.name.includes('CC BY-NC-ND') : license.name_en.includes('CC BY-NC-ND');
  };

  const selectedLanguageLabel = selectedLanguage?.label || '-';
  const selectedLicense = licenses.find(license => license.id === licenseChoice) || null;
  const selectedLicenseLabel = selectedLicense
    ? i18n.language === 'it'
      ? selectedLicense.name
      : selectedLicense.name_en
    : '-';
  const selectedSdgLabels = [
    sdgOptions.find(option => option.value === primarySdg)?.label || null,
    sdgOptions.find(option => option.value === secondarySdg1)?.label || null,
    sdgOptions.find(option => option.value === secondarySdg2)?.label || null,
  ].filter(Boolean);
  const selectedEmbargoLabels = embargoMotivations
    .map(id => embargoMotivationsList.find(motivation => motivation.id === id))
    .filter(Boolean)
    .map(motivation => (i18n.language === 'it' ? motivation.motivation : motivation.motivation_en));
  const declarationsAcceptedCount = Object.values(decl).filter(Boolean).length;
  const declarationsTotalCount = authorization === 'authorize' ? 6 : 5;

  const removeFileText = i18n.language === 'it' ? 'Rimuovi file' : 'Remove file';
  const thesisStatus = thesis?.thesisStatus || thesis?.thesis_status;
  const canRequestConclusion = !thesisStatus || ['ongoing', 'conclusion_rejected'].includes(thesisStatus);
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
      removeFileText,
      decl,
      setDecl,
      allDeclarationsChecked,
      selectedLanguageLabel,
      selectedSdgLabels,
      selectedLicenseLabel,
      selectedEmbargoLabels,
      declarationsAcceptedCount,
      declarationsTotalCount,
      submissionOutcome,
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
      resumePdf,
      pdfFile,
      supplementaryZip,
      removeFileText,
      decl,
      selectedLanguageLabel,
      selectedSdgLabels,
      selectedLicenseLabel,
      selectedEmbargoLabels,
      declarationsAcceptedCount,
      declarationsTotalCount,
      submissionOutcome,
    ],
  );

  if (isLoading) return <LoadingModal show={true} onHide={() => setIsLoading(false)} />;
  if (!canRequestConclusion) {
    return <NotEligible />;
  }

  return (
    <>
      {(isLoading || isSubmitting) && <LoadingModal show={true} onHide={() => {}} />}
      <Col className="mx-auto cr-conclusion-layout">
        <Card className="mb-3 roundCard py-2 d-flex justify-content-center align-items-center cr-steps-card">
          <Card.Body className="w-100">
            <CustomSteps steps={stepItems} title="Stato richiesta" />
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
                  {currentStep === 4 && <StepSubmit />}
                  {currentStep === 5 && <StepOutcome />}
                </Form>
              </ConclusionRequestProvider>
            </div>
          </Card.Body>

          {currentStep < steps.length - 1 && (
            <Card.Footer className="cr-form-footer w-100">
              <div className="cr-form-footer-left">
                <Button
                  className={`btn-outlined-${appliedTheme}`}
                  size="md"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                >
                  <i className="fa-regular fa-floppy-disk pe-2" />
                  {t('carriera.conclusione_tesi.save_draft')}
                </Button>
                <Button className={`btn-outlined-${appliedTheme}`} size="md" onClick={() => resetForm()}>
                  <i className="fa-solid fa-rotate-left pe-2" />
                  {t('carriera.richiesta_tesi.reset')}
                </Button>
              </div>

              <div className="cr-form-footer-right">
                {currentStep > 0 && (
                  <Button
                    className={`btn-outlined-${appliedTheme}`}
                    size="md"
                    onClick={goToPreviousStep}
                    disabled={isSubmitting}
                  >
                    <i className="fa-solid fa-arrow-left pe-2" />
                    {t('carriera.conclusione_tesi.previous_step')}
                  </Button>
                )}

                {currentStep < steps.length - 2 ? (
                  <Button className={`btn-primary-${appliedTheme}`} onClick={goToNextStep} disabled={isSubmitting}>
                    {t('carriera.conclusione_tesi.next_step')} <i className="fa-solid fa-arrow-right ps-2" />
                  </Button>
                ) : currentStep === steps.length - 2 ? (
                  <Button
                    className={`btn-primary-${appliedTheme}`}
                    onClick={() => {
                      setShowConfirmationModal(true);
                    }}
                    disabled={!canSubmit || isSubmitting}
                  >
                    <i className="fa-solid fa-paper-plane pe-2" />
                    {isSubmitting
                      ? t('carriera.conclusione_tesi.sending')
                      : t('carriera.conclusione_tesi.request_conclusion')}
                  </Button>
                ) : null}
              </div>
            </Card.Footer>
          )}
        </Card>
        <CustomModal
          show={showConfirmationModal}
          handleClose={() => {
            setShowConfirmationModal(false);
          }}
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
};
