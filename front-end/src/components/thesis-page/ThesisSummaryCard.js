import React from 'react';

import { Button, Card } from 'react-bootstrap';

import PropTypes from 'prop-types';

import CustomBlock from '../CustomBlock';
import InfoTooltip from '../InfoTooltip';

export default function ThesisSummaryCard({
  t,
  thesis,
  requiredSummary,
  showFullAbstract,
  setShowFullAbstract,
  onDownload,
}) {
  const abstractText = thesis?.abstract || '';

  const renderDocumentLink = (icon, label, path, fileType) => {
    if (!path) {
      return (
        <span className="link-container mb-0 d-inline-flex align-items-center text-muted">
          <i className={`fa-regular fa-${icon} fa-fw me-1`} />
          {label}: -
        </span>
      );
    }

    return (
      <span className="link-container mb-0 d-inline-flex align-items-center">
        <button type="button" onClick={() => onDownload({ fileType, filePath: path })} className="link-button">
          <i className={`fa-regular fa-${icon} fa-fw me-1`} /> {label}
        </button>
      </span>
    );
  };

  return (
    <Card className="mb-3 roundCard py-2 ">
      <Card.Header className="border-0 d-flex align-items-center">
        <h3 className="thesis-topic mb-0">
          <i className="fa-regular fa-clipboard fa-sm pe-2" />
          {t('carriera.conclusione_tesi.summary')}
        </h3>
        <InfoTooltip
          tooltipText={t('carriera.conclusione_tesi.summary')}
          placement="right"
          id="thesis-summary-tooltip"
        />
      </Card.Header>

      <Card.Body className="pt-2 pb-0">
        <CustomBlock icon="text-size" title="Titolo" ignoreMoreLines>
          {thesis.title}
        </CustomBlock>

        <CustomBlock icon="align-left" title="Abstract" ignoreMoreLines>
          {abstractText.length > 300 && !showFullAbstract ? (
            <>{abstractText.substring(0, 297) + '... '}</>
          ) : (
            <>{abstractText || '-'}</>
          )}

          {abstractText.length > 300 && (
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
        </CustomBlock>

        <div className="mt-3 mb-2 fw-semibold">{t('carriera.conclusione_tesi.uploaded')}</div>
        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
          {requiredSummary &&
            renderDocumentLink('file-pdf', t('carriera.conclusione_tesi.summary'), thesis.thesisSummaryPath, 'summary')}
          {renderDocumentLink(
            'file-circle-check',
            t('carriera.conclusione_tesi.thesis_pdfa'),
            thesis.thesisFilePath,
            'thesis',
          )}
          {renderDocumentLink(
            'file-zipper',
            t('carriera.conclusione_tesi.additional'),
            thesis.additionalZipPath,
            'additional',
          )}
        </div>
      </Card.Body>
    </Card>
  );
}

ThesisSummaryCard.propTypes = {
  t: PropTypes.func.isRequired,
  thesis: PropTypes.object.isRequired,
  requiredSummary: PropTypes.bool.isRequired,
  showFullAbstract: PropTypes.bool.isRequired,
  setShowFullAbstract: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
};
