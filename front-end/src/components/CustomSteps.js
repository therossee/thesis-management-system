import React from 'react';

import PropTypes from 'prop-types';

import '../styles/custom-steps.css';

const DEFAULT_STEPS = [
  { label: 'Step 1', status: 'error' },
  { label: 'Step 2', status: 'done' },
  { label: 'Step 3', status: 'current' },
  { label: 'Step 4', status: 'todo' },
  { label: 'Step 5', status: 'in-progress' },
];

const STATUS_ICON = {
  done: <i className="fa-solid fa-check" aria-hidden="true" />,
  error: <i className="fa-solid fa-xmark" aria-hidden="true" />,
};

function CustomSteps({ steps = DEFAULT_STEPS, title = 'Process steps' }) {
  return (
    <div className="custom-steps" aria-label={title} role="list">
      {steps.map((step, index) => (
        <div className={`custom-step custom-step--${step.status}`} key={`${step.label}-${index}`} role="listitem">
          <span className="custom-step__dot">{STATUS_ICON[step.status] || null}</span>
          <span className="custom-step__label">{step.label}</span>
        </div>
      ))}
    </div>
  );
}

CustomSteps.propTypes = {
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      status: PropTypes.oneOf(['done', 'error', 'current', 'todo', 'in-progress']).isRequired,
    }),
  ),
  title: PropTypes.string,
};

export default CustomSteps;
