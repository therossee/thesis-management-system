import React, { useContext, useEffect, useState } from 'react';

import { Button, Card, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import PropTypes from 'prop-types';

import API from '../API';
import { ToastContext } from '../App';
import '../styles/utilities.css';
import CustomModal from './CustomModal';
import LoadingModal from './LoadingModal';
import TeacherContactCard from './TeacherContactCard';
import ThesisRequestModal from './ThesisRequestModal';
import Timeline from './Timeline';
import ConclusionRequest from './ConclusionRequest';

export default function Thesis(props) {
  const {
    thesis,
    thesisApplication,
    showModal,
    setShowModal,
    showRequestModal,
    setShowRequestModal,
    showConclusionRequest,
    setShowConclusionRequest,
    onRequestSubmitResult,
    onCancelApplicationResult,
  } = props;
  const data = thesis ? thesis : thesisApplication;
  const [isLoading, setIsLoading] = useState(false);
  const [showFullTopic, setShowFullTopic] = useState(false);
  const { showToast } = useContext(ToastContext);
  const supervisors = [data.supervisor, ...data.coSupervisors];
  const activeStep = thesis ? thesis.thesisStatus : thesisApplication.status;
  const [appStatusHistory, setAppStatusHistory] = useState(thesis ? thesis.applicationStatusHistory : []);
  const modalTitle = thesis ? 'carriera.tesi.modal_cancel.title' : 'carriera.tesi.cancel_application';
  const modalBody = thesis ? 'carriera.tesi.modal_cancel.body' : 'carriera.tesi.cancel_application_content';
  const modalConfirmText = thesis ? 'carriera.tesi.modal_cancel.confirm_text' : 'carriera.tesi.confirm_cancel';
  const modalConfirmIcon = thesis ? 'fa-regular fa-trash-can' : 'fa-regular fa-xmark';
  const { t } = useTranslation();

  const handleCancelApplication = () => {
    setIsLoading(true);
    API.cancelThesisApplication({ applicationId: data.id })
      .then(() => {
        showToast({
          success: true,
          title: t('carriera.tesi.success_application_cancelled'),
          message: t('carriera.tesi.success_application_cancelled_content'),
        });
        setShowModal(false);
        onCancelApplicationResult(true);
      })
      .catch(error => {
        console.error('Error cancelling thesis application:', error);
        showToast({
          success: false,
          title: t('carriera.tesi.error_application_cancelled'),
          message: t('carriera.tesi.error_application_cancelled_content'),
        });
        setShowModal(false);
        onCancelApplicationResult(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (thesis) {
      setIsLoading(false);
      return;
    }
    API.getStatusHistoryApplication(data.id)
      .then(history => {
        setAppStatusHistory(history);
      })
      .catch(error => {
        console.error('Error fetching thesis application status history:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [thesis, thesisApplication]);

  if (isLoading) {
    return <LoadingModal show={isLoading} onHide={() => setIsLoading(false)} />;
  }
  return (
    <>
      <div className="proposals-container">
        <Row className="mb-3">
          <Col md={4} lg={4}>
            <Timeline activeStep={activeStep} statusHistory={appStatusHistory} />
          </Col>
          <Col md={8} lg={8}>
            <Card className="mb-3 roundCard py-2 pb-2">
              <Card.Header className="border-0">
                <h3 className="thesis-topic">
                  <i className="fa-solid fa-book-open fa-sm pe-2" />
                  {t('carriera.proposte_di_tesi.topic')}
                </h3>
              </Card.Header>
              <Card.Body className="pt-2 pb-0">
                <p className="info-detail">
                  {data.topic.length > 600 && !showFullTopic
                    ? (
                      <>
                        {data.topic.substring(0, 597) + '... '}
                      </>
                    )
                    : (
                      <>
                        {data.topic}
                      </>
                    )
                  }
                </p>
                <Button
                variant="contact-link"
                onClick={() => setShowFullTopic(!showFullTopic)}
                aria-expanded={showFullTopic}
                className="p-0 h3 thesis-topic d-flex align-items-center gap-2 mb-3"
              >
                <i className={`fa-solid fa-chevron-${showFullTopic ? 'up' : 'down'} cosupervisor-button`} />
                <span className="cosupervisor-button">{t(`carriera.tesi.${showFullTopic ? 'show_less' : 'show_more'}`)}</span>
              </Button>
              </Card.Body>
            </Card>
            <Row className="mb-3">
              {thesis && (
                <>
                  <Col md={7} lg={7}>
                    {supervisors && (
                      <TeacherContactCard supervisor={data.supervisor} coSupervisors={data.coSupervisors} />
                    )}
                  </Col>
                  <Col md={5} lg={5}>
                    <LinkCard />
                  </Col>
                </>
              )}
              {thesisApplication && (
                <>
                  <Col>
                    {supervisors && (
                      <TeacherContactCard supervisor={data.supervisor} coSupervisors={data.coSupervisors} />
                    )}
                  </Col>
                  <Col md={5}>
                    <Card className="mb-3 roundCard py-2 ">
                      <Card.Header className="border-0">
                        <h3 className="thesis-topic">
                          <i className="fa-solid fa-info-circle" /> {t('carriera.tesi.information.title')}
                        </h3>
                      </Card.Header>
                      <Card.Body>
                        <ul>
                          <li>
                            {t('carriera.tesi.information.line_1')}
                          </li>
                          <li>{t('carriera.tesi.information.line_2')}</li>
                          <li>
                            {t('carriera.tesi.information.line_3')}
                          </li>
                          <li>
                            {t('carriera.tesi.information.line_4')}
                          </li>
                          <li>{t('carriera.tesi.information.line_5')}</li>
                        </ul>
                      </Card.Body>
                    </Card>
                  </Col>
                </>
              )}
            </Row>
          </Col>
        </Row>
        <CustomModal
          show={showModal}
          handleClose={() => setShowModal(false)}
          handleConfirm={handleCancelApplication}
          titleText={modalTitle}
          bodyText={modalBody}
          confirmText={modalConfirmText}
          confirmIcon={modalConfirmIcon}
        />
        <ThesisRequestModal
          show={showRequestModal}
          setShow={setShowRequestModal}
          onSubmitResult={onRequestSubmitResult}
        />
        <ConclusionRequest
          show={showConclusionRequest}
          setShow={setShowConclusionRequest}
          onSubmitResult={() => {console.log('Conclusione richiesta inviata');}}
        />
      </div>
    </>
  );
}

function LinkBlock({ icon, title, link }) {
  const { t } = useTranslation();

  return (
    <div className="link-container mb-3">
      {icon && <i className={`fa-regular fa-${icon} fa-fw`} />}
      <a href={t(link)} target="_blank" rel="noopener noreferrer">{`${t(title)}`}</a>
    </div>
  );
}

function LinkCard() {
  const { t } = useTranslation();
  return (
    <Card className="mb-3 roundCard py-2 ">
      <Card.Header className="border-0">
        <h3 className="thesis-topic">
          <i className="fa-solid fa-book fa-sm pe-2" />
          {t('carriera.tesi.utilities.title')}
        </h3>
      </Card.Header>
      <Card.Body className="pt-2 pb-0">
        <LinkBlock
          icon="copyright"
          title="carriera.tesi.utilities.copyright"
          link="carriera.tesi.utilities.copyright_link"
        />
        <LinkBlock
          icon="file-lines"
          title="carriera.tesi.utilities.thesis_template"
          link="https://www.overleaf.com/latex/templates/politecnico-di-torino-thesis-template/cmpmxftwvvbr"
        />
        <LinkBlock
          icon="file-word"
          title="carriera.tesi.utilities.thesis_cover_word"
          link="carriera.tesi.utilities.thesis_cover_word_link"
        />
        <LinkBlock icon="file-image" title="carriera.tesi.utilities.logo" link="carriera.tesi.utilities.logo_link" />
        <LinkBlock
          icon="link"
          title="carriera.tesi.utilities.plagiarism"
          link="carriera.tesi.utilities.plagiarism_link"
        />
      </Card.Body>
    </Card>
  );
}

LinkBlock.propTypes = {
  icon: PropTypes.string,
  title: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
};

Thesis.propTypes = {
  thesis: PropTypes.shape({
    id: PropTypes.number.isRequired,
    topic: PropTypes.string.isRequired,
    thesisStartDate: PropTypes.string.isRequired,
    conclusionConfirmationDate: PropTypes.string,
    conclusionRequestDate: PropTypes.string,
    supervisor: PropTypes.object.isRequired,
    coSupervisors: PropTypes.arrayOf(PropTypes.object),
    company: PropTypes.shape({
      id: PropTypes.number,
      corporateName: PropTypes.string,
    }),
    applicationStatusHistory: PropTypes.arrayOf(
      PropTypes.shape({
        oldStatus: PropTypes.string,
        newStatus: PropTypes.string.isRequired,
        note: PropTypes.string,
        changeDate: PropTypes.string.isRequired,
      }),
    ).isRequired,
    thesisStatus: PropTypes.string.isRequired,
  }),
  thesisApplication: PropTypes.shape({
    id: PropTypes.number.isRequired,
    topic: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    submissionDate: PropTypes.string.isRequired,
    supervisor: PropTypes.object.isRequired,
    coSupervisors: PropTypes.arrayOf(PropTypes.object),
    statusHistory: PropTypes.arrayOf(
      PropTypes.shape({
        oldStatus: PropTypes.string,
        newStatus: PropTypes.string.isRequired,
        changeDate: PropTypes.string.isRequired,
        note: PropTypes.string,
      }),
    ).isRequired,
  }),
  showModal: PropTypes.bool.isRequired,
  setShowModal: PropTypes.func.isRequired,
  showRequestModal: PropTypes.bool,
  setShowRequestModal: PropTypes.func,
  onRequestSubmitResult: PropTypes.func.isRequired,
};
