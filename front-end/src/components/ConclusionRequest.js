import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';

import { Alert, Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import PropTypes from 'prop-types';

import API from '../API';
import { ThemeContext } from '../App';
import '../styles/modal-conclusion.css';
import { getSystemTheme } from '../utils/utils';
import CustomBadge from './CustomBadge';
import CustomSelect from './CustomSelect';
import LoadingModal from './LoadingModal';
import SegmentedControl from './SegmentedControl';

export default function ConclusionRequest({ show, setShow, onSubmitResult }) {
  const { t, i18n } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;

  const [error, setError] = useState('');

  const [titleText, setTitleText] = useState('');
  const [titleEngText, setTitleEngText] = useState('');
  const [abstractText, setAbstractText] = useState('');
  const [abstractEngText, setAbstractEngText] = useState('');

  const [supervisor, setSupervisor] = useState(null);
  const [coSupervisors, setCoSupervisors] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [lang, setLang] = useState('it');
  const [licenses, setLicenses] = useState([]);
  const [sdgs, setSdgs] = useState([]);
  const [keywordsList, setKeywordsList] = useState([]);
  const [thesis, setThesis] = useState(null);
  const [embargoMotivationsList, setEmbargoMotivationsList] = useState([]);

  const [primarySdg, setPrimarySdg] = useState('');
  const [secondarySdg1, setSecondarySdg1] = useState('');
  const [secondarySdg2, setSecondarySdg2] = useState('');

  const [authorization, setAuthorization] = useState('authorize'); // authorize | deny
  const [licenseChoice, setLicenseChoice] = useState(6);
  const [embargoPeriod, setEmbargoPeriod] = useState(''); // nessuna opzione selezionata all'inizio
  const [embargoMotivations, setEmbargoMotivations] = useState([]); // nessuna motivazione selezionata all'inizio
  const [otherEmbargoReason, setOtherEmbargoReason] = useState('');

  const [resumePdf, setResumePdf] = useState(null); // idSmPdfFile (riassunto)
  const [pdfFile, setPdfFile] = useState(null); // idPdfFile (tesi pdf/a)
  const [supplementaryZip, setSupplementaryZip] = useState(null); // idZipFile

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

  const authorizationControlRef = useRef(null);
  const authorizationAuthorizeRef = useRef(null);
  const authorizationDenyRef = useRef(null);

  const toOption = teacher => ({
    value: teacher.id,
    label: `${teacher.lastName} ${teacher.firstName}`,
    email: teacher.email,
    variant: 'teacher',
  });

  const languageOptions = [
    { value: 'it', label: t('carriera.conclusione_tesi.languages.it') },
    { value: 'en', label: t('carriera.conclusione_tesi.languages.en') },
    { value: 'jp', label: t('carriera.conclusione_tesi.languages.jp') },
    { value: 'es', label: t('carriera.conclusione_tesi.languages.es') },
    { value: 'fr', label: t('carriera.conclusione_tesi.languages.fr') },
    { value: 'pt', label: t('carriera.conclusione_tesi.languages.pt') },
    { value: 'zh', label: t('carriera.conclusione_tesi.languages.zh') },
    { value: 'se', label: t('carriera.conclusione_tesi.languages.se') },
    { value: 'de', label: t('carriera.conclusione_tesi.languages.de') },
    { value: 'ru', label: t('carriera.conclusione_tesi.languages.ru') },
  ];

  const flagSelector = () => {
    switch (lang) {
      case 'it':
        return 'fi fi-it';
      case 'en':
        return 'fi fi-gb';
      case 'jp':
        return 'fi fi-jp';
      case 'es':
        return 'fi fi-es';
      case 'fr':
        return 'fi fi-fr';
      case 'pt':
        return 'fi fi-pt';
      case 'zh':
        return 'fi fi-cn';
      case 'se':
        return 'fi fi-se';
      case 'de':
        return 'fi fi-de';
      case 'ru':
        return 'fi fi-ru';
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
    if (!show) return;

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
      })
      .finally(() => setIsLoading(false));
  }, [show]);

  const sdgOptions = useMemo(() => {
    return (sdgs || []).map(sdg => ({
      value: sdg.id ?? sdg.value,
      label: sdg.goal ? `${sdg.id} - ${sdg.goal}` : sdg.label || `SDG ${sdg.id ?? sdg.value}`,
    }));
  }, [sdgs, t]);

  const resetForm = () => {
    setError('');
    setCoSupervisors(thesis.coSupervisors ? thesis.coSupervisors.map(toOption) : []);
    setTitleText('');
    setTitleEngText('');
    setAbstractText(thesis ? thesis.topic || '' : '');
    setAbstractEngText('');
    setKeywords([]);
    setLang('it');

    setPrimarySdg('');
    setSecondarySdg1('');
    setSecondarySdg2('');

    setAuthorization('authorize');
    setLicenseChoice(6);
    setEmbargoPeriod('');
    setEmbargoMotivations([]);
    setOtherEmbargoReason('');

    setResumePdf(null);
    setPdfFile(null);
    setSupplementaryZip(null);

    setDecl({ decl1: false, decl2: false, decl3: false, decl4: false, decl5: false, decl6: false });
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setShow(false);
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
    }
  };

  const needsEnglishTranslation = lang !== 'en';

  const baseValid =
    supervisor &&
    String(titleText || '').trim().length > 0 &&
    String(abstractText || '').trim().length > 0 &&
    abstractText.length <= 3550 &&
    (!needsEnglishTranslation || String(titleEngText || '').trim().length > 0) &&
    (!needsEnglishTranslation || String(abstractEngText || '').trim().length > 0) &&
    (!needsEnglishTranslation || abstractEngText.length <= 3550) &&
    allDeclarationsChecked() &&
    !!pdfFile; // almeno la tesi pdf/a deve esserci per inviare

  const denyValid =
    authorization !== 'deny'
      ? true
      : embargoMotivations.length > 0 &&
        String(embargoPeriod || '').trim().length > 0 &&
        (!embargoMotivations.includes('0') || String(otherEmbargoReason || '').trim().length > 0);

  const authorizeValid = authorization !== 'authorize' ? true : String(licenseChoice || '').trim().length > 0;

  const canSubmit = baseValid && denyValid && authorizeValid;

  const handleUpload = async () => {
    setError('');
    if (!canSubmit) {
      setError('Compila tutti i campi obbligatori prima di inviare la richiesta.');
      return;
    }

    setIsSubmitting(true);
    try {
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

      if (onSubmitResult) onSubmitResult(true);
      handleClose();
      resetForm();
    } catch (err) {
      console.error(err);
      setError('Invio fallito. Controlla i campi e riprova.');
      if (onSubmitResult) onSubmitResult(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkRecommendedLicense = license => {
    return license.name ? license.name.includes('CC BY-NC-ND') : license.name_en.includes('CC BY-NC-ND');
  };

  if (isLoading) return <LoadingModal show={true} onHide={() => setIsLoading(false)} />;

  return (
    <Modal
      show={show}
      onHide={handleClose}
      centered
      backdrop="static"
      keyboard={!isSubmitting}
      dialogClassName="modal-conclusion"
      contentClassName="modal-conclusion-content-shell"
    >
      <Modal.Header closeButton={!isSubmitting}>
        <Modal.Title className="cr-modal-title">
          <i className="fa-regular fa-typewriter me-2" />
          Conclusione Tesi
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ maxHeight: '75vh', overflow: 'hidden', padding: 0 }}>
        <div className="modal-conclusion-scroll">
          <div className="modal-conclusion-content cr-clean">
            {error ? (
              <Alert variant="danger" className="m-3 mb-0">
                {error}
              </Alert>
            ) : null}

            <Form>
              <div className="cr-section">
                <div className="cr-section-title">
                  <span>
                    <i className="fa-regular fa-file-lines me-2"></i>
                    {t('carriera.conclusione_tesi.details')}
                  </span>
                </div>

                <Row className="mb-3 align-items-start">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label htmlFor="select-language">{t('carriera.conclusione_tesi.language')}</Form.Label>
                      <CustomSelect
                        mode="supervisor"
                        options={languageOptions}
                        selected={selectedLanguage}
                        setSelected={selected => setLang(selected.value)}
                        isMulti={false}
                        isClearable={false}
                        badgeVariant="language"
                        className="select-language"
                        id="select-language"
                      />
                    </Form.Group>
                  </Col>

                  <Col>
                    <Form.Group>
                      <Form.Label htmlFor="select-supervisor">{t('carriera.conclusione_tesi.supervisor')}</Form.Label>
                      <CustomSelect
                        mode="supervisor"
                        options={supervisor ? [supervisor] : []}
                        selected={supervisor}
                        setSelected={setSupervisor}
                        isMulti={false}
                        isDisabled={true}
                        className="select-supervisor"
                        id="select-supervisor"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label htmlFor="select-cosupervisors">
                        {t('carriera.conclusione_tesi.co_supervisors')}
                      </Form.Label>
                      <CustomSelect
                        mode="supervisor"
                        options={coSupervisorOptions}
                        selected={coSupervisors}
                        setSelected={setCoSupervisors}
                        isMulti={true}
                        className="select-cosupervisors"
                        placeholder={t('carriera.richiesta_tesi.select_co_supervisors_placeholder')}
                        id="select-cosupervisors"
                      />
                      <span className="text-muted cr-help">{t('carriera.conclusione_tesi.co_supervisors_help')}</span>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label htmlFor="title-original">
                        <i className={flagSelector(lang)} /> {t('carriera.conclusione_tesi.title_original')}
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        value={titleText}
                        maxLength={255}
                        onChange={e => setTitleText(e.target.value)}
                        disabled={isSubmitting}
                        id="title-original"
                      />
                    </Form.Group>
                    <div className="text-end text-muted">{titleText.length} / 255</div>
                  </Col>
                </Row>

                {needsEnglishTranslation && (
                  <Row className="mb-3">
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label htmlFor="title-translation">
                          <i className="fi fi-gb" /> {t('carriera.conclusione_tesi.title_translation')}
                        </Form.Label>
                        <div className="text-muted cr-help mb-2">
                          {t('carriera.conclusione_tesi.title_translation_help')}
                        </div>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={titleEngText}
                          onChange={e => setTitleEngText(e.target.value)}
                          maxLength={255}
                          disabled={isSubmitting}
                          id="title-translation"
                        />
                        <div className="text-end text-muted">{titleEngText.length} / 255</div>
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                <Row className="mb-3">
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label htmlFor="abstract">
                        <i className={flagSelector(lang)} /> {t('carriera.conclusione_tesi.abstract')}
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={6}
                        value={abstractText}
                        onChange={e => setAbstractText(e.target.value)}
                        maxLength={3550}
                        disabled={isSubmitting}
                        id="abstract"
                      />
                      <div className="text-end text-muted">{abstractText.length} / 3550</div>
                    </Form.Group>
                  </Col>
                </Row>
                {needsEnglishTranslation && (
                  <Row className="mb-3">
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label htmlFor="abstract-translation">
                          <i className="fi fi-gb" /> {t('carriera.conclusione_tesi.abstract_translation')}
                        </Form.Label>
                        <div className="text-muted cr-help">
                          {t('carriera.conclusione_tesi.abstract_translation_help')}
                        </div>
                        <Form.Control
                          as="textarea"
                          rows={6}
                          value={abstractEngText}
                          onChange={e => setAbstractEngText(e.target.value)}
                          maxLength={3550}
                          disabled={isSubmitting}
                          id="abstract-translation"
                        />
                        <div className="text-end text-muted">{abstractEngText.length} / 3550</div>
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                <Row className="mb-3">
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label htmlFor="keywords">Keywords</Form.Label>
                      <CustomSelect
                        mode="keyword"
                        selected={keywords}
                        setSelected={setKeywords}
                        placeholder={t('carriera.conclusione_tesi.select_keywords_placeholder')}
                        options={keywordsList.map(kw => ({
                          value: kw.keyword,
                          label: kw.keyword,
                          variant: 'keyword',
                        }))}
                        isMulti={true}
                        isDisabled={isSubmitting}
                        id="keywords"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              {/* SDG */}
              <div className="cr-section">
                <div className="cr-section-title">
                  <i className="fa-regular fa-globe" />
                  <span>Sustainable Development Goals - SDGs</span>
                </div>

                <Row className="mb-2">
                  <Col md={12}>
                    <div className="text-muted cr-help">
                      <p dangerouslySetInnerHTML={{ __html: t('carriera.conclusione_tesi.sdg_description_1') }} />
                    </div>
                    <div className="text-muted cr-help">
                      <b>{t('carriera.conclusione_tesi.sdg_description_2')}</b>
                    </div>
                  </Col>
                </Row>
                <Row className="mb-2 g-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label htmlFor="primary-sdg">{t('carriera.conclusione_tesi.primary_sdg')}</Form.Label>
                      <CustomSelect
                        mode="sdg"
                        options={sdgOptions.filter(
                          option => option.value !== secondarySdg1 && option.value !== secondarySdg2,
                        )}
                        selected={sdgOptions.find(option => option.value === primarySdg)}
                        setSelected={selected => setPrimarySdg(selected ? selected.value : '')}
                        isMulti={false}
                        isClearable={true}
                        className="select-sdg"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label htmlFor="secondary-sdg-1">
                        {t('carriera.conclusione_tesi.secondary_sdg_1')}
                      </Form.Label>
                      <CustomSelect
                        mode="sdg"
                        options={sdgOptions.filter(
                          option => option.value !== primarySdg && option.value !== secondarySdg2,
                        )}
                        selected={sdgOptions.find(option => option.value === secondarySdg1)}
                        setSelected={selected => setSecondarySdg1(selected ? selected.value : '')}
                        isMulti={false}
                        isClearable={true}
                        className="select-sdg"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group>
                      <Form.Label htmlFor="secondary-sdg-2">
                        {t('carriera.conclusione_tesi.secondary_sdg_2')}
                      </Form.Label>
                      <CustomSelect
                        mode="sdg"
                        options={sdgOptions.filter(
                          option => option.value !== primarySdg && option.value !== secondarySdg1,
                        )}
                        selected={sdgOptions.find(option => option.value === secondarySdg2)}
                        setSelected={selected => setSecondarySdg2(selected ? selected.value : '')}
                        isMulti={false}
                        isClearable={true}
                        className="select-sdg"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              {/* AUTORIZZAZIONE */}
              <div className="cr-section">
                <div className="cr-section-title">
                  {authorization === 'authorize' ? (
                    <i className="fa-regular fa-lock-open" />
                  ) : (
                    <i className="fa-regular fa-lock" />
                  )}
                  <span>{t('carriera.conclusione_tesi.authorization')}</span>
                </div>

                <Row className="mb-3">
                  <Col md={12}>
                    <SegmentedControl
                      name="autorizzazione"
                      segments={[
                        {
                          label: t('carriera.conclusione_tesi.authorization_authorize'),
                          value: 'authorize',
                          ref: authorizationAuthorizeRef,
                        },
                        {
                          label: t('carriera.conclusione_tesi.authorization_deny'),
                          value: 'deny',
                          ref: authorizationDenyRef,
                        },
                      ]}
                      callback={value => setAuthorization(value)}
                      defaultIndex={authorization === 'authorize' ? 0 : 1}
                      controlRef={authorizationControlRef}
                      style={{ width: '100%', maxWidth: '100%' }}
                      disabled={isSubmitting}
                    />
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href="https://didattica.polito.it/pdf/informazioni_secretazione.pdf"
                      className="cr-link"
                    >
                      {t('carriera.conclusione_tesi.authorization_info')}
                    </a>
                  </Col>
                </Row>

                {authorization === 'deny' && (
                  <>
                    <Row className="mb-3 g-3">
                      <Col md={7}>
                        <Form.Label htmlFor="motivations">{t('carriera.conclusione_tesi.motivations')}</Form.Label>
                        {embargoMotivationsList.map(mot => (
                          <>
                            <Form.Check
                              type="checkbox"
                              key={mot.id}
                              label={i18n.language === 'it' ? mot.motivation : mot.motivation_en}
                              checked={embargoMotivations.includes(mot.id)}
                              onChange={e => toggleMotivation(mot.id, e.target.checked)}
                              disabled={isSubmitting}
                              className="mb-2"
                            />
                            {mot.id === 7 && (
                              <Form.Control
                                type="text"
                                placeholder={t('carriera.conclusione_tesi.other_motivation_placeholder')}
                                value={otherEmbargoReason}
                                onChange={e => setOtherEmbargoReason(e.target.value)}
                                disabled={isSubmitting || !embargoMotivations.includes(7)}
                              />
                            )}
                          </>
                        ))}
                      </Col>

                      <Col md={5}>
                        <Form.Label htmlFor="embargo-period">
                          {t('carriera.conclusione_tesi.embargo_period.title')}
                        </Form.Label>

                        <Form.Check
                          type="radio"
                          name="embargo-period"
                          label={t('carriera.conclusione_tesi.embargo_period.12_months')}
                          checked={embargoPeriod === '12_months'}
                          onChange={() => setEmbargoPeriod('12_months')}
                          disabled={isSubmitting}
                        />
                        <Form.Check
                          type="radio"
                          name="embargo-period"
                          label={t('carriera.conclusione_tesi.embargo_period.18_months')}
                          checked={embargoPeriod === '18_months'}
                          onChange={() => setEmbargoPeriod('18_months')}
                          disabled={isSubmitting}
                        />
                        <Form.Check
                          type="radio"
                          name="embargo-period"
                          label={t('carriera.conclusione_tesi.embargo_period.36_months')}
                          checked={embargoPeriod === '36_months'}
                          onChange={() => setEmbargoPeriod('36_months')}
                          disabled={isSubmitting}
                        />
                        <Form.Check
                          type="radio"
                          name="embargo-period"
                          label={t('carriera.conclusione_tesi.embargo_period.after_explicit_consent')}
                          checked={embargoPeriod === 'after_explicit_consent'}
                          onChange={() => setEmbargoPeriod('after_explicit_consent')}
                          disabled={isSubmitting}
                        />
                      </Col>
                    </Row>
                    <Row className="mb-2">
                      <div className="text-muted cr-help">{t('carriera.conclusione_tesi.embargo_details')}</div>
                    </Row>
                  </>
                )}

                {authorization === 'authorize' && (
                  <Row className="mb-2">
                    <Col md={12}>
                      <Form.Label htmlFor="license-choice">{t('carriera.conclusione_tesi.license_choice')}</Form.Label>

                      {licenses.map(license => (
                        <Form.Check
                          type="radio"
                          name="license-choice"
                          key={license.id}
                          label={
                            <div className="d-flex flex-column align-items-start">
                              <div className="d-flex align-items-center">
                                <b>{i18n.language === 'it' ? license.name : license.name_en}</b>
                                {checkRecommendedLicense(license) && (
                                  <CustomBadge
                                    variant="recommended"
                                    content={
                                      <>
                                        <i className="fa-regular fa-thumbs-up" />{' '}
                                        {t('carriera.conclusione_tesi.license_recommended')}
                                      </>
                                    }
                                    style={{ marginLeft: '10px' }}
                                  />
                                )}
                              </div>
                              <div className="text-muted">
                                {i18n.language === 'it' ? (
                                  <p dangerouslySetInnerHTML={{ __html: license.description }}></p>
                                ) : (
                                  <p dangerouslySetInnerHTML={{ __html: license.description_en }}></p>
                                )}
                              </div>
                            </div>
                          }
                          checked={licenseChoice === license.id}
                          onChange={() => setLicenseChoice(license.id)}
                          disabled={isSubmitting}
                          className="mb-3"
                          id={`license-choice-${license.id}`}
                        />
                      ))}
                    </Col>
                  </Row>
                )}
              </div>

              {/* DOCUMENTI */}
              <div className="cr-section">
                <div className="cr-section-title">
                  <i className="fa-regular fa-file-upload" />
                  <span>{t('carriera.conclusione_tesi.documents_to_upload')}</span>
                </div>

                <Row className="mb-2">
                  <Col md={12}>
                    <Form.Label htmlFor="summary-for-committee-pdf">
                      {t('carriera.conclusione_tesi.summary_for_committee_pdf')}
                    </Form.Label>{' '}
                    <span className="text-muted">({t('carriera.conclusione_tesi.max_size_20_mb')})</span>
                    <div className="text-muted cr-help">
                      {t('carriera.conclusione_tesi.summary_for_committee_subtext')}
                    </div>
                    <Form.Group>
                      <Form.Control
                        type="file"
                        accept="application/pdf"
                        onChange={e => setResumePdf(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                        disabled={isSubmitting}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-2">
                  <Col md={12}>
                    <Form.Label htmlFor="final-thesis-pdfa">
                      {t('carriera.conclusione_tesi.final_thesis_pdfa')}
                    </Form.Label>{' '}
                    <span className="text-muted">({t('carriera.conclusione_tesi.max_size_200_mb')})</span>
                    <Form.Group>
                      <Form.Control
                        type="file"
                        accept="application/pdf"
                        onChange={e => setPdfFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                        disabled={isSubmitting}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-2">
                  <Col md={12}>
                    <Form.Label htmlFor="supplementary-zip">
                      {t('carriera.conclusione_tesi.supplementary_zip')}
                    </Form.Label>{' '}
                    <span>({t('carriera.conclusione_tesi.max_size_200_mb')})</span>
                    <Form.Group>
                      <Form.Control
                        type="file"
                        accept="application/zip"
                        onChange={e =>
                          setSupplementaryZip(e.target.files && e.target.files[0] ? e.target.files[0] : null)
                        }
                        disabled={isSubmitting}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              <Row className="mb-2">
                <div className="cr-section-title">
                  <i className="fa-regular fa-pen-to-square" />
                  <span>{t('carriera.conclusione_tesi.declarations.student_declarations')}</span>
                </div>
                <Col md="auto">
                  <div
                    style={{ backgroundColor: appliedTheme === 'dark' ? '#2c2c2c' : '#d9edf7', borderRadius: '6px' }}
                  >
                    <div className="ms-2 me-2 pt-2 pb-2">
                      <b>{t('carriera.conclusione_tesi.declarations.student_declarations_intro')}</b>
                      <Form.Check
                        type="checkbox"
                        label={t('carriera.conclusione_tesi.declarations.declaration_1')}
                        checked={decl.decl1}
                        onChange={e => setDecl(prev => ({ ...prev, decl1: e.target.checked }))}
                        disabled={isSubmitting}
                        id="declaration-1"
                      />
                      {authorization === 'authorize' && (
                        <Form.Check
                          type="checkbox"
                          label={t('carriera.conclusione_tesi.declarations.declaration_2')}
                          checked={decl.decl2}
                          onChange={e => setDecl(prev => ({ ...prev, decl2: e.target.checked }))}
                          disabled={isSubmitting}
                          id="declaration-2"
                        />
                      )}
                      <Form.Check
                        type="checkbox"
                        label={t('carriera.conclusione_tesi.declarations.declaration_3')}
                        checked={decl.decl3}
                        onChange={e => setDecl(prev => ({ ...prev, decl3: e.target.checked }))}
                        disabled={isSubmitting}
                        id="declaration-3"
                      />
                      <Form.Check
                        type="checkbox"
                        label={t('carriera.conclusione_tesi.declarations.declaration_4')}
                        checked={decl.decl4}
                        onChange={e => setDecl(prev => ({ ...prev, decl4: e.target.checked }))}
                        disabled={isSubmitting}
                        id="declaration-4"
                      />
                      <Form.Check
                        type="checkbox"
                        label={t('carriera.conclusione_tesi.declarations.declaration_5')}
                        checked={decl.decl5}
                        onChange={e => setDecl(prev => ({ ...prev, decl5: e.target.checked }))}
                        disabled={isSubmitting}
                        id="declaration-5"
                      />
                      <Form.Check
                        type="checkbox"
                        label={t('carriera.conclusione_tesi.declarations.declaration_6')}
                        checked={decl.decl6}
                        onChange={e => setDecl(prev => ({ ...prev, decl6: e.target.checked }))}
                        disabled={isSubmitting}
                        id="declaration-6"
                      />

                      {!allDeclarationsChecked && (
                        <div className="text-muted mt-2">
                          {t('carriera.conclusione_tesi.declarations.declarations_required')}
                        </div>
                      )}
                    </div>
                  </div>
                </Col>
              </Row>
            </Form>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-end gap-2">
        <Button className={`btn-outlined-${appliedTheme} mb-3`} size="md" onClick={() => resetForm()}>
          <i className="fa-solid fa-rotate-left pe-2" />
          {t('carriera.richiesta_tesi.reset')}
        </Button>

        <Button className={`btn-primary-${appliedTheme}`} onClick={handleUpload} disabled={!canSubmit || isSubmitting}>
          <i className="fa-solid fa-paper-plane pe-2" />
          {isSubmitting ? t('carriera.conclusione_tesi.sending') : t('carriera.conclusione_tesi.request_conclusion')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

ConclusionRequest.propTypes = {
  show: PropTypes.bool.isRequired,
  setShow: PropTypes.func.isRequired,
  onSubmitResult: PropTypes.func.isRequired,
};
