import React from 'react';

import { Button, Col, Form, Row } from 'react-bootstrap';

import PropTypes from 'prop-types';

import InfoTooltip from '../InfoTooltip';
import { useConclusionRequest } from './ConclusionRequestContext';

function UploadCard({
  t,
  id,
  label,
  maxSizeKey,
  accept,
  file,
  onFileChange,
  onRemove,
  removeFileText,
  appliedTheme,
  isSubmitting,
  tooltipText,
}) {
  return (
    <div className="cr-upload-col cr-upload-card">
      <div className="cr-upload-header">
        <Form.Label htmlFor={id}>
          {label}
          {tooltipText ? <InfoTooltip tooltipText={tooltipText} /> : null}
        </Form.Label>
        <div className="text-muted cr-upload-meta">({t(maxSizeKey)})</div>
      </div>
      <Form.Group>
        <Form.Control
          type="file"
          accept={accept}
          onChange={e => onFileChange(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
          disabled={isSubmitting}
          id={id}
          className="d-none"
        />
        <div className="cr-file-row">
          <Form.Label htmlFor={id} className={`btn btn-outlined-${appliedTheme} mb-0`}>
            <i className="fa-regular fa-upload me-2" />
            {t('carriera.conclusione_tesi.select_file')}
          </Form.Label>
          <div className="text-muted cr-file-name-line">
            <span className="cr-file-name">{file ? file.name : t('carriera.conclusione_tesi.no_file_selected')}</span>
            {file && (
              <Button
                variant="link"
                className="cr-file-remove p-0"
                onClick={onRemove}
                disabled={isSubmitting}
                title={removeFileText}
                aria-label={removeFileText}
              >
                <i className="fa-regular fa-trash-can" />
              </Button>
            )}
          </div>
        </div>
      </Form.Group>
    </div>
  );
}

UploadCard.propTypes = {
  t: PropTypes.func.isRequired,
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  maxSizeKey: PropTypes.string.isRequired,
  accept: PropTypes.string.isRequired,
  file: PropTypes.object,
  onFileChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  removeFileText: PropTypes.string.isRequired,
  appliedTheme: PropTypes.string.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  tooltipText: PropTypes.string,
};

export default function StepUploads() {
  const {
    t,
    resumePdf,
    setResumePdf,
    pdfFile,
    setPdfFile,
    supplementaryZip,
    setSupplementaryZip,
    removeFileText,
    appliedTheme,
    isSubmitting,
  } = useConclusionRequest();

  return (
    <div className="cr-section">
      <div className="cr-section-title">
        <i className="fa-regular fa-file-upload" />
        <span>{t('carriera.conclusione_tesi.documents_to_upload')}</span>
      </div>
      <div>
        <Row className="mb-2 g-3">
          <Col md={4}>
            <UploadCard
              t={t}
              id="summary-for-committee-pdf"
              label={t('carriera.conclusione_tesi.summary_for_committee_pdf')}
              maxSizeKey="carriera.conclusione_tesi.max_size_20_mb"
              accept="application/pdf"
              file={resumePdf}
              onFileChange={setResumePdf}
              onRemove={() => setResumePdf(null)}
              removeFileText={removeFileText}
              appliedTheme={appliedTheme}
              isSubmitting={isSubmitting}
              tooltipText={t('carriera.conclusione_tesi.summary_for_committee_subtext')}
            />
          </Col>

          <Col md={4}>
            <UploadCard
              t={t}
              id="final-thesis-pdfa"
              label={t('carriera.conclusione_tesi.final_thesis_pdfa')}
              maxSizeKey="carriera.conclusione_tesi.max_size_200_mb"
              accept="application/pdf"
              file={pdfFile}
              onFileChange={setPdfFile}
              onRemove={() => setPdfFile(null)}
              removeFileText={removeFileText}
              appliedTheme={appliedTheme}
              isSubmitting={isSubmitting}
            />
          </Col>

          <Col md={4}>
            <UploadCard
              t={t}
              id="supplementary-zip"
              label={t('carriera.conclusione_tesi.supplementary_zip')}
              maxSizeKey="carriera.conclusione_tesi.max_size_200_mb"
              accept="application/zip"
              file={supplementaryZip}
              onFileChange={setSupplementaryZip}
              onRemove={() => setSupplementaryZip(null)}
              removeFileText={removeFileText}
              appliedTheme={appliedTheme}
              isSubmitting={isSubmitting}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
}
