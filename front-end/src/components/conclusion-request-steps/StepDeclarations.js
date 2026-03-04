import React from 'react';

import { Col, Form, Row } from 'react-bootstrap';

import { useConclusionRequest } from './ConclusionRequestContext';

export default function StepDeclarations() {
  const { t, decl, setDecl, authorization, allDeclarationsChecked, isSubmitting } = useConclusionRequest();

  return (
    <div className="cr-section">
      <div className="cr-section-title">
        <i className="fa-regular fa-pen-to-square" />
        <span>{t('carriera.conclusione_tesi.declarations.student_declarations')}</span>
      </div>
      <div className="text-muted cr-help mt-1 mb-2" style={{ fontSize: '0.72rem' }}>
        {t('carriera.conclusione_tesi.required_fields_note')}
      </div>
      <div>
        <Row className="mb-2">
          <Col md="auto">
            <div>
              <div className="ms-2 me-2 pt-2 pb-2">
                <b>{t('carriera.conclusione_tesi.declarations.student_declarations_intro')}</b>
                <Form.Check
                  type="checkbox"
                  label={t('carriera.conclusione_tesi.declarations.declaration_1')}
                  checked={decl.decl1}
                  onChange={e => setDecl(prev => ({ ...prev, decl1: e.target.checked }))}
                  disabled={isSubmitting}
                  id="declaration-1"
                />
                {authorization === 'authorize' && (
                  <Form.Check
                    type="checkbox"
                    label={t('carriera.conclusione_tesi.declarations.declaration_2')}
                    checked={decl.decl2}
                    onChange={e => setDecl(prev => ({ ...prev, decl2: e.target.checked }))}
                    disabled={isSubmitting}
                    id="declaration-2"
                  />
                )}
                <Form.Check
                  type="checkbox"
                  label={t('carriera.conclusione_tesi.declarations.declaration_3')}
                  checked={decl.decl3}
                  onChange={e => setDecl(prev => ({ ...prev, decl3: e.target.checked }))}
                  disabled={isSubmitting}
                  id="declaration-3"
                />
                <Form.Check
                  type="checkbox"
                  label={t('carriera.conclusione_tesi.declarations.declaration_4')}
                  checked={decl.decl4}
                  onChange={e => setDecl(prev => ({ ...prev, decl4: e.target.checked }))}
                  disabled={isSubmitting}
                  id="declaration-4"
                />
                <Form.Check
                  type="checkbox"
                  label={t('carriera.conclusione_tesi.declarations.declaration_5')}
                  checked={decl.decl5}
                  onChange={e => setDecl(prev => ({ ...prev, decl5: e.target.checked }))}
                  disabled={isSubmitting}
                  id="declaration-5"
                />
                <Form.Check
                  type="checkbox"
                  label={t('carriera.conclusione_tesi.declarations.declaration_6')}
                  checked={decl.decl6}
                  onChange={e => setDecl(prev => ({ ...prev, decl6: e.target.checked }))}
                  disabled={isSubmitting}
                  id="declaration-6"
                />

                {!allDeclarationsChecked() && (
                  <div className="text-muted mt-2">
                    {t('carriera.conclusione_tesi.declarations.declarations_required')}
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
}
