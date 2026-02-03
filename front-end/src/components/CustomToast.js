import React from 'react';

import { Toast } from 'react-bootstrap';

import PropTypes from 'prop-types';

function CustomToast({ show, success, title, message, onClose }) {
  return (
    <div className="custom-toast-wrapper">
      <Toast
        onClose={onClose}
        show={show}
        delay={5000}
        autohide
        className={`custom-toast ${success ? 'custom-toast--success' : 'custom-toast--error'}`}
      >
        <div className="d-flex align-items-start gap-2 w-100">
          <span className="custom-toast__icon">
            <i className={success ? 'fa-regular fa-circle-check' : 'fa-regular fa-circle-xmark'} aria-hidden="true" />
          </span>
          <div className="custom-toast__content">
            <strong className="custom-toast__title">{title}</strong>
            <p className="custom-toast__message mb-0">{message}</p>
          </div>
          <button type="button" className="custom-toast__close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      </Toast>
    </div>
  );
}

CustomToast.propTypes = {
  show: PropTypes.bool.isRequired,
  success: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CustomToast;
