import React from 'react';

import { Button, Card, Col } from 'react-bootstrap';

import PropTypes from 'prop-types';

export default function NoApplicationSection({ t, appliedTheme, isEligible, onOpenRequest }) {
  return (
    <Col md={8} lg={8}>
      <Card className="mb-3 roundCard py-2 d-flex justify-content-center align-items-center">
        <Card.Header className="border-0 d-flex justify-content-center align-items-center">
          <h3 className="thesis-topic m-0">{t('carriera.tesi.no_application.title')}</h3>
        </Card.Header>
        <Card.Body>
          <p
            dangerouslySetInnerHTML={{ __html: t('carriera.tesi.no_application.content') }}
            style={{ fontSize: 'var(--font-size-sm)' }}
            className="text-center"
          />
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

      <Card className="mb-3 roundCard py-2 d-flex justify-content-center align-items-center">
        <Card.Header className="border-0 d-flex justify-content-center align-items-center">
          <h3 className="thesis-topic">{t('carriera.tesi.information.title')}</h3>
        </Card.Header>
        <Card.Body className="pt-2 pb-2">
          <ul style={{ fontSize: 'var(--font-size-sm)' }} className="mb-0">
            <li>{t('carriera.tesi.information.line_1')}</li>
            <li>{t('carriera.tesi.information.line_2')}</li>
            <li>{t('carriera.tesi.information.line_3')}</li>
            <li>{t('carriera.tesi.information.line_4')}</li>
            <li>{t('carriera.tesi.information.line_5')}</li>
          </ul>
        </Card.Body>
      </Card>
    </Col>
  );
}

NoApplicationSection.propTypes = {
  t: PropTypes.func.isRequired,
  appliedTheme: PropTypes.string.isRequired,
  isEligible: PropTypes.bool.isRequired,
  onOpenRequest: PropTypes.func.isRequired,
};
