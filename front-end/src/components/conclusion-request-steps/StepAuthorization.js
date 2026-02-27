import React from 'react';

import { Col, Form, Row } from 'react-bootstrap';

import CustomBadge from '../CustomBadge';
import { useConclusionRequest } from './ConclusionRequestContext';

export default function StepAuthorization() {
  const {
    t,
    i18n,
    authorization,
    setAuthorization,
    embargoMotivationsList,
    embargoMotivations,
    toggleMotivation,
    otherEmbargoReason,
    setOtherEmbargoReason,
    embargoPeriod,
    setEmbargoPeriod,
    licenses,
    licenseChoice,
    setLicenseChoice,
    checkRecommendedLicense,
    isSubmitting,
  } = useConclusionRequest();

  return (
    <div className="cr-section">
      <div className="cr-section-title cr-section-title-left">
        {authorization === 'authorize' ? (
          <i className="fa-regular fa-lock-open" />
        ) : (
          <i className="fa-regular fa-lock" />
        )}
        <span>{t('carriera.conclusione_tesi.authorization')} *</span>
      </div>
      <div className="text-muted cr-help mt-1 mb-2" style={{ fontSize: '0.72rem' }}>
        {t('carriera.conclusione_tesi.required_fields_note')}
      </div>
      <div>
        <Row className="mb-3">
          <Col md={12}>
            <Form.Check
              type="radio"
              id="authorization-authorize"
              name="authorization"
              label={t('carriera.conclusione_tesi.authorization_authorize')}
              checked={authorization === 'authorize'}
              onChange={() => setAuthorization('authorize')}
              disabled={isSubmitting}
              className="mb-2"
            />
            <Form.Check
              type="radio"
              id="authorization-deny"
              name="authorization"
              label={t('carriera.conclusione_tesi.authorization_deny')}
              checked={authorization === 'deny'}
              onChange={() => setAuthorization('deny')}
              disabled={isSubmitting}
            />
          </Col>
        </Row>
        <Row className="mb-2">
          <Col md={12}>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://didattica.polito.it/pdf/informazioni_secretazione.pdf"
              className="cr-link"
            >
              {t('carriera.conclusione_tesi.authorization_info')}
            </a>
          </Col>
        </Row>

        {authorization === 'deny' && (
          <>
            <Row className="mb-3 g-3">
              <Col md={7}>
                <Form.Label htmlFor="motivations">{t('carriera.conclusione_tesi.motivations')} *</Form.Label>
                {embargoMotivationsList.map(mot => (
                  <React.Fragment key={mot.id}>
                    <Form.Check
                      type="checkbox"
                      label={i18n.language === 'it' ? mot.motivation : mot.motivation_en}
                      checked={embargoMotivations.includes(mot.id)}
                      onChange={e => toggleMotivation(mot.id, e.target.checked)}
                      disabled={isSubmitting}
                      className="mb-2"
                    />
                    {mot.id === 7 && (
                      <Form.Control
                        type="text"
                        placeholder={t('carriera.conclusione_tesi.other_motivation_placeholder')}
                        value={otherEmbargoReason}
                        onChange={e => setOtherEmbargoReason(e.target.value)}
                        disabled={isSubmitting || !embargoMotivations.includes(7)}
                      />
                    )}
                  </React.Fragment>
                ))}
              </Col>

              <Col md={5}>
                <Form.Label htmlFor="embargo-period">
                  {t('carriera.conclusione_tesi.embargo_period.title')} *
                </Form.Label>

                <Form.Check
                  type="radio"
                  name="embargo-period"
                  label={t('carriera.conclusione_tesi.embargo_period.12_months')}
                  checked={embargoPeriod === '12_months'}
                  onChange={() => setEmbargoPeriod('12_months')}
                  disabled={isSubmitting}
                />
                <Form.Check
                  type="radio"
                  name="embargo-period"
                  label={t('carriera.conclusione_tesi.embargo_period.18_months')}
                  checked={embargoPeriod === '18_months'}
                  onChange={() => setEmbargoPeriod('18_months')}
                  disabled={isSubmitting}
                />
                <Form.Check
                  type="radio"
                  name="embargo-period"
                  label={t('carriera.conclusione_tesi.embargo_period.36_months')}
                  checked={embargoPeriod === '36_months'}
                  onChange={() => setEmbargoPeriod('36_months')}
                  disabled={isSubmitting}
                />
                <Form.Check
                  type="radio"
                  name="embargo-period"
                  label={t('carriera.conclusione_tesi.embargo_period.after_explicit_consent')}
                  checked={embargoPeriod === 'after_explicit_consent'}
                  onChange={() => setEmbargoPeriod('after_explicit_consent')}
                  disabled={isSubmitting}
                />
              </Col>
            </Row>
            <Row className="mb-2">
              <div className="text-muted cr-help">{t('carriera.conclusione_tesi.embargo_details')}</div>
            </Row>
          </>
        )}

        {authorization === 'authorize' && (
          <Row className="mb-2">
            <Col md={12}>
              <Form.Label htmlFor="license-choice">{t('carriera.conclusione_tesi.license_choice')} *</Form.Label>

              {licenses.map(license => (
                <Form.Check
                  type="radio"
                  name="license-choice"
                  key={license.id}
                  label={
                    <div className="d-flex flex-column align-items-start">
                      <div className="d-flex align-items-center">
                        <b>{i18n.language === 'it' ? license.name : license.name_en}</b>
                        {checkRecommendedLicense(license) && (
                          <CustomBadge
                            variant="recommended"
                            content={
                              <>
                                <i className="fa-regular fa-thumbs-up" />{' '}
                                {t('carriera.conclusione_tesi.license_recommended')}
                              </>
                            }
                            style={{ marginLeft: '10px' }}
                          />
                        )}
                      </div>
                      <div className="text-muted cr-license-description">
                        {i18n.language === 'it' ? (
                          <p dangerouslySetInnerHTML={{ __html: license.description }}></p>
                        ) : (
                          <p dangerouslySetInnerHTML={{ __html: license.description_en }}></p>
                        )}
                      </div>
                    </div>
                  }
                  checked={licenseChoice === license.id}
                  onChange={() => setLicenseChoice(license.id)}
                  disabled={isSubmitting}
                  className="mb-3"
                  id={`license-choice-${license.id}`}
                />
              ))}
            </Col>
          </Row>
        )}
      </div>
    </div>
  );
}
