import React, { useContext, useState } from 'react';

import { Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { ToastContext } from '../../App';
import ConclusionRequest from '../../components/ConclusionRequest';
import CustomBreadcrumb from '../../components/CustomBreadcrumb';
import CustomHeader from '../../components/CustomHeader';
import '../../styles/tesi.css';

export default function ConclusioneTesi() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useContext(ToastContext);
  const [requestSubmittedSuccess, setRequestSubmittedSuccess] = useState(false);
  const [saveDraftTrigger, setSaveDraftTrigger] = useState(0);

  const handleConclusionRequestResult = success => {
    setRequestSubmittedSuccess(success);
    if (success) {
      showToast({
        success: true,
        title: t('carriera.conclusione_tesi.request_submitted_title'),
        message: t('carriera.conclusione_tesi.request_submitted_content'),
      });
    } else {
      showToast({
        success: false,
        title: t('carriera.conclusione_tesi.request_submission_failed_title'),
        message: t('carriera.conclusione_tesi.request_submission_failed_content'),
      });
    }
  };

  const handleSaveDraftResult = success => {
    showToast({
      success,
      title: t('carriera.conclusione_tesi.save_draft_title'),
      message: success ? t('carriera.conclusione_tesi.draft_saved') : t('carriera.conclusione_tesi.draft_save_failed'),
    });
  };

  return (
    <>
      <CustomBreadcrumb />
      <div className="proposal-container justify-content-between d-flex tesi-header-bar tesi-header-bar--flush-right">
        <CustomHeader title={t('carriera.conclusione_tesi.title')} action={() => navigate('/carriera/tesi')} />
        {!requestSubmittedSuccess && (
          <div className="tesi-header-actions">
            <Button
              className="btn-outlined-light tesi-header-action-btn d-flex align-items-center"
              type="button"
              onClick={() => setSaveDraftTrigger(prev => prev + 1)}
            >
              <i className="fa-regular fa-floppy-disk me-2" />
              {t('carriera.conclusione_tesi.save_draft')}
            </Button>
          </div>
        )}
      </div>
      <ConclusionRequest
        onSubmitResult={handleConclusionRequestResult}
        saveDraftTrigger={saveDraftTrigger}
        onSaveDraftResult={handleSaveDraftResult}
      />
    </>
  );
}
