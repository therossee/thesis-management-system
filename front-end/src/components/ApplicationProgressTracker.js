import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import '../styles/custom-progress-tracker.css';

export default function ApplicationProgressTracker({ status }) {
  const { t } = useTranslation();
  
  // Primo step sempre uguale
  const firstStep = {
    key: 'pending',
    label: t('carriera.tesi.progress_application.pending'),
    description: t('carriera.tesi.progress_application.pending_description')
  };

  // Secondo step dinamico in base allo stato
  const getSecondStep = () => {
    switch(status) {
      case 'approved':
        return {
          key: 'approved',
          label: t('carriera.tesi.progress_application.approved'),
          description: t('carriera.tesi.progress_application.approved_description')
        };
      case 'rejected':
        return {
          key: 'rejected',
          label: t('carriera.tesi.progress_application.rejected'),
          description: t('carriera.tesi.progress_application.rejected_description')
        };
      case 'canceled':
        return {
          key: 'canceled',
          label: t('carriera.tesi.progress_application.canceled'),
          description: t('carriera.tesi.progress_application.canceled_description')
        };
      default: // pending
        return {
          key: 'outcome',
          label: t('carriera.tesi.progress_application.outcome'),
          description: t('carriera.tesi.progress_application.outcome_description')
        };
    }
  };

  const secondStep = getSecondStep();
  const steps = [firstStep, secondStep];

  const renderStep = (step, index) => {
    const isActive = (index === 0 && status === 'pending') || 
                     (index === 1 && status !== 'pending');
    
    let circleClass = 'inactive';
    if (isActive) {
      circleClass = step.key;
    }
    
    return (
      <div 
        key={step.key}
        className="progress-step"
      >
        <div className="progress-step-marker">
          <div className={`progress-step-circle ${circleClass}`} />
        </div>
        <div className="progress-step-content">
          <h6 className={`progress-step-title ${isActive ? `active active-${step.key}` : ''}`}>
            {step.label}
          </h6>
          <p className="progress-step-description">
            {step.description}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="progress-tracker-container">
      {steps.map((step, index) => renderStep(step, index))}
    </div>
  );
}

ApplicationProgressTracker.propTypes = {
  status: PropTypes.oneOf(['pending', 'approved', 'rejected', 'canceled']).isRequired,
};