import React, { useState } from 'react';

import { Button, Col, Row } from 'react-bootstrap';

import PropTypes from 'prop-types';

import CustomBadge from '../CustomBadge';
import CustomBlock from '../CustomBlock';
import { useConclusionRequest } from './ConclusionRequestContext';

const TITLE_MAX = 90;
const ABSTRACT_MAX = 180;

const normalizeText = value => String(value || '').trim() || '-';

function ExpandableText({ text, expanded, onToggle, maxLength, t }) {
  const hasOverflow = text.length > maxLength;
  const visibleText = hasOverflow && !expanded ? `${text.substring(0, maxLength - 3)}... ` : text;

  return (
    <>
      {visibleText}
      {hasOverflow && (
        <Button
          variant="link"
          onClick={onToggle}
          aria-expanded={expanded}
          className="p-0 custom-link d-inline-flex align-items-center gap-1 align-baseline"
          style={{ fontSize: 'inherit', lineHeight: 'inherit', verticalAlign: 'baseline' }}
        >
          <i className={`fa-regular fa-chevron-${expanded ? 'up' : 'down'} cosupervisor-button`} />
          <span className="cosupervisor-button">{t(`carriera.tesi.${expanded ? 'show_less' : 'show_more'}`)}</span>
        </Button>
      )}
    </>
  );
}

ExpandableText.propTypes = {
  text: PropTypes.string.isRequired,
  expanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  maxLength: PropTypes.number.isRequired,
  t: PropTypes.func.isRequired,
};

export default function StepSubmit() {
  const {
    t,
    lang,
    supervisor,
    coSupervisors = [],
    selectedLanguageLabel,
    titleText,
    titleEngText,
    abstractText,
    abstractEngText,
    keywords = [],
    selectedSdgLabels = [],
    authorization,
    selectedLicenseLabel,
    selectedEmbargoLabels = [],
    embargoPeriod,
    summaryPdf,
    pdfFile,
    supplementaryZip,
    draftUploadedFiles,
    declarationsAcceptedCount = 0,
    declarationsTotalCount = 0,
    requiredSummary,
  } = useConclusionRequest();

  const [showFullTitle, setShowFullTitle] = useState(false);
  const [showFullTitleEng, setShowFullTitleEng] = useState(false);
  const [showFullAbstract, setShowFullAbstract] = useState(false);
  const [showFullAbstractEng, setShowFullAbstractEng] = useState(false);

  const normalizedTitleText = normalizeText(titleText);
  const normalizedTitleEngText = normalizeText(titleEngText);
  const normalizedAbstractText = normalizeText(abstractText);
  const normalizedAbstractEngText = normalizeText(abstractEngText);

  const summaryFileName = summaryPdf?.name || draftUploadedFiles?.summary?.fileName || '-';
  const thesisFileName = pdfFile?.name || draftUploadedFiles?.thesis?.fileName || '-';
  const additionalFileName = supplementaryZip?.name || draftUploadedFiles?.additional?.fileName || '-';

  let authorizationLabel = '-';
  if (authorization === 'authorize') {
    authorizationLabel = t('carriera.conclusione_tesi.authorization_authorize');
  } else if (authorization === 'deny') {
    authorizationLabel = t('carriera.conclusione_tesi.authorization_deny');
  }
  const embargoDurationLabel = embargoPeriod ? t(`carriera.conclusione_tesi.embargo_period.${embargoPeriod}`) : '-';

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
              <ExpandableText
                text={normalizedTitleText}
                maxLength={TITLE_MAX}
                expanded={showFullTitle}
                onToggle={() => setShowFullTitle(prev => !prev)}
                t={t}
              />
            </CustomBlock>

            {lang !== 'en' && (
              <CustomBlock
                icon="text-size"
                title={t('carriera.conclusione_tesi.submit_labels.title_english')}
                ignoreMoreLines
              >
                <ExpandableText
                  text={normalizedTitleEngText}
                  maxLength={TITLE_MAX}
                  expanded={showFullTitleEng}
                  onToggle={() => setShowFullTitleEng(prev => !prev)}
                  t={t}
                />
              </CustomBlock>
            )}

            <CustomBlock
              icon="align-left"
              title={t('carriera.conclusione_tesi.submit_labels.abstract_original')}
              ignoreMoreLines
            >
              <ExpandableText
                text={normalizedAbstractText}
                maxLength={ABSTRACT_MAX}
                expanded={showFullAbstract}
                onToggle={() => setShowFullAbstract(prev => !prev)}
                t={t}
              />
            </CustomBlock>

            {lang !== 'en' && (
              <CustomBlock
                icon="align-left"
                title={t('carriera.conclusione_tesi.submit_labels.abstract_english')}
                ignoreMoreLines
              >
                <ExpandableText
                  text={normalizedAbstractEngText}
                  maxLength={ABSTRACT_MAX}
                  expanded={showFullAbstractEng}
                  onToggle={() => setShowFullAbstractEng(prev => !prev)}
                  t={t}
                />
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
              {authorizationLabel}
            </CustomBlock>

            {authorization === 'authorize' && (
              <CustomBlock
                icon="copyright"
                title={t('carriera.conclusione_tesi.submit_labels.license')}
                ignoreMoreLines
              >
                {selectedLicenseLabel || '-'}
              </CustomBlock>
            )}
            {authorization === 'deny' && (
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
                  {embargoDurationLabel}
                </CustomBlock>
              </>
            )}

            {requiredSummary && (
              <CustomBlock
                icon="file-pdf"
                title={t('carriera.conclusione_tesi.summary_for_committee_pdf')}
                ignoreMoreLines
              >
                {summaryFileName}
              </CustomBlock>
            )}

            <CustomBlock
              icon="file-circle-check"
              title={t('carriera.conclusione_tesi.final_thesis_pdfa')}
              ignoreMoreLines
            >
              {thesisFileName}
            </CustomBlock>

            <CustomBlock icon="file-zipper" title={t('carriera.conclusione_tesi.supplementary_zip')} ignoreMoreLines>
              {additionalFileName}
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
