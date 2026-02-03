import React, { useContext } from 'react';

import { Button, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import PropTypes from 'prop-types';

import { ThemeContext } from '../App';
import { getSystemTheme } from '../utils/utils';

export default function CustomModal({
  show,
  handleClose,
  handleConfirm,
  titleText,
  bodyText,
  closeText,
  confirmText,
  confirmIcon,
}) {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;

  return (
    <Modal show={show} onHide={handleClose} contentClassName="modal-content" backdropClassName="modal-overlay" centered>
      <Modal.Header closeButton={true} className="modal-header">
        <Modal.Title className="modal-title">
          <i className="fa-regular fa-circle-exclamation" />
          {` `}
          {t(titleText)}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="modal-body">{t(bodyText)}</Modal.Body>
      <Modal.Footer className="modal-footer">
        <Button className="modal-cancel mb-3" size="md" onClick={handleClose}>
          {closeText || t('carriera.proposta_di_tesi.chiudi')}
        </Button>
        <Button className={`btn-primary-${appliedTheme} mb-3`} size="md" onClick={() => handleConfirm()}>
          <i className={confirmIcon}></i>
          {t(confirmText)}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

CustomModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  handleConfirm: PropTypes.func.isRequired,
  titleText: PropTypes.string.isRequired,
  bodyText: PropTypes.string.isRequired,
  confirmText: PropTypes.string.isRequired,
  confirmIcon: PropTypes.string.isRequired,
  closeText: PropTypes.string,
};
