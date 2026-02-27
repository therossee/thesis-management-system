import React from 'react';

import { Button } from 'react-bootstrap';

import PropTypes from 'prop-types';

import '../styles/pill-button.css';

export default function PillButtonGroup({ label, options, active }) {
  return (
    <div className="mb-3">
      {label && <span className="pill-button-label">{label}</span>}
      <div className="d-flex flex-row gap-2 pill-button-group">
        {options.map(option => (
          <Button
            key={option.value}
            ref={option.ref}
            variant="none"
            className={`pill-button-light ${active === option.value ? 'active' : ''}`}
            onClick={() => option.onClick(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

PillButtonGroup.propTypes = {
  label: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      ref: PropTypes.object,
      onClick: PropTypes.func.isRequired,
    }),
  ).isRequired,
  active: PropTypes.string.isRequired,
};
