import React, { useRef } from 'react';

import { Button, Col, Form, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';

import PropTypes from 'prop-types';

import InfoTooltip from '../InfoTooltip';
import { useConclusionRequest } from './ConclusionRequestContext';

function ActionIconButton({ id, tooltipText, onClick, disabled, iconClass, className = '' }) {
  return (
    <OverlayTrigger placement="top" overlay={<Tooltip id={`${id}-tooltip`}>{tooltipText}</Tooltip>}>
      <span className={`d-inline-flex ${className}`.trim()}>
        <Button
          variant="link"
          className="cr-file-remove p-0"
          onClick={onClick}
          disabled={disabled}
          aria-label={tooltipText}
        >
          <i className={iconClass} />
        </Button>
      </span>
    </OverlayTrigger>
  );
}

ActionIconButton.propTypes = {
  id: PropTypes.string.isRequired,
  tooltipText: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  iconClass: PropTypes.string.isRequired,
  className: PropTypes.string,
};

const FILE_NAME_MAX_LENGTH = 50;

const trimFileName = fileName => {
  const safeFileName = String(fileName || '');
  if (safeFileName.length <= FILE_NAME_MAX_LENGTH) return safeFileName;

  const dotIndex = safeFileName.lastIndexOf('.');
  const hasExtension = dotIndex > 0 && dotIndex < safeFileName.length - 1;
  if (!hasExtension) {
    return `${safeFileName.slice(0, FILE_NAME_MAX_LENGTH - 3)}...`;
  }

  const extension = safeFileName.slice(dotIndex);
  const baseName = safeFileName.slice(0, dotIndex);
  const maxBaseLength = FILE_NAME_MAX_LENGTH - extension.length - 3;

  if (maxBaseLength > 0) {
    return `${baseName.slice(0, maxBaseLength)}...${extension}`;
  }

  return `...${extension.slice(-(FILE_NAME_MAX_LENGTH - 3))}`;
};

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
  draftFile,
  onOpenDraft,
  onDownloadDraft,
  onRemoveDraft,
}) {
  const fileInputRef = useRef(null);

  const handleRemove = () => {
    onRemove();
    if (draftFile && onRemoveDraft) {
      onRemoveDraft();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
          ref={fileInputRef}
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
            <span className="cr-file-name">
              {file
                ? trimFileName(file.name)
                : draftFile?.fileName
                  ? trimFileName(draftFile.fileName)
                  : t('carriera.conclusione_tesi.no_file_selected')}
            </span>
            {file && (
              <ActionIconButton
                id={`${id}-remove-local`}
                tooltipText={removeFileText}
                onClick={handleRemove}
                disabled={isSubmitting}
                iconClass="fa-regular fa-trash-can"
              />
            )}
            {!file && draftFile && (
              <>
                {draftFile.canPreview && (
                  <ActionIconButton
                    id={`${id}-open-draft`}
                    className="ms-2"
                    tooltipText={t('carriera.conclusione_tesi.open_file')}
                    onClick={onOpenDraft}
                    disabled={isSubmitting}
                    iconClass="fa-regular fa-eye"
                  />
                )}
                <ActionIconButton
                  id={`${id}-download-draft`}
                  className="ms-2"
                  tooltipText={t('carriera.conclusione_tesi.download_file')}
                  onClick={onDownloadDraft}
                  disabled={isSubmitting}
                  iconClass="fa-regular fa-download"
                />
                <ActionIconButton
                  id={`${id}-remove-draft`}
                  className="ms-2"
                  tooltipText={removeFileText}
                  onClick={onRemoveDraft}
                  disabled={isSubmitting}
                  iconClass="fa-regular fa-trash-can"
                />
              </>
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
  draftFile: PropTypes.shape({
    fileType: PropTypes.oneOf(['thesis', 'summary', 'additional']).isRequired,
    fileName: PropTypes.string.isRequired,
    canPreview: PropTypes.bool.isRequired,
  }),
  onOpenDraft: PropTypes.func,
  onDownloadDraft: PropTypes.func,
  onRemoveDraft: PropTypes.func,
};

export default function StepUploads() {
  const {
    t,
    summaryPdf,
    setSummaryPdf,
    pdfFile,
    setPdfFile,
    supplementaryZip,
    setSupplementaryZip,
    draftUploadedFiles,
    handleDraftFileAction,
    removeDraftUploadedFile,
    removeFileText,
    appliedTheme,
    isSubmitting,
    requiredSummary,
  } = useConclusionRequest();

  return (
    <div className="cr-section">
      <div className="cr-section-title">
        <i className="fa-regular fa-file-upload" />
        <span>{t('carriera.conclusione_tesi.documents_to_upload')}</span>
      </div>
      <div className="text-muted cr-help mt-1 mb-2" style={{ fontSize: '0.72rem' }}>
        {t('carriera.conclusione_tesi.required_fields_note')}
      </div>
      <div>
        <div className="cr-upload-body mb-3">
          {t('carriera.conclusione_tesi.pdfa_conversion_info')}
          <div className="mt-2">
            <a
              href="https://didattica.polito.it/pls/portal30/sviluppo.elaborato_finale.consegna_pdf_conv"
              target="_blank"
              rel="noopener noreferrer"
              className={`btn btn-outlined-${appliedTheme} d-inline-flex align-items-center`}
            >
              <i className="fa-regular fa-arrow-up-right-from-square me-2" />
              {t('carriera.conclusione_tesi.pdfa_conversion_button')}
            </a>
          </div>
        </div>
        <Row className="mb-2 g-3 justify-content-center">
          {requiredSummary === true && (
            <Col md="auto">
              <UploadCard
                t={t}
                id="summary-for-committee-pdf"
                label={`${t('carriera.conclusione_tesi.summary_for_committee_pdf')} *`}
                maxSizeKey="carriera.conclusione_tesi.max_size_20_mb"
                accept="application/pdf"
                file={summaryPdf}
                onFileChange={setSummaryPdf}
                onRemove={() => setSummaryPdf(null)}
                removeFileText={removeFileText}
                appliedTheme={appliedTheme}
                isSubmitting={isSubmitting}
                tooltipText={t('carriera.conclusione_tesi.summary_for_committee_subtext')}
                draftFile={draftUploadedFiles.summary}
                onOpenDraft={() =>
                  handleDraftFileAction(
                    draftUploadedFiles.summary?.fileType,
                    draftUploadedFiles.summary?.fileName,
                    true,
                  )
                }
                onDownloadDraft={() =>
                  handleDraftFileAction(draftUploadedFiles.summary?.fileType, draftUploadedFiles.summary?.fileName)
                }
                onRemoveDraft={() => removeDraftUploadedFile('summary')}
              />
            </Col>
          )}
          <Col md="auto">
            <UploadCard
              t={t}
              id="final-thesis-pdfa"
              label={`${t('carriera.conclusione_tesi.final_thesis_pdfa')} *`}
              maxSizeKey="carriera.conclusione_tesi.max_size_200_mb"
              accept="application/pdf"
              file={pdfFile}
              onFileChange={setPdfFile}
              onRemove={() => setPdfFile(null)}
              removeFileText={removeFileText}
              appliedTheme={appliedTheme}
              isSubmitting={isSubmitting}
              draftFile={draftUploadedFiles.thesis}
              onOpenDraft={() =>
                handleDraftFileAction(draftUploadedFiles.thesis?.fileType, draftUploadedFiles.thesis?.fileName, true)
              }
              onDownloadDraft={() =>
                handleDraftFileAction(draftUploadedFiles.thesis?.fileType, draftUploadedFiles.thesis?.fileName)
              }
              onRemoveDraft={() => removeDraftUploadedFile('thesis')}
            />
          </Col>

          <Col md="auto">
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
              draftFile={draftUploadedFiles.additional}
              onDownloadDraft={() =>
                handleDraftFileAction(draftUploadedFiles.additional?.fileType, draftUploadedFiles.additional?.fileName)
              }
              onRemoveDraft={() => removeDraftUploadedFile('additional')}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
}
