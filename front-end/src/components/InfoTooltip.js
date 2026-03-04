import React from 'react';

import { OverlayTrigger, Tooltip } from 'react-bootstrap';

import PropTypes from 'prop-types';

export default function InfoTooltip({ id, tooltipText, placement = 'top' }) {
  return (
    <OverlayTrigger placement={placement} overlay={<Tooltip id={id}>{tooltipText}</Tooltip>}>
      <i
        className="fa-regular fa-circle-info ms-2"
        style={{ color: 'var(--gray-400)', fontSize: '16px', width: '16px', height: '16px' }}
      />
    </OverlayTrigger>
  );
}

InfoTooltip.propTypes = {
  id: PropTypes.string.isRequired,
  tooltipText: PropTypes.string.isRequired,
  placement: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
};
