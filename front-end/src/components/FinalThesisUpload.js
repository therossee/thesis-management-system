import React, { useContext, useState } from 'react';

import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import PropTypes, { func } from 'prop-types';

import API from '../API';
import { ThemeContext } from '../App';
import { getSystemTheme } from '../utils/utils';

function FinalThesisUpload({ show, onHide }) {
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

    API.uploadFinalThesis(pdfFile)
      .then(response => {
        console.log('Final thesis uploaded successfully:', response.data);
        resetForm();
        onHide();
      })
      .catch(error => {
        console.error('Error uploading final thesis:', error);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Final Thesis Submission</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="cr-section">
          <div className="cr-section-title">
            <i className="fa-regular fa-file-upload" />
            <span>{t('carriera.conclusione_tesi.upload_final_thesis')}</span>
          </div>

          <Row className="mb-2">
            <Col md={12}>
              <Form.Label htmlFor="final-thesis-pdfa">{t('carriera.conclusione_tesi.final_thesis_pdfa')}</Form.Label>{' '}
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
        </div>
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-end gap-2">
        <Button className={`btn-outlined-${appliedTheme} mb-3`} size="md" onClick={() => resetForm()}>
          <i className="fa-solid fa-rotate-left pe-2" />
          {t('carriera.richiesta_tesi.reset')}
        </Button>

        <Button className={`btn-primary-${appliedTheme}`} onClick={handleUpload} disabled={!pdfFile || isSubmitting}>
          <i className="fa-solid fa-paper-plane pe-2" />
          {isSubmitting ? t('carriera.conclusione_tesi.sending') : t('carriera.conclusione_tesi.request_conclusion')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

FinalThesisUpload.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: func.isRequired,
};

export default FinalThesisUpload;
