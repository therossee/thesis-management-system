import React, { useState } from 'react';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

export default function ConclusionRequest() {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setSelectedFile(null);
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type !== 'application/pdf') {
      setError('Solo file PDF sono accettati.');
      setSelectedFile(null);
    } else {
      setError('');
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      setError('Seleziona un file PDF prima di caricare.');
      return;
    }
    // TODO: gestire l'upload del file
    alert('File caricato: ' + selectedFile.name);
    handleClose();
  };

  return (
    <div>
      <Button variant="contained" onClick={handleOpen}>
        Carica PDF
      </Button>
      <Modal open={open} onClose={handleClose}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Carica un file PDF
          </Typography>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            style={{ marginBottom: 16 }}
          />
          {error && (
            <Typography color="error" variant="body2" gutterBottom>
              {error}
            </Typography>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={!selectedFile}
            sx={{ mt: 2 }}
          >
            Carica
          </Button>
          <Button onClick={handleClose} sx={{ mt: 2, ml: 2 }}>
            Annulla
          </Button>
        </Box>
      </Modal>
    </div>
  );
}
import React, { useContext, useEffect, useState } from 'react';

import { Button, Form, FormText, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import PropTypes from 'prop-types';
import '../styles/utilities.css';
import CustomModal from './CustomModal';
import LoadingModal from './LoadingModal';


export default function ConclusionRequest(props) {
    const { show, setShow } = props;

  if (isLoading) {
    return <LoadingModal show={isLoading} onHide={() => setIsLoading(false)} />;
  }

  return (
    <>
      <CustomModal
        show={showConfirm}
        handleClose={() => {
          setShowConfirm(false);
          setShow(true);
        }}
        handleConfirm={handleSubmit}
        titleText={t('carriera.richiesta_tesi.confirm_title')}
        bodyText={t('carriera.richiesta_tesi.confirm_body')}
        onConfirm={handleSubmit}
        confirmText={t('carriera.richiesta_tesi.confirm')}
        confirmIcon="fa-solid fa-check"
      />
      <Modal className="modal-xxl" show={show} onHide={() => setShow(false)} centered>
        
      </Modal>
    </>
  );
}
ThesisRequestModal.propTypes = {
  show: PropTypes.bool.isRequired,
  setShow: PropTypes.func.isRequired,
  onSubmitResult: PropTypes.func.isRequired,
};
