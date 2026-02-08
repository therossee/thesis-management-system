import React from 'react';

import { Col, Form, Row } from 'react-bootstrap';

import CustomBadge from '../CustomBadge';
import CustomSelect from '../CustomSelect';
import { useConclusionRequest } from './ConclusionRequestContext';

export default function StepDetails() {
  const {
    t,
    supervisor,
    coSupervisorOptions,
    coSupervisors,
    setCoSupervisors,
    languageOptions,
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
  } = useConclusionRequest();

  return (
    <>
      <div className="cr-section">
        <div className="cr-section-title">
          <span>
            <i className="fa-regular fa-file-lines me-2"></i>
            {t('carriera.conclusione_tesi.details')}
          </span>
        </div>
        <div>
          <Row className="mb-3 g-3 align-items-start cr-first-row">
            <Col md={3}>
              <Form.Group>
                <Form.Label htmlFor="select-supervisor">{t('carriera.conclusione_tesi.supervisor')}</Form.Label>
                <div className="cr-supervisor-field">
                  <CustomBadge
                    variant="teacher_inline"
                    content={supervisor ? supervisor.label : t('carriera.conclusione_tesi.no_supervisor')}
                  />
                </div>
              </Form.Group>
            </Col>

            <Col md={7}>
              <Form.Group>
                <Form.Label htmlFor="select-cosupervisors">{t('carriera.conclusione_tesi.co_supervisors')}</Form.Label>
                <CustomSelect
                  mode="supervisor"
                  options={coSupervisorOptions}
                  selected={coSupervisors}
                  setSelected={setCoSupervisors}
                  isMulti={true}
                  menuOutside={true}
                  className="select-cosupervisors"
                  placeholder={t('carriera.richiesta_tesi.select_co_supervisors_placeholder')}
                  id="select-cosupervisors"
                />
                <span className="text-muted cr-help">{t('carriera.conclusione_tesi.co_supervisors_help')}</span>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label htmlFor="select-language">{t('carriera.conclusione_tesi.language')}</Form.Label>
                <CustomSelect
                  mode="supervisor"
                  options={languageOptions}
                  selected={selectedLanguage}
                  setSelected={selected => setLang(selected.value)}
                  isMulti={false}
                  isClearable={false}
                  menuOutside={true}
                  badgeVariant="language"
                  className="select-language"
                  id="select-language"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={12}>
              <Form.Group>
                <Form.Label htmlFor="title-original">
                  <i className={flagSelector()} /> {t('carriera.conclusione_tesi.title_original')}
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
                  <div className="text-muted cr-help mb-2">{t('carriera.conclusione_tesi.title_translation_help')}</div>
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
                  <i className={flagSelector()} /> {t('carriera.conclusione_tesi.abstract')}
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
                  <div className="text-muted cr-help">{t('carriera.conclusione_tesi.abstract_translation_help')}</div>
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
      </div>

      <div className="cr-section">
        <div className="cr-section-title">
          <i className="fa-regular fa-globe" />
          <span>
            Sustainable Development Goals - SDGs{' '}
            <button
              type="button"
              className="btn btn-link cr-sdg-toggle p-0"
              onClick={() => setShowSdgDescription(prev => !prev)}
              aria-expanded={showSdgDescription}
            >
              <i className={`fa-solid ${showSdgDescription ? 'fa-chevron-down' : 'fa-chevron-up'} me-2`} />
            </button>
          </span>
        </div>
        <div>
          <Row className="mb-2">
            <Col md={12}>
              {showSdgDescription && (
                <div className="text-muted cr-help mt-2">
                  <p dangerouslySetInnerHTML={{ __html: t('carriera.conclusione_tesi.sdg_description_1') }} />
                </div>
              )}
              <div className="text-muted cr-help">
                <p>{t('carriera.conclusione_tesi.sdg_description_2')}</p>
              </div>
            </Col>
          </Row>
          <div className="cr-sdg-sticky-selects">
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
                    id="primary-sdg"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label htmlFor="secondary-sdg-1">{t('carriera.conclusione_tesi.secondary_sdg_1')}</Form.Label>
                  <CustomSelect
                    mode="sdg"
                    options={sdgOptions.filter(option => option.value !== primarySdg && option.value !== secondarySdg2)}
                    selected={sdgOptions.find(option => option.value === secondarySdg1)}
                    setSelected={selected => setSecondarySdg1(selected ? selected.value : '')}
                    isMulti={false}
                    isClearable={true}
                    className="select-sdg"
                    id="secondary-sdg-1"
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label htmlFor="secondary-sdg-2">{t('carriera.conclusione_tesi.secondary_sdg_2')}</Form.Label>
                  <CustomSelect
                    mode="sdg"
                    options={sdgOptions.filter(option => option.value !== primarySdg && option.value !== secondarySdg1)}
                    selected={sdgOptions.find(option => option.value === secondarySdg2)}
                    setSelected={selected => setSecondarySdg2(selected ? selected.value : '')}
                    isMulti={false}
                    isClearable={true}
                    className="select-sdg"
                    id="secondary-sdg-2"
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
        </div>
      </div>
    </>
  );
}
