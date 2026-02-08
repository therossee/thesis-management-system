import React, { useContext } from 'react';

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

  const handleConclusionRequestResult = success => {
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

  return (
    <>
      <CustomBreadcrumb />
      <CustomHeader title={t('carriera.conclusione_tesi.title')} action={() => navigate(-1)} />
      <ConclusionRequest onSubmitResult={handleConclusionRequestResult} />
    </>
  );
}
