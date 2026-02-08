import React from 'react';

import { Button, Card } from 'react-bootstrap';
import { FaArrowLeft, FaCircleCheck, FaTriangleExclamation } from 'react-icons/fa6';

import { useConclusionRequest } from './ConclusionRequestContext';

export default function StepOutcome() {
  const { t, appliedTheme, submissionOutcome } = useConclusionRequest();

  const isSuccess = submissionOutcome === 'success';
  const title = isSuccess ? t('carriera.conclusione_tesi.success_title') : t('carriera.conclusione_tesi.error_title');

  const message = isSuccess
    ? t('carriera.conclusione_tesi.success_message')
    : t('carriera.conclusione_tesi.error_message');

  return (
    <Card className="mt-3 roundCard">
      <Card.Body className="d-flex flex-column align-items-center my-4">
        <div className="pol-headline pol-headline--with-bar" style={{ color: 'var(--primary)' }}>
          <h3 className="bold-weight">{title}</h3>
        </div>

        {isSuccess ? (
          <FaCircleCheck size={96} style={{ color: 'var(--green-600)' }} />
        ) : (
          <FaTriangleExclamation size={96} style={{ color: 'var(--orange-600)' }} />
        )}

        <div className="mb-3 mt-3 text-center" style={{ color: 'var(--text)' }}>
          <p>{message}</p>
        </div>

        <Button className={`btn-${appliedTheme}`} size="sm" onClick={() => window.history.back()}>
          <FaArrowLeft size={16} className="me-2" />
          {t('carriera.conclusione_tesi.go_back')}
        </Button>
      </Card.Body>
    </Card>
  );
}
