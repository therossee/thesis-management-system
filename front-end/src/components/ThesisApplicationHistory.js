import React, { useEffect, useRef, useState } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import '../styles/utilities.css';
import CustomBadge from './CustomBadge';
import ApplicationProgressTracker from './ApplicationProgressTracker';
import TeacherContactCard from './TeacherContactCard';
import moment from 'moment';
import API from '../API';
import PropTypes from 'prop-types';

export default function ThesisApplicationHistory(props) {
  const { thesisApplication } = props;
  const teachers = [thesisApplication.supervisor, ...thesisApplication.coSupervisors];
  const [statusHistory, setStatusHistory] = useState([]);
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

    // Fetch student statistics
    /*API.getStudentApplicationStats()
      .then((data) => {
        setStudentStats(data);
      })
      .catch((error) => {
        console.error('Error fetching student stats:', error);
      });*/
  }, [thesisApplication]);

  const getAverageResponseTime = () => {
    if (!statusHistory || statusHistory.length < 2) return null;

    const submissionDate = moment(thesisApplication.submissionDate);
    const responseDate = statusHistory.find(h => h.status !== 'pending');

    if (!responseDate) return null;

    const duration = moment.duration(moment(responseDate.timestamp).diff(submissionDate));
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();

    return { days, hours };
  };

  const responseTime = getAverageResponseTime();

  return thesisApplication && (
    <div className="proposals-container">
      <Row className="mb-3">
        <Col>
          <Card className="mb-3 roundCard py-2">
            {thesisApplication.topic && (
              <Card.Header className="border-0">
                <Row className='d-flex justify-content-between align-items-center'>
                  <Col xs={12} style={{ marginBottom: '10px' }}>
                    <h3 className="thesis-topic">
                      <i className="fa-solid fa-graduation-cap fa-sm pe-2" />
                      {t('carriera.tesi.your_application')}
                    </h3>
                  </Col>
                </Row>
              </Card.Header>
            )}
            <Card.Body className="pt-2 pb-0">
              <MyBlock icon="book-open" title="carriera.proposte_di_tesi.topic">
                {thesisApplication.topic}
              </MyBlock>
              {thesisApplication.description && (
                <MyBlock icon="info-circle" title="carriera.proposte_di_tesi.description" ignoreMoreLines>
                  {thesisApplication.description || '-'}
                </MyBlock>
              )}

              {thesisApplication.thesisProposal && (
                <>
                  {thesisApplication.thesisProposal.keywords && thesisApplication.thesisProposal.keywords.length > 0 && (
                    <MyBlock icon="tags" title="carriera.proposte_di_tesi.keywords" ignoreMoreLines>
                      <CustomBadge
                        variant="keyword"
                        content={thesisApplication.thesisProposal.keywords}
                      />
                    </MyBlock>
                  )}

                  {thesisApplication.thesisProposal.level && (
                    <MyBlock icon="layer-group" title="carriera.proposte_di_tesi.level">
                      <CustomBadge
                        variant="level"
                        content={thesisApplication.thesisProposal.level}
                      />
                    </MyBlock>
                  )}

                  {thesisApplication.thesisProposal.type && (
                    <MyBlock icon="shapes" title="carriera.proposte_di_tesi.type">
                      <CustomBadge
                        variant="type"
                        content={thesisApplication.thesisProposal.type}
                      />
                    </MyBlock>
                  )}

                  {thesisApplication.thesisProposal.expiration && (
                    <MyBlock icon="calendar-xmark" title="carriera.proposte_di_tesi.expiration">
                      {moment(thesisApplication.thesisProposal.expiration).format('DD/MM/YYYY')}
                    </MyBlock>
                  )}

                  {thesisApplication.thesisProposal.requiredKnowledge && (
                    <MyBlock icon="book" title="carriera.proposte_di_tesi.required_knowledge" ignoreMoreLines>
                      {thesisApplication.thesisProposal.requiredKnowledge}
                    </MyBlock>
                  )}

                  {thesisApplication.thesisProposal.notes && (
                    <MyBlock icon="note-sticky" title="carriera.proposte_di_tesi.notes" ignoreMoreLines>
                      {thesisApplication.thesisProposal.notes}
                    </MyBlock>
                  )}
                </>
              )}


              <MyBlock icon="calendar-clock" title="carriera.tesi.submission_date">
                {moment(thesisApplication.submissionDate).format('DD/MM/YYYY - HH:mm')}
              </MyBlock>

              {responseTime && (
                <MyBlock icon="clock" title="carriera.tesi.response_time">
                  {responseTime.days > 0 && `${responseTime.days} ${t('carriera.tesi.days')} `}
                  {responseTime.hours > 0 && `${responseTime.hours} ${t('carriera.tesi.hours')}`}
                </MyBlock>
              )}
            </Card.Body>
          </Card>
              <TeacherContactCard
                supervisor={thesisApplication.supervisor}
                coSupervisors={thesisApplication.coSupervisors}
              />
        </Col>
        <Col>
          <Card className="mb-3 roundCard py-2">
            <Card.Header className="border-0">
              <h3 className="thesis-topic">
                <i className="fa-solid fa-timeline fa-sm pe-2" />
                {"Stato della candidatura"}
              </h3>
            </Card.Header>
            <Card.Body>
              <ApplicationProgressTracker status={thesisApplication.status} />
            </Card.Body>
          </Card>
        </Col>
      </Row>
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