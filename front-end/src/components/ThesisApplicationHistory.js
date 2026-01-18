import React, { useEffect, useRef, useState } from 'react';
import { Card, Col, Row, Button, Modal, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import '../styles/utilities.css';
import CustomBadge from './CustomBadge';
import ApplicationProgressTracker from './ApplicationProgressTracker';
import moment from 'moment';
import API from '../API';
import PropTypes from 'prop-types';

export default function ThesisApplicationHistory(props) {
  const { thesisApplication } = props;
  const teachers = [thesisApplication.supervisor, ...thesisApplication.coSupervisors];
  const [statusHistory, setStatusHistory] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    API.getStatusHistoryApplication(thesisApplication.id)
      .then((data) => {
        setStatusHistory(data);
      })
      .catch((error) => {
        console.error('Error fetching status history:', error);
        setStatusHistory([]);
      });
  }, [thesisApplication]);

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      await API.withdrawApplication(thesisApplication.id);
      setShowWithdrawModal(false);
      window.location.reload();
    } catch (error) {
      console.error('Error withdrawing application:', error);
      alert(t('carriera.tesi.errors.withdraw_failed'));
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const canWithdraw = thesisApplication.status === 'pending';

  return thesisApplication && (
    <div className="proposals-container">
      <Card className="mb-3 roundCard py-2">
        {thesisApplication.topic && (
          <Card.Header className="border-0">
            <Row className='d-flex justify-content-between align-items-center'>
              <Col xs={12} style={{ marginBottom: '10px' }}>
                <h3 className="thesis-topic">
                  <i className="fa-solid fa-graduation-cap fa-sm pe-2" />
                  {t('carriera.tesi.your_application')}{thesisApplication.topic}
                </h3>
              </Col>
            </Row>
          </Card.Header>
        )}
        <Card.Body className="pt-2 pb-0">
          <Row>
                        {/* Left Column - Progress Tracker & Actions */}
            <Col xs={12} lg={4}>
              <div className="sticky-top" style={{ top: '20px' }}>
                <ApplicationProgressTracker status={thesisApplication.status} />
              </div>
            </Col>
            {/* Left Column - Main Content */}
            <Col xs={12} lg={8}>
              {thesisApplication.description && (
                <MyBlock icon="info-circle" title="carriera.proposte_di_tesi.description" ignoreMoreLines>
                  {thesisApplication.description || '-'}
                </MyBlock>
              )}

              {/* Proposal Details Section */}
              {thesisApplication.proposal && (
                <>
                  {thesisApplication.proposal.keywords && thesisApplication.proposal.keywords.length > 0 && (
                    <MyBlock icon="tags" title="carriera.proposte_di_tesi.keywords" ignoreMoreLines>
                      <CustomBadge
                        variant="keyword"
                        content={thesisApplication.proposal.keywords}
                      />
                    </MyBlock>
                  )}
                  
                  {thesisApplication.proposal.level && (
                    <MyBlock icon="layer-group" title="carriera.proposte_di_tesi.level">
                      <CustomBadge
                        variant="level"
                        content={thesisApplication.proposal.level}
                      />
                    </MyBlock>
                  )}

                  {thesisApplication.proposal.type && (
                    <MyBlock icon="shapes" title="carriera.proposte_di_tesi.type">
                      <CustomBadge
                        variant="type"
                        content={thesisApplication.proposal.type}
                      />
                    </MyBlock>
                  )}

                  {thesisApplication.proposal.expiration && (
                    <MyBlock icon="calendar-xmark" title="carriera.proposte_di_tesi.expiration">
                      {moment(thesisApplication.proposal.expiration).format('DD/MM/YYYY')}
                    </MyBlock>
                  )}

                  {thesisApplication.proposal.requiredKnowledge && (
                    <MyBlock icon="book" title="carriera.proposte_di_tesi.required_knowledge" ignoreMoreLines>
                      {thesisApplication.proposal.requiredKnowledge}
                    </MyBlock>
                  )}

                  {thesisApplication.proposal.notes && (
                    <MyBlock icon="note-sticky" title="carriera.proposte_di_tesi.notes" ignoreMoreLines>
                      {thesisApplication.proposal.notes}
                    </MyBlock>
                  )}
                </>
              )}

              {teachers && teachers.length > 0 && (
                <MyBlock icon="user-plus" title="carriera.tesi.supervisors" ignoreMoreLines>
                  <CustomBadge
                    variant="teacher"
                    content={teachers.map(cs => `${cs.lastName} ${cs.firstName}`)}
                  />
                </MyBlock>
              )}

              {/* Company Details */}
              {thesisApplication.company && (
                <>
                  <MyBlock icon="building" title="carriera.tesi.company.name">
                    {thesisApplication.company.name}
                  </MyBlock>
                  
                  {thesisApplication.company.internshipPeriod && (
                    <MyBlock icon="calendar-days" title="carriera.tesi.company.internship_period">
                      {thesisApplication.company.internshipPeriod}
                    </MyBlock>
                  )}

                  {thesisApplication.company.contact && (
                    <MyBlock icon="user-tie" title="carriera.tesi.company.contact">
                      {thesisApplication.company.contact}
                    </MyBlock>
                  )}

                  <MyBlock icon="file-lines" title="carriera.tesi.utilities.template" ignoreMoreLines>
                    <a
                      href={`https://didattica.polito.it/pls/portal30/stagejob.tesi_in_azi.pdf_it`}
                      className="info-detail d-flex align-items-center"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="fi fi-it fa-fw me-2" />{t('carriera.tesi.utilities.italian_version')}
                    </a>
                    <a
                      href={`https://didattica.polito.it/pls/portal30/stagejob.tesi_in_azi.pdf_en`}
                      className="info-detail d-flex align-items-center"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="fi fi-gb fa-fw me-2" />{t('carriera.tesi.utilities.english_version')}
                    </a>
                  </MyBlock>
                </>
              )}

              <MyBlock icon="calendar-clock" title="carriera.tesi.submission_date">
                {moment(thesisApplication.submissionDate).format('DD/MM/YYYY - HH:mm')}
              </MyBlock>

              <MyBlock icon="diagram-project" title="carriera.tesi.status" ignoreMoreLines>
                <CustomBadge
                  variant="app_status"
                  content={thesisApplication.status}
                />
              </MyBlock>
            </Col>


          </Row>
        </Card.Body>
      </Card>

      {/* Withdraw Confirmation Modal */}
      <Modal show={showWithdrawModal} onHide={() => setShowWithdrawModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('carriera.tesi.actions.withdraw_confirmation_title')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <i className="fa-solid fa-triangle-exclamation me-2" />
            {t('carriera.tesi.actions.withdraw_warning')}
          </Alert>
          <p>{t('carriera.tesi.actions.withdraw_confirmation_message')}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowWithdrawModal(false)} disabled={isWithdrawing}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={handleWithdraw} disabled={isWithdrawing}>
            {isWithdrawing ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                {t('common.loading')}
              </>
            ) : (
              <>
                <i className="fa-solid fa-times me-1" />
                {t('carriera.tesi.actions.withdraw')}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// Status History Timeline Component
function StatusHistoryTimeline({ statusHistory }) {
  const { t } = useTranslation();

  const getStatusIcon = (status) => {
    const icons = {
      'pending': 'clock',
      'approved': 'check-circle',
      'rejected': 'times-circle',
      'canceled': 'ban'
    };
    return icons[status] || 'circle';
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#ffc107',
      'approved': '#28a745',
      'rejected': '#dc3545',
      'canceled': '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

  return (
    <div className="mb-4">
      <h5 className="mb-3">
        <i className="fa-solid fa-clock-rotate-left me-2" />
        {t('carriera.tesi.history.title')}
      </h5>
      <div className="status-timeline">
        {statusHistory.map((item, index) => (
          <div key={index} className="timeline-item d-flex mb-3">
            <div className="timeline-marker" style={{ 
              minWidth: '40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div 
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(item.status),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}
              >
                <i className={`fa-solid fa-${getStatusIcon(item.status)}`} style={{ fontSize: '0.8rem' }} />
              </div>
              {index < statusHistory.length - 1 && (
                <div style={{
                  width: '2px',
                  flex: 1,
                  backgroundColor: '#dee2e6',
                  minHeight: '20px',
                  marginTop: '5px'
                }} />
              )}
            </div>
            <div className="timeline-content ms-3 flex-grow-1">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <strong>
                    <CustomBadge variant="app_status" content={item.status} />
                  </strong>
                  {item.changedBy && (
                    <div className="text-muted small mt-1">
                      <i className="fa-solid fa-user fa-fw me-1" />
                      {item.changedBy.firstName} {item.changedBy.lastName}
                    </div>
                  )}
                  {item.notes && (
                    <div className="mt-2 p-2" style={{ 
                      backgroundColor: '#f8f9fa', 
                      borderLeft: '3px solid ' + getStatusColor(item.status),
                      borderRadius: '4px'
                    }}>
                      <small>{item.notes}</small>
                    </div>
                  )}
                </div>
                <div className="text-muted small text-nowrap ms-2">
                  <i className="fa-solid fa-calendar fa-fw me-1" />
                  {moment(item.timestamp).format('DD/MM/YYYY HH:mm')}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyBlock({ icon, title, children, ignoreMoreLines }) {
  const { t } = useTranslation();
  const [moreLines, setMoreLines] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (ignoreMoreLines) {
      return;
    }
    const element = contentRef.current;
    if (element) {
      const computedStyle = window.getComputedStyle(element);
      const lineHeight = parseFloat(computedStyle.lineHeight);
      const lines = element.offsetHeight / lineHeight;

      setMoreLines(lines > 1);
    }
  }, [children, ignoreMoreLines]);

  return (
    <div className={moreLines ? 'text-container' : 'info-container mb-3'}>
      <div className={`title-container ${moreLines ? 'pb-1' : ''}`}>
        {icon && <i className={`fa-regular fa-${icon} fa-fw`} />}
        {t(title)}:
      </div>
      <div ref={contentRef} className={`info-detail ${moreLines ? 'aligned mb-3' : ''}`}>
        {children}
      </div>
    </div>
  );
}

ThesisApplicationHistory.propTypes = {
  thesisApplication: PropTypes.shape({
    id: PropTypes.number.isRequired,
    topic: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    submissionDate: PropTypes.string,
    description: PropTypes.string,
    company: PropTypes.shape({
      name: PropTypes.string,
      internshipPeriod: PropTypes.string,
      contact: PropTypes.string,
    }),
    proposal: PropTypes.shape({
      keywords: PropTypes.arrayOf(PropTypes.string),
      level: PropTypes.string,
      type: PropTypes.string,
      expiration: PropTypes.string,
      requiredKnowledge: PropTypes.string,
      notes: PropTypes.string,
    }),
    supervisor: PropTypes.object.isRequired,
    coSupervisors: PropTypes.array,
  }).isRequired,
};

MyBlock.propTypes = {
  icon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  ignoreMoreLines: PropTypes.bool,
};

StatusHistoryTimeline.propTypes = {
  statusHistory: PropTypes.arrayOf(PropTypes.shape({
    status: PropTypes.string.isRequired,
    timestamp: PropTypes.string.isRequired,
    changedBy: PropTypes.shape({
      firstName: PropTypes.string,
      lastName: PropTypes.string,
    }),
    notes: PropTypes.string,
  })).isRequired,
};