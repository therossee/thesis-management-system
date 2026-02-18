import React, { useState } from 'react';

import { Button, Col, Row } from 'react-bootstrap';

import CustomBadge from '../CustomBadge';
import CustomBlock from '../CustomBlock';
import { useConclusionRequest } from './ConclusionRequestContext';

export default function StepSubmit() {
  const {
    t,
    lang,
    supervisor,
    coSupervisors,
    selectedLanguageLabel,
    titleText,
    titleEngText,
    abstractText,
    abstractEngText,
    keywords,
    selectedSdgLabels,
    authorization,
    selectedLicenseLabel,
    selectedEmbargoLabels,
    embargoPeriod,
    resumePdf,
    pdfFile,
    supplementaryZip,
    declarationsAcceptedCount,
    declarationsTotalCount,
    requiredResume,
  } = useConclusionRequest();

  const [showFullTitle, setShowFullTitle] = useState(false);
  const [showFullTitleEng, setShowFullTitleEng] = useState(false);
  const [showFullAbstract, setShowFullAbstract] = useState(false);
  const [showFullAbstractEng, setShowFullAbstractEng] = useState(false);

  const normalizeText = value => String(value || '').trim() || '-';
  const TITLE_MAX = 90;
  const ABSTRACT_MAX = 180;

  return (
    <div className="cr-section cr-submit-summary">
      <div className="cr-section-title">
        <i className="fa-regular fa-clipboard-check" />
        <span>{t('carriera.conclusione_tesi.summary')}</span>
      </div>
      <Row className="g-3">
        <Col md={6}>
          <div className="cr-upload-card">
            <CustomBlock icon="user" title={t('carriera.conclusione_tesi.submit_labels.supervisor')} ignoreMoreLines>
              {supervisor?.label ? <CustomBadge variant="teacher" content={supervisor.label} /> : '-'}
            </CustomBlock>

            <CustomBlock icon="users" title={t('carriera.conclusione_tesi.co_supervisors')} ignoreMoreLines>
              {coSupervisors.length > 0 ? (
                <CustomBadge variant="teacher" content={coSupervisors.map(cs => cs.label)} />
              ) : (
                '-'
              )}
            </CustomBlock>

            <CustomBlock icon="flag" title={t('carriera.conclusione_tesi.submit_labels.language')} ignoreMoreLines>
              {selectedLanguageLabel && selectedLanguageLabel !== '-' ? (
                <CustomBadge
                  variant="language"
                  type="single_select"
                  content={{ id: lang, content: selectedLanguageLabel }}
                />
              ) : (
                '-'
              )}
            </CustomBlock>

            <CustomBlock
              icon="text-size"
              title={t('carriera.conclusione_tesi.submit_labels.title_original')}
              ignoreMoreLines
            >
              <>
                {normalizeText(titleText).length > TITLE_MAX && !showFullTitle
                  ? `${normalizeText(titleText).substring(0, TITLE_MAX - 3)}... `
                  : normalizeText(titleText)}
                {normalizeText(titleText).length > TITLE_MAX && (
                  <Button
                    variant="link"
                    onClick={() => setShowFullTitle(!showFullTitle)}
                    aria-expanded={showFullTitle}
                    className="p-0 custom-link d-inline-flex align-items-center gap-1 align-baseline"
                    style={{ fontSize: 'inherit', lineHeight: 'inherit', verticalAlign: 'baseline' }}
                  >
                    <i className={`fa-regular fa-chevron-${showFullTitle ? 'up' : 'down'} cosupervisor-button`} />
                    <span className="cosupervisor-button">
                      {t(`carriera.tesi.${showFullTitle ? 'show_less' : 'show_more'}`)}
                    </span>
                  </Button>
                )}
              </>
            </CustomBlock>

            {lang !== 'en' && (
              <CustomBlock
                icon="text-size"
                title={t('carriera.conclusione_tesi.submit_labels.title_english')}
                ignoreMoreLines
              >
                <>
                  {normalizeText(titleEngText).length > TITLE_MAX && !showFullTitleEng
                    ? `${normalizeText(titleEngText).substring(0, TITLE_MAX - 3)}... `
                    : normalizeText(titleEngText)}
                  {normalizeText(titleEngText).length > TITLE_MAX && (
                    <Button
                      variant="link"
                      onClick={() => setShowFullTitleEng(!showFullTitleEng)}
                      aria-expanded={showFullTitleEng}
                      className="p-0 custom-link d-inline-flex align-items-center gap-1 align-baseline"
                      style={{ fontSize: 'inherit', lineHeight: 'inherit', verticalAlign: 'baseline' }}
                    >
                      <i className={`fa-regular fa-chevron-${showFullTitleEng ? 'up' : 'down'} cosupervisor-button`} />
                      <span className="cosupervisor-button">
                        {t(`carriera.tesi.${showFullTitleEng ? 'show_less' : 'show_more'}`)}
                      </span>
                    </Button>
                  )}
                </>
              </CustomBlock>
            )}

            <CustomBlock
              icon="align-left"
              title={t('carriera.conclusione_tesi.submit_labels.abstract_original')}
              ignoreMoreLines
            >
              <>
                {normalizeText(abstractText).length > ABSTRACT_MAX && !showFullAbstract
                  ? `${normalizeText(abstractText).substring(0, ABSTRACT_MAX - 3)}... `
                  : normalizeText(abstractText)}
                {normalizeText(abstractText).length > ABSTRACT_MAX && (
                  <Button
                    variant="link"
                    onClick={() => setShowFullAbstract(!showFullAbstract)}
                    aria-expanded={showFullAbstract}
                    className="p-0 custom-link d-inline-flex align-items-center gap-1 align-baseline"
                    style={{ fontSize: 'inherit', lineHeight: 'inherit', verticalAlign: 'baseline' }}
                  >
                    <i className={`fa-regular fa-chevron-${showFullAbstract ? 'up' : 'down'} cosupervisor-button`} />
                    <span className="cosupervisor-button">
                      {t(`carriera.tesi.${showFullAbstract ? 'show_less' : 'show_more'}`)}
                    </span>
                  </Button>
                )}
              </>
            </CustomBlock>

            {lang !== 'en' && (
              <CustomBlock
                icon="align-left"
                title={t('carriera.conclusione_tesi.submit_labels.abstract_english')}
                ignoreMoreLines
              >
                <>
                  {normalizeText(abstractEngText).length > ABSTRACT_MAX && !showFullAbstractEng
                    ? `${normalizeText(abstractEngText).substring(0, ABSTRACT_MAX - 3)}... `
                    : normalizeText(abstractEngText)}
                  {normalizeText(abstractEngText).length > ABSTRACT_MAX && (
                    <Button
                      variant="link"
                      onClick={() => setShowFullAbstractEng(!showFullAbstractEng)}
                      aria-expanded={showFullAbstractEng}
                      className="p-0 custom-link d-inline-flex align-items-center gap-1 align-baseline"
                      style={{ fontSize: 'inherit', lineHeight: 'inherit', verticalAlign: 'baseline' }}
                    >
                      <i
                        className={`fa-regular fa-chevron-${showFullAbstractEng ? 'up' : 'down'} cosupervisor-button`}
                      />
                      <span className="cosupervisor-button">
                        {t(`carriera.tesi.${showFullAbstractEng ? 'show_less' : 'show_more'}`)}
                      </span>
                    </Button>
                  )}
                </>
              </CustomBlock>
            )}
          </div>
        </Col>

        <Col md={6}>
          <div className="cr-upload-card">
            <CustomBlock icon="key" title={t('carriera.conclusione_tesi.submit_labels.keywords')} ignoreMoreLines>
              {keywords.length > 0 ? (
                <CustomBadge
                  variant="keyword"
                  content={keywords.map(k => (typeof k === 'string' ? k : k.label || k.keyword || k.value || ''))}
                />
              ) : (
                '-'
              )}
            </CustomBlock>

            <CustomBlock icon="globe" title={t('carriera.conclusione_tesi.submit_labels.sdgs')} ignoreMoreLines>
              {selectedSdgLabels.length > 0 ? <CustomBadge variant="sdg" content={selectedSdgLabels} /> : '-'}
            </CustomBlock>
            <CustomBlock icon="lock" title={t('carriera.conclusione_tesi.submit_labels.authorization')} ignoreMoreLines>
              {authorization
                ? authorization === 'authorize'
                  ? t('carriera.conclusione_tesi.authorization_authorize')
                  : t('carriera.conclusione_tesi.authorization_deny')
                : '-'}
            </CustomBlock>

            {authorization && authorization === 'authorize' && (
              <CustomBlock
                icon="copyright"
                title={t('carriera.conclusione_tesi.submit_labels.license')}
                ignoreMoreLines
              >
                {selectedLicenseLabel}
              </CustomBlock>
            )}
            {authorization && authorization === 'deny' && (
              <>
                <CustomBlock
                  icon="circle-question"
                  title={t('carriera.conclusione_tesi.submit_labels.embargo')}
                  ignoreMoreLines
                >
                  {selectedEmbargoLabels.length > 0 ? selectedEmbargoLabels.join(', ') : '-'}
                </CustomBlock>
                <CustomBlock
                  icon="hourglass-half"
                  title={t('carriera.conclusione_tesi.submit_labels.embargo_duration')}
                  ignoreMoreLines
                >
                  {embargoPeriod || '-'}
                </CustomBlock>
              </>
            )}

            {requiredResume && (
              <CustomBlock
                icon="file-pdf"
                title={t('carriera.conclusione_tesi.summary_for_committee_pdf')}
                ignoreMoreLines
              >
                {resumePdf ? resumePdf.name : '-'}
              </CustomBlock>
            )}

            <CustomBlock
              icon="file-circle-check"
              title={t('carriera.conclusione_tesi.final_thesis_pdfa')}
              ignoreMoreLines
            >
              {pdfFile ? pdfFile.name : '-'}
            </CustomBlock>

            <CustomBlock icon="file-zipper" title={t('carriera.conclusione_tesi.supplementary_zip')} ignoreMoreLines>
              {supplementaryZip ? supplementaryZip.name : '-'}
            </CustomBlock>
            <CustomBlock
              icon="clipboard-list"
              title={t('carriera.conclusione_tesi.submit_labels.declarations_accepted')}
              ignoreMoreLines
            >
              {declarationsTotalCount > 0 ? `${declarationsAcceptedCount} / ${declarationsTotalCount}` : '-'}
            </CustomBlock>
          </div>
        </Col>
      </Row>
    </div>
  );
}
