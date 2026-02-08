import React from 'react';

import { Col, Row } from 'react-bootstrap';

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
  } = useConclusionRequest();

  const normalizeText = value => String(value || '').trim() || '-';

  return (
    <div className="cr-section cr-submit-summary">
      <div className="cr-section-title">
        <i className="fa-regular fa-clipboard-check" />
        <span>{t('carriera.conclusione_tesi.summary')}</span>
      </div>
      <Row className="g-3">
        <Col md={6}>
          <div className="cr-upload-card">
            <CustomBlock icon="user" title="Relatore" ignoreMoreLines>
              {supervisor?.label ? <CustomBadge variant="teacher" content={supervisor.label} /> : '-'}
            </CustomBlock>

            <CustomBlock icon="users" title="Co-relatori" ignoreMoreLines>
              {coSupervisors.length > 0 ? (
                <CustomBadge variant="teacher" content={coSupervisors.map(cs => cs.label)} />
              ) : (
                '-'
              )}
            </CustomBlock>

            <CustomBlock icon="flag" title="Lingua" ignoreMoreLines>
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

            <CustomBlock icon="text-size" title="Titolo originale" ignoreMoreLines>
              <div className="cr-clamp-2">{normalizeText(titleText)}</div>
            </CustomBlock>

            {lang !== 'en' && (
              <CustomBlock icon="text-size" title="Titolo in inglese" ignoreMoreLines>
                <div className="cr-clamp-2">{normalizeText(titleEngText)}</div>
              </CustomBlock>
            )}

            <CustomBlock icon="align-left" title="Abstract originale" ignoreMoreLines>
              <div className="cr-clamp-2">{normalizeText(abstractText)}</div>
            </CustomBlock>

            {lang !== 'en' && (
              <CustomBlock icon="align-left" title="Abstract in inglese" ignoreMoreLines>
                <div className="cr-clamp-2">{normalizeText(abstractEngText)}</div>
              </CustomBlock>
            )}
          </div>
        </Col>

        <Col md={6}>
          <div className="cr-upload-card">
            <CustomBlock icon="key" title="Keywords" ignoreMoreLines>
              {keywords.length > 0 ? (
                <CustomBadge
                  variant="keyword"
                  content={keywords.map(k => (typeof k === 'string' ? k : k.label || k.value || ''))}
                />
              ) : (
                '-'
              )}
            </CustomBlock>

            <CustomBlock icon="globe" title="SDG" ignoreMoreLines>
              {selectedSdgLabels.length > 0 ? <CustomBadge variant="sdg" content={selectedSdgLabels} /> : '-'}
            </CustomBlock>
            <CustomBlock icon="lock" title="Autorizzazione" ignoreMoreLines>
              {authorization ? (authorization === 'authorize' ? 'Autorizzo' : 'Non autorizzo') : '-'}
            </CustomBlock>

            {authorization && authorization === 'authorize' && (
              <CustomBlock icon="copyright" title="Licenza" ignoreMoreLines>
                {selectedLicenseLabel}
              </CustomBlock>
            )}
            {authorization && authorization === 'deny' && (
              <>
                <CustomBlock icon="circle-question" title="Motivazioni" ignoreMoreLines>
                  {selectedEmbargoLabels.length > 0 ? selectedEmbargoLabels.join(', ') : '-'}
                </CustomBlock>
                <CustomBlock icon="hourglass-half" title="Embargo" ignoreMoreLines>
                  {embargoPeriod || '-'}
                </CustomBlock>
              </>
            )}

            <CustomBlock icon="file-pdf" title="Riassunto PDF" ignoreMoreLines>
              {resumePdf ? resumePdf.name : '-'}
            </CustomBlock>

            <CustomBlock icon="file-circle-check" title="Tesi PDF/A" ignoreMoreLines>
              {pdfFile ? pdfFile.name : '-'}
            </CustomBlock>

            <CustomBlock icon="file-zipper" title="Allegato .zip" ignoreMoreLines>
              {supplementaryZip ? supplementaryZip.name : '-'}
            </CustomBlock>
            <CustomBlock icon="clipboard-list" title="Dichiarazioni accettate" ignoreMoreLines>
              {declarationsTotalCount > 0 ? `${declarationsAcceptedCount} / ${declarationsTotalCount}` : '-'}
            </CustomBlock>
          </div>
        </Col>
      </Row>
    </div>
  );
}
