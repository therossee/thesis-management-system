import React, { useContext, useEffect, useRef, useState } from 'react';

import { Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import PropTypes from 'prop-types';

import API from '../../API';
import { LoggedStudentContext, ThemeContext, ToastContext } from '../../App';
import CustomBreadcrumb from '../../components/CustomBreadcrumb';
import CustomHeader from '../../components/CustomHeader';
import LoadingModal from '../../components/LoadingModal';
import PillButtonGroup from '../../components/PillButtonGroup';
import Thesis from '../../components/Thesis';
import ThesisProposals from '../../components/ThesisProposals';
import '../../styles/tesi.css';
import { getSystemTheme } from '../../utils/utils';

export default function Tesi({ initialActiveTab }) {
  const [thesisApplication, setThesisApplication] = useState(null);
  const [thesis, setThesis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const pendingToastRef = useRef(null);
  const { loggedStudent } = useContext(LoggedStudentContext);
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showFinalThesis, setShowFinalThesis] = useState(false);
  const { theme } = useContext(ThemeContext);
  const { showToast } = useContext(ToastContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;

  useEffect(() => {
    // Update active tab based on URL path
    if (location.pathname.includes('/proposte_di_tesi')) {
      setActiveTab('proposals');
    } else if (location.pathname.includes('/richiesta_tesi')) {
      setActiveTab('application_form');
    } else {
      setActiveTab('thesis');
    }
  }, [location.pathname]);
  const tabs = [
    {
      key: 'thesis',
      label: thesis
        ? t('carriera.tesi.tabs.thesis')
        : thesisApplication
          ? t('carriera.tesi.tabs.thesis_application')
          : t('carriera.tesi.tabs.no_thesis'),
      value: 'thesis',
      onClick: () => {
        setActiveTab('thesis');
        navigate('/carriera/tesi');
      },
    },
    {
      key: 'proposals',
      label: t('carriera.tesi.tabs.proposals'),
      value: 'proposals',
      onClick: () => {
        setActiveTab('proposals');
        navigate('/carriera/tesi/proposte_di_tesi');
      },
    },
  ];

  useEffect(() => {
    setIsLoading(true);
    if (!loggedStudent) return;
    Promise.all([API.getLoggedStudentThesis(), API.getLastStudentApplication()])
      .then(([fetchedThesis, fetchedThesisApplication]) => {
        setThesis(fetchedThesis);
        setThesisApplication(fetchedThesisApplication);
      })
      .catch(error => {
        console.error('Error fetching thesis or thesis application data:', error);
      })
      .finally(() => {
        setIsLoading(false);
        if (pendingToastRef.current) {
          showToast(pendingToastRef.current);
          pendingToastRef.current = null;
        }
      });
  }, [loggedStudent, refreshKey]);

  const handleRequestSubmitResult = success => {
    if (success) {
      pendingToastRef.current = {
        success: true,
        title: t('carriera.richiesta_tesi.success'),
        message: t('carriera.richiesta_tesi.success_content'),
      };
      setRefreshKey(prev => prev + 1);
    } else {
      showToast({
        success: false,
        title: t('carriera.richiesta_tesi.error'),
        message: t('carriera.richiesta_tesi.error_content'),
      });
    }
  };

  const handleFinalThesisUploadResult = success => {
    if (success) {
      pendingToastRef.current = {
        success: true,
        title: t('carriera.conclusione_tesi.final_thesis_uploaded_title'),
        message: t('carriera.conclusione_tesi.final_thesis_uploaded_content'),
      };
      setRefreshKey(prev => prev + 1);
    } else {
      showToast({
        success: false,
        title: t('carriera.conclusione_tesi.final_thesis_upload_failed_title'),
        message: t('carriera.conclusione_tesi.final_thesis_upload_failed_content'),
      });
    }
  };

  const handleCancelApplicationResult = success => {
    if (success) {
      pendingToastRef.current = {
        success: true,
        title: t('carriera.tesi.success_application_cancelled'),
        message: t('carriera.tesi.success_application_cancelled_content'),
      };
      setRefreshKey(prev => prev + 1);
    } else {
      showToast({
        success: false,
        title: t('carriera.tesi.error_application_cancelled'),
        message: t('carriera.tesi.error_application_cancelled_content'),
      });
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingModal show={isLoading} onHide={() => setIsLoading(false)} />;
    } else {
      switch (activeTab) {
        case 'thesis':
          return (
            <Thesis
              thesis={thesis}
              thesisApplication={thesis ? null : thesisApplication}
              showModal={showModal}
              setShowModal={setShowModal}
              showRequestModal={showRequestModal}
              setShowRequestModal={setShowRequestModal}
              onRequestSubmitResult={handleRequestSubmitResult}
              onCancelApplicationResult={handleCancelApplicationResult}
              showFinalThesis={showFinalThesis}
              setShowFinalThesis={setShowFinalThesis}
              onFinalThesisUploadResult={handleFinalThesisUploadResult}
            />
          );
        case 'proposals':
          return <ThesisProposals showRequestModal={showRequestModal} setShowRequestModal={setShowRequestModal} />;
        default:
          return null;
      }
    }
  };

  return (
    <>
      <CustomBreadcrumb activeTab={tabs.filter(tab => tab.key === activeTab)[0].label} />
      <div className="proposal-container justify-content-between d-flex tesi-header-bar">
        <CustomHeader title={t('carriera.tesi.title')} action={() => navigate('/carriera')} />
        {thesis &&
          activeTab === 'thesis' &&
          (thesis.thesisStatus === 'ongoing' || thesis.thesisStatus === 'conclusion_rejected') && (
            <div className="tesi-header-actions">
              <Button
                className={`btn-primary-${appliedTheme} tesi-header-action-btn`}
                onClick={() => navigate('/carriera/tesi/conclusione_tesi')}
                style={{
                  height: '30px',
                  display: 'flex',
                  borderRadius: '6px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 10px',
                }}
              >
                <i className="fa-regular fa-circle-check me-1" /> {t('carriera.tesi.conclusion_request_button')}
              </Button>
            </div>
          )}
        {thesis && activeTab === 'thesis' && thesis.thesisStatus === 'final_thesis' && (
          <Button
            className={`btn-primary-${appliedTheme} tesi-header-action-btn`}
            onClick={() => setShowFinalThesis(true)}
            style={{
              height: '30px',
              display: 'flex',
              borderRadius: '6px',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 10px',
            }}
          >
            <i className="fa-regular fa-circle-check me-1" /> {t('carriera.tesi.upload_final_thesis_button')}
          </Button>
        )}
        {thesisApplication && activeTab === 'thesis' && thesisApplication.status === 'pending' && (
          <Button
            variant="outline-danger"
            onClick={() => setShowModal(true)}
            className="tesi-header-action-btn"
            style={{
              height: '30px',
              display: 'flex',
              borderRadius: '6px',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 10px',
            }}
          >
            <i className="fa-regular fa-trash-can me-1" /> {t('carriera.tesi.cancel_application')}
          </Button>
        )}
      </div>
      <div className="mb-3">
        <PillButtonGroup options={tabs} active={activeTab} />
      </div>
      {renderContent()}
    </>
  );
}

Tesi.propTypes = {
  initialActiveTab: PropTypes.string.isRequired,
};
