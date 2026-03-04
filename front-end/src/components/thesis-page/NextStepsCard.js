// src/components/thesis/NextStepsCard.jsx
import React from 'react';

import { Button, Card } from 'react-bootstrap';

import PropTypes from 'prop-types';

import InfoTooltip from '../InfoTooltip';

export default function NextStepsCard({ t, appliedTheme, variant, isEligible, onOpenRequest }) {
  const cfgByVariant = {
    thesis_cancel_approved: {
      icon: 'fa-route',
      titleKey: 'carriera.richiesta_tesi.next_steps_cancel_approved.title',
      contentKey: 'carriera.richiesta_tesi.next_steps_cancel_approved.content',
      tooltipId: 'thesis-next-steps-cancel-approved-tooltip',
    },
    application_rejected: {
      icon: 'fa-route',
      titleKey: 'carriera.richiesta_tesi.next_steps_rejected.title',
      contentKey: 'carriera.richiesta_tesi.next_steps_rejected.content',
      tooltipId: 'thesis-next-steps-rejected-tooltip',
    },
    application_cancelled: {
      icon: 'fa-route',
      titleKey: 'carriera.richiesta_tesi.next_steps_cancelled.title',
      contentKey: 'carriera.richiesta_tesi.next_steps_cancelled.content',
      tooltipId: 'thesis-next-steps-cancelled-tooltip',
    },
  };

  const cfg = cfgByVariant[variant];
  if (!cfg) return null;

  return (
    <Card className="mb-1 roundCard py-2">
      <Card.Header className="border-0 d-flex align-items-center">
        <h3 className="thesis-topic mb-0">
          <i className={`fa-regular ${cfg.icon}`} /> {t(cfg.titleKey)}
        </h3>
        <InfoTooltip tooltipText={t(cfg.titleKey)} placement="right" id={cfg.tooltipId} />
      </Card.Header>
      <Card.Body>
        <p dangerouslySetInnerHTML={{ __html: t(cfg.contentKey) }} style={{ fontSize: 'var(--font-size-sm)' }} />
        {isEligible && (
          <Button
            className={`btn-primary-${appliedTheme} tesi-header-action-btn align-items-center d-flex mt-3 mx-auto`}
            onClick={onOpenRequest}
            style={{
              height: '30px',
              display: 'flex',
              borderRadius: '6px',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 10px',
            }}
          >
            <i className="fa-regular fa-file-lines" /> {t('carriera.tesi.application_form')}
          </Button>
        )}
      </Card.Body>
    </Card>
  );
}

NextStepsCard.propTypes = {
  t: PropTypes.func.isRequired,
  appliedTheme: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['thesis_cancel_approved', 'application_rejected', 'application_cancelled']).isRequired,
  isEligible: PropTypes.bool.isRequired,
  onOpenRequest: PropTypes.func.isRequired,
};
