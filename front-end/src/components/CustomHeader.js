import React from 'react';

import { Button, Stack } from 'react-bootstrap';
import { FaChevronLeft } from 'react-icons/fa6';

import PropTypes from 'prop-types';

export default function CustomHeader({ title, subtitle, action }) {
  return (
    <div style={{ alignItems: 'center', display: 'flex', marginBottom: '1rem', justifyContent: 'space-between' }}>
      <Stack direction="horizontal" gap={3} className="align-items-center">
        <Button
          variant="light"
          className="d-flex align-items-center justify-content-center p-2 bg-white"
          style={{
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            width: '30px',
            height: '30px',
          }}
          onClick={action}
        >
          <FaChevronLeft size={20} color="var(--gray-700)" />
        </Button>

        <Stack gap={0}>
          <div style={{ color: 'var(--text)', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            {title}
          </div>

          {subtitle && (
            <div className="text-muted small" style={{ fontSize: 'var(--font-size-xs)' }}>
              {subtitle}
            </div>
          )}
        </Stack>
      </Stack>
    </div>
  );
}

CustomHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  action: PropTypes.func.isRequired,
};
