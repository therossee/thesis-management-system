import React, { useContext, useState } from 'react';

import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import PropTypes from 'prop-types';

import API from '../API';
import { ThemeContext } from '../App';
import '../styles/conclusion-process.css';
import { getSystemTheme } from '../utils/utils';
import CustomModal from './CustomModal';
import LoadingModal from './LoadingModal';

function FinalThesisUpload({ show, setShow, onSubmitResult }) {
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { theme } = useContext(ThemeContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;

  const resetForm = () => {
    setPdfFile(null);
  };

  const handleUpload = async () => {
    if (!pdfFile) return;

    setIsSubmitting(true);
    setShow(false);
    setShowConfirmationModal(false);
    API.uploadFinalThesis(pdfFile)
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
  return (
    <>
      {isSubmitting && <LoadingModal show={isSubmitting} onHide={() => setIsSubmitting(false)} />}
      <Modal show={show} onHide={() => setShow(false)} centered contentClassName="conclusion-process-content-shell">
        <Modal.Header closeButton>
          <Modal.Title className="cr-modal-title">
            <i className="fa-regular fa-file-upload me-2" />
            {t('carriera.conclusione_tesi.final_thesis_modal.title')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="conclusion-process-content cr-clean">
            <div className="cr-section">
              <div className="cr-section-description mb-4 text-center">
                {t('carriera.conclusione_tesi.final_thesis_modal.instructions')}
              </div>
              <Row className="mb-2 g-3">
                <Col md={12}>
                  <div className="cr-upload-col">
                    <div className="cr-upload-header">
                      <Form.Label htmlFor="final-thesis-pdfa">
                        {t('carriera.conclusione_tesi.final_thesis_pdfa')}
                      </Form.Label>
                      <div className="text-muted cr-upload-meta">
                        ({t('carriera.conclusione_tesi.max_size_200_mb')})
                      </div>
                    </div>
                    <Form.Group>
                      <Form.Control
                        type="file"
                        accept="application/pdf"
                        onChange={e => setPdfFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                        disabled={isSubmitting}
                        id="final-thesis-pdfa"
                        required
                        className="d-none"
                      />
                      <div className="cr-file-row">
                        <Form.Label htmlFor="final-thesis-pdfa" className={`btn btn-outlined-${appliedTheme} mb-0`}>
                          <i className="fa-regular fa-upload me-2" />
                          {t('carriera.conclusione_tesi.select_file')}
                        </Form.Label>
                        <span className="text-muted cr-file-name">
                          {pdfFile ? pdfFile.name : t('carriera.conclusione_tesi.no_file_selected')}
                        </span>
                      </div>
                    </Form.Group>
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-end gap-2">
          <Button className={`btn-outlined-${appliedTheme} mb-3`} size="md" onClick={() => resetForm()}>
            <i className="fa-solid fa-rotate-left pe-2" />
            Reset
          </Button>

          <Button
            className={`btn-primary-${appliedTheme}`}
            onClick={() => {
              setShowConfirmationModal(true);
              setShow(false);
            }}
            disabled={!pdfFile || isSubmitting}
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
