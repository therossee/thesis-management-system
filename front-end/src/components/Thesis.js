import React, { useContext, useEffect, useState } from 'react';

import { Button, Card, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import PropTypes from 'prop-types';

import API from '../API';
import { ThemeContext, ToastContext } from '../App';
import '../styles/utilities.css';
import { getSystemTheme } from '../utils/utils';
import CustomModal from './CustomModal';
import FinalThesisUpload from './FinalThesisUpload';
import LoadingModal from './LoadingModal';
import TeacherContactCard from './TeacherContactCard';
import ThesisRequestModal from './ThesisRequestModal';
import Timeline from './Timeline';

export default function Thesis(props) {
  const {
    thesis,
    thesisApplication,
    showModal,
    setShowModal,
    showRequestModal,
    setShowRequestModal,
    onRequestSubmitResult,
    onFinalThesisUploadResult,
    onCancelApplicationResult,
    showFinalThesis,
    setShowFinalThesis,
  } = props;
  const data = thesis ? thesis : thesisApplication;
  const [isLoading, setIsLoading] = useState(false);
  const [showFullTopic, setShowFullTopic] = useState(false);
  const { showToast } = useContext(ToastContext);
  const supervisors = data ? [data.supervisor, ...data.coSupervisors] : [];
  const activeStep = data ? (thesis ? thesis.thesisStatus : thesisApplication.status) : 'none';
  const [appStatusHistory, setAppStatusHistory] = useState(thesis ? thesis.applicationStatusHistory : []);
  const modalTitle = thesis ? 'carriera.tesi.modal_cancel.title' : 'carriera.tesi.cancel_application';
  const modalBody = thesis ? 'carriera.tesi.modal_cancel.body' : 'carriera.tesi.cancel_application_content';
  const modalConfirmText = thesis ? 'carriera.tesi.modal_cancel.confirm_text' : 'carriera.tesi.confirm_cancel';
  const modalConfirmIcon = thesis ? 'fa-regular fa-trash-can' : 'fa-regular fa-xmark';
  const [sessionDeadlines, setSessionDeadlines] = useState({ graduationSession: null, deadlines: [] });
  const [isEligible, setIsEligible] = useState(true);
  const { theme } = useContext(ThemeContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;
  const { t } = useTranslation();
  console.log(sessionDeadlines);

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
      API.getSessionDeadlines('thesis')
        .then(deadlines => {
          setSessionDeadlines(deadlines);
        })
        .catch(error => {
          console.error('Error fetching session deadlines:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
      return;
    } else if (thesisApplication) {
      API.getStatusHistoryApplication(data.id)
        .then(history => {
          setAppStatusHistory(history);
        })
        .catch(error => {
          console.error('Error fetching thesis application status history:', error);
        });
      API.checkStudentEligibility()
        .then(data => {
          setIsEligible(data.eligible);
        })
        .catch(error => {
          console.error('Error checking student eligibility:', error);
        });
      API.getSessionDeadlines('application')
        .then(deadlines => {
          setSessionDeadlines(deadlines);
        })
        .catch(error => {
          console.error('Error fetching session deadlines:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      API.checkStudentEligibility()
        .then(data => {
          setIsEligible(data.eligible);
        })
        .catch(error => {
          console.error('Error checking student eligibility:', error);
        });
      API.getSessionDeadlines('no_application')
        .then(deadlines => {
          setSessionDeadlines(deadlines);
        })
        .catch(error => {
          console.error('Error fetching session deadlines:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [thesis, thesisApplication]);

  if (isLoading) {
    return <LoadingModal show={isLoading} onHide={() => setIsLoading(false)} />;
  }
  return (
    <>
      <div className="proposals-container">
        <Row className="mb-3">
          <Col md={4} lg={4}>
            <Timeline
              activeStep={activeStep}
              statusHistory={appStatusHistory}
              conclusionRequestDate={thesis ? thesis.thesisConclusionRequestDate : null}
              conclusionConfirmedDate={thesis ? thesis.thesisConclusionConfirmedDate : null}
              session={sessionDeadlines}
            />
          </Col>
          {!thesis && !thesisApplication && (
            <>
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
                        onClick={() => {
                          setShowRequestModal(true);
                        }}
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
                <Card className="mb-3 roundCard py-2 ">
                  <Card.Header className="border-0 d-flex justify-content-center align-items-center">
                    <h3 className="thesis-topic" style={{ fontStyle: 'italic' }}>
                      Informazioni di carattere generico
                    </h3>
                  </Card.Header>
                  <Card.Body className="pt-2 pb-0">
                    <p style={{ fontSize: 'var(--font-size-sm)', fontStyle: 'italic' }} className="text-center">
                      Puoi aggiungere qui altre informazioni utili per lo studente che non ha ancora una tesi in corso o
                      una candidatura inviata.
                    </p>
                  </Card.Body>
                </Card>
              </Col>
            </>
          )}
          {(thesis || thesisApplication) && (
            <Col md={8} lg={8}>
              <Card className="mb-3 roundCard py-2 pb-2">
                <Card.Header className="border-0">
                  <h3 className="thesis-topic">
                    <i className="fa-regular fa-book-open fa-sm pe-2" />
                    {data.title
                      ? `${t('carriera.conclusione_tesi.title_thesis')}: ${data.title}`
                      : t('carriera.proposte_di_tesi.topic')}
                  </h3>
                </Card.Header>
                <Card.Body className="pt-2 pb-0">
                  <p className="info-detail">
                    {data.abstract ? (
                      data.abstract.length > 600 && !showFullTopic ? (
                        <>{`${t('carriera.conclusione_tesi.abstract_text')} ${data.abstract.substring(0, 597) + '... '}`}</>
                      ) : (
                        <>{data.abstract}</>
                      )
                    ) : data.topic.length > 600 && !showFullTopic ? (
                      <>{data.topic.substring(0, 597) + '... '}</>
                    ) : (
                      <>{data.topic}</>
                    )}
                  </p>
                  {data.topic.length > 600 && (
                    <Button
                      variant="contact-link"
                      onClick={() => setShowFullTopic(!showFullTopic)}
                      aria-expanded={showFullTopic}
                      className="p-0 h3 thesis-topic d-flex align-items-center gap-2 mb-3"
                    >
                      <i className={`fa-regular fa-chevron-${showFullTopic ? 'up' : 'down'} cosupervisor-button`} />
                      <span className="cosupervisor-button">
                        {t(`carriera.tesi.${showFullTopic ? 'show_less' : 'show_more'}`)}
                      </span>
                    </Button>
                  )}
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
                      {thesis ||
                      (thesisApplication.status !== 'rejected' && thesisApplication.status !== 'cancelled') ? (
                        <Card className="mb-3 roundCard py-2 ">
                          <Card.Header className="border-0">
                            <h3 className="thesis-topic">
                              <i className="fa-regular fa-info-circle" /> {t('carriera.tesi.information.title')}
                            </h3>
                          </Card.Header>
                          <Card.Body>
                            <ul>
                              <li>{t('carriera.tesi.information.line_1')}</li>
                              <li>{t('carriera.tesi.information.line_2')}</li>
                              <li>{t('carriera.tesi.information.line_3')}</li>
                              <li>{t('carriera.tesi.information.line_4')}</li>
                              <li>{t('carriera.tesi.information.line_5')}</li>
                            </ul>
                          </Card.Body>
                        </Card>
                      ) : (
                        <Card className="mb-1 roundCard py-2 ">
                          <Card.Header className="border-0">
                            <h3 className="thesis-topic">
                              <i className="fa-regular fa-route" />{' '}
                              {thesisApplication.status === 'rejected'
                                ? t('carriera.richiesta_tesi.next_steps_rejected.title')
                                : t('carriera.richiesta_tesi.next_steps_cancelled.title')}
                            </h3>
                          </Card.Header>
                          <Card.Body>
                            <p
                              dangerouslySetInnerHTML={{
                                __html:
                                  thesisApplication.status === 'rejected'
                                    ? t('carriera.richiesta_tesi.next_steps_rejected.content')
                                    : t('carriera.richiesta_tesi.next_steps_cancelled.content'),
                              }}
                              style={{ fontSize: 'var(--font-size-sm)' }}
                            />
                            {isEligible && (
                              <Button
                                className={`btn-primary-${appliedTheme} tesi-header-action-btn align-items-center d-flex mt-3 mx-auto`}
                                onClick={() => {
                                  setShowRequestModal(true);
                                }}
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
                      )}
                    </Col>
                  </>
                )}
              </Row>
            </Col>
          )}
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
        <FinalThesisUpload
          show={showFinalThesis}
          setShow={setShowFinalThesis}
          onSubmitResult={onFinalThesisUploadResult}
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
          <i className="fa-regular fa-book fa-sm pe-2" />
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
    thesisFilePath: PropTypes.string,
    thesisResumePath: PropTypes.string,
    additionalZipPath: PropTypes.string,
    thesisConclusionRequestDate: PropTypes.string,
    thesisConclusionConfirmedDate: PropTypes.string,
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
  showConclusionRequest: PropTypes.bool,
  setShowConclusionRequest: PropTypes.func,
  onCancelApplicationResult: PropTypes.func.isRequired,
  showFinalThesis: PropTypes.bool,
  setShowFinalThesis: PropTypes.func,
  onFinalThesisUploadResult: PropTypes.func.isRequired,
  onConclusionRequestResult: PropTypes.func.isRequired,
};
