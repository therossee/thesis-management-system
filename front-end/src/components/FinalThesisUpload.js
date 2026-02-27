import React, { useContext, useEffect, useRef, useState } from 'react';

import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import PropTypes from 'prop-types';

import API from '../API';
import { ThemeContext } from '../App';
import '../styles/conclusion-process.css';
import { getSystemTheme } from '../utils/utils';
import CustomModal from './CustomModal';
import LoadingModal from './LoadingModal';

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
  inputRef,
  required = false,
}) {
  return (
    <div className="cr-upload-col cr-upload-card">
      <div className="cr-upload-header">
        <Form.Label htmlFor={id}>
          {label}
          {required ? ' *' : ''}
        </Form.Label>
        <div className="text-muted cr-upload-meta">({t(maxSizeKey)})</div>
      </div>
      <Form.Group>
        <Form.Control
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={e => onFileChange(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
          disabled={isSubmitting}
          id={id}
          className="d-none"
        />
        <div className="cr-file-row">
          <Button
            type="button"
            className={`btn-outlined-${appliedTheme} mb-0`}
            onClick={() => inputRef.current?.click()}
            disabled={isSubmitting}
          >
            <i className="fa-regular fa-upload me-2" />
            {t('carriera.conclusione_tesi.select_file')}
          </Button>
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
  inputRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  required: PropTypes.bool,
};

function FinalThesisUpload({ show, setShow, onSubmitResult }) {
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [summaryPdf, setSummaryPdf] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [additionalZip, setAdditionalZip] = useState(null);
  const { t, i18n } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { theme } = useContext(ThemeContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;
  const [requiredSummary, setRequiredSummary] = useState(false);
  const summaryInputRef = useRef(null);
  const thesisInputRef = useRef(null);
  const additionalZipInputRef = useRef(null);

  const resetForm = () => {
    setSummaryPdf(null);
    setPdfFile(null);
    setAdditionalZip(null);
    if (summaryInputRef.current) summaryInputRef.current.value = '';
    if (thesisInputRef.current) thesisInputRef.current.value = '';
    if (additionalZipInputRef.current) additionalZipInputRef.current.value = '';
  };

  useEffect(() => {
    API.getRequiredSummaryForLoggedStudent()
      .then(requiredSummaryData => {
        if (requiredSummaryData) {
          setRequiredSummary(Boolean(requiredSummaryData.requiredSummary));
        }
      })
      .catch(error => {
        console.error('Error fetching required summary data:', error);
      });
  }, []);

  const handleUpload = async () => {
    if (!pdfFile || (requiredSummary && !summaryPdf)) return;

    setIsSubmitting(true);
    setShow(false);
    setShowConfirmationModal(false);
    API.uploadFinalThesis(pdfFile, requiredSummary ? summaryPdf : null, additionalZip)
      .then(() => {
        onSubmitResult(true);
        resetForm();
        setShow(false);
      })
      .catch(error => {
        console.error('Error uploading final thesis:', error);
        onSubmitResult(false);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const canSubmit = !!pdfFile && (!requiredSummary || !!summaryPdf) && !isSubmitting;
  const removeFileText = i18n.language === 'it' ? 'Rimuovi file' : 'Remove file';

  return (
    <>
      {isSubmitting && <LoadingModal show={isSubmitting} onHide={() => setIsSubmitting(false)} />}
      <Modal
        show={show}
        onHide={() => setShow(false)}
        centered
        dialogClassName="conclusion-process final-thesis-upload-modal"
        contentClassName="conclusion-process-content-shell"
      >
        <Modal.Header closeButton>
          <Modal.Title className="cr-modal-title">
            <i className="fa-regular fa-file-upload me-2" />
            {t('carriera.conclusione_tesi.final_thesis_modal.title')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="conclusion-process-content cr-clean">
            <div className="cr-section">
              <div className="cr-section-description mb-4 text-start">
                {t('carriera.conclusione_tesi.final_thesis_modal.instructions')}
              </div>
              <div className="mb-3 text-start">
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
              <div className="text-muted cr-help mt-1 mb-2 text-start" style={{ fontSize: 'var(--font-size-xs)' }}>
                {t('carriera.conclusione_tesi.required_fields_note')}
              </div>
              <Row className="mb-2 g-3 justify-content-center final-thesis-upload-row">
                {requiredSummary && (
                  <Col md={6} lg={4}>
                    <UploadCard
                      t={t}
                      id="final-thesis-summary-pdfa"
                      label={t('carriera.conclusione_tesi.summary_for_committee_pdfa')}
                      maxSizeKey="carriera.conclusione_tesi.max_size_20_mb"
                      accept="application/pdf"
                      file={summaryPdf}
                      onFileChange={setSummaryPdf}
                      onRemove={() => {
                        setSummaryPdf(null);
                        if (summaryInputRef.current) summaryInputRef.current.value = '';
                      }}
                      removeFileText={removeFileText}
                      appliedTheme={appliedTheme}
                      isSubmitting={isSubmitting}
                      inputRef={summaryInputRef}
                      required
                    />
                  </Col>
                )}
                <Col md={6} lg={requiredSummary ? 4 : 6}>
                  <UploadCard
                    t={t}
                    id="final-thesis-pdfa"
                    label={t('carriera.conclusione_tesi.final_thesis_pdfa')}
                    maxSizeKey="carriera.conclusione_tesi.max_size_200_mb"
                    accept="application/pdf"
                    file={pdfFile}
                    onFileChange={setPdfFile}
                    onRemove={() => {
                      setPdfFile(null);
                      if (thesisInputRef.current) thesisInputRef.current.value = '';
                    }}
                    removeFileText={removeFileText}
                    appliedTheme={appliedTheme}
                    isSubmitting={isSubmitting}
                    inputRef={thesisInputRef}
                    required
                  />
                </Col>
                <Col md={6} lg={requiredSummary ? 4 : 6}>
                  <UploadCard
                    t={t}
                    id="final-thesis-additional-zip"
                    label={t('carriera.conclusione_tesi.supplementary_zip')}
                    maxSizeKey="carriera.conclusione_tesi.max_size_200_mb"
                    accept=".zip,application/zip"
                    file={additionalZip}
                    onFileChange={setAdditionalZip}
                    onRemove={() => {
                      setAdditionalZip(null);
                      if (additionalZipInputRef.current) additionalZipInputRef.current.value = '';
                    }}
                    removeFileText={removeFileText}
                    appliedTheme={appliedTheme}
                    isSubmitting={isSubmitting}
                    inputRef={additionalZipInputRef}
                  />
                </Col>
              </Row>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-end gap-2">
          <Button className={`btn-outlined-${appliedTheme} mb-3`} size="md" onClick={() => resetForm()}>
            <i className="fa-solid fa-rotate-left pe-2" />
            {t('carriera.proposte_di_tesi.reset')}
          </Button>

          <Button
            className={`btn-primary-${appliedTheme}`}
            onClick={() => {
              setShowConfirmationModal(true);
              setShow(false);
            }}
            disabled={!canSubmit}
          >
            <i className="fa-solid fa-paper-plane pe-2" />
            {isSubmitting ? t('carriera.conclusione_tesi.sending') : t('carriera.conclusione_tesi.final_thesis_upload')}
          </Button>
        </Modal.Footer>
      </Modal>
      <CustomModal
        show={showConfirmationModal}
        handleClose={() => {
          setShowConfirmationModal(false);
          setShow(true);
        }}
        handleConfirm={handleUpload}
        titleText={t('carriera.conclusione_tesi.final_thesis_modal.title')}
        bodyText={t('carriera.conclusione_tesi.final_thesis_modal.body')}
        confirmText={t('carriera.conclusione_tesi.final_thesis_modal.confirm_button')}
        confirmIcon="fa-solid fa-paper-plane"
        closeText={t('carriera.conclusione_tesi.final_thesis_modal.cancel_button')}
        isLoading={isSubmitting}
      />
    </>
  );
}

FinalThesisUpload.propTypes = {
  show: PropTypes.bool.isRequired,
  setShow: PropTypes.func.isRequired,
  onSubmitResult: PropTypes.func.isRequired,
};

export default FinalThesisUpload;
