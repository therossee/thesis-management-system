import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';

import { Button, Card, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import moment from 'moment';
import PropTypes from 'prop-types';

import { ThemeContext } from '../App';
import '../styles/custom-progress-tracker.css';
import { getSystemTheme } from '../utils/utils';
import InfoTooltip from './InfoTooltip';

export default function Timeline({
  activeStep,
  statusHistory,
  conclusionRequestDate,
  conclusionConfirmedDate,
  session,
}) {
  const { t, i18n } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;

  const validSteps = new Set([
    'pending',
    'approved',
    'rejected',
    'cancelled',
    'ongoing',
    'conclusion_requested',
    'conclusion_approved',
    'conclusion_rejected',
    'almalaurea',
    'final_exam',
    'final_thesis',
    'done',
  ]);
  const { graduationSession, deadlines } = session || {};
  const hasStatusHistory = Array.isArray(statusHistory) && statusHistory.length > 0;
  const inferredStatus = hasStatusHistory ? statusHistory[statusHistory.length - 1].newStatus : null;
  const normalizedActiveStep = validSteps.has(activeStep)
    ? activeStep
    : validSteps.has(inferredStatus)
      ? inferredStatus
      : null;
  const hasNoData = !normalizedActiveStep && !hasStatusHistory;
  const isDisabled = hasNoData;
  const [show, setShow] = useState(false);
  const timelineScrollRef = useRef(null);
  const sortedDeadlines = useMemo(() => {
    if (!Array.isArray(deadlines) || deadlines.length === 0) return [];
    return [...deadlines]
      .map(deadline => {
        const date = moment.utc(deadline.deadline_date).startOf('day');
        const daysLeft = date.diff(moment.utc().startOf('day'), 'days');
        return { ...deadline, daysLeft };
      })
      .sort((a, b) => moment.utc(a.deadline_date).valueOf() - moment.utc(b.deadline_date).valueOf());
  }, [deadlines]);
  const nextDeadline = useMemo(() => sortedDeadlines.find(deadline => deadline.daysLeft >= 0), [sortedDeadlines]);

  const getHistoryForStatus = targetStatus => {
    if (!statusHistory || statusHistory.length === 0) return null;
    return statusHistory.find(h => h.newStatus === targetStatus);
  };

  const firstStep = {
    key: 'pending',
    label: t('carriera.tesi.thesis_progress.pending'),
    description: t('carriera.tesi.thesis_progress.pending_description'),
  };

  const getSecondStep = () => {
    switch (normalizedActiveStep) {
      case 'approved':
      case 'ongoing':
      case 'conclusion_requested':
      case 'conclusion_approved':
      case 'conclusion_rejected':
      case 'almalaurea':
      case 'final_exam':
      case 'final_thesis':
        return {
          key: 'approved',
          label: t('carriera.tesi.thesis_progress.approved'),
          description: t('carriera.tesi.thesis_progress.approved_description'),
          date: normalizedActiveStep !== 'approved',
        };
      case 'rejected':
        return {
          key: 'rejected',
          label: t('carriera.tesi.thesis_progress.rejected'),
          description: t('carriera.tesi.thesis_progress.rejected_description'),
        };
      case 'cancelled':
        return {
          key: 'cancelled',
          label: t('carriera.tesi.thesis_progress.cancelled'),
          description: t('carriera.tesi.thesis_progress.cancelled_description'),
        };
      default:
        return {
          key: 'outcome',
          label: t('carriera.tesi.thesis_progress.outcome'),
          description: t('carriera.tesi.thesis_progress.outcome_description'),
        };
    }
  };

  const getThesisSteps = () => {
    const isConclusionApproved = normalizedActiveStep === 'conclusion_approved';
    const isConclusionRejected = normalizedActiveStep === 'conclusion_rejected';
    return [
      {
        key: 'ongoing',
        label: t('carriera.tesi.thesis_progress.ongoing_title'),
        description: t('carriera.tesi.thesis_progress.ongoing'),
      },
      {
        key: 'conclusion_requested',
        label: t('carriera.tesi.thesis_progress.conclusion_request_title'),
        description: t('carriera.tesi.thesis_progress.conclusion_request'),
      },
      {
        key: 'conclusion_outcome',
        label: isConclusionApproved
          ? t('carriera.tesi.thesis_progress.conclusion_confirmed_title')
          : isConclusionRejected
            ? t('carriera.tesi.thesis_progress.conclusion_rejected_title')
            : t('carriera.tesi.thesis_progress.conclusion_outcome_title'),
        description: isConclusionApproved
          ? t('carriera.tesi.thesis_progress.conclusion_confirmed')
          : isConclusionRejected
            ? t('carriera.tesi.thesis_progress.conclusion_rejected')
            : t('carriera.tesi.thesis_progress.conclusion_outcome'),
      },
      {
        key: 'almalaurea',
        label: t('carriera.tesi.thesis_progress.almalaurea_title'),
        description: t('carriera.tesi.thesis_progress.almalaurea'),
      },
      {
        key: 'final_exam',
        label: t('carriera.tesi.thesis_progress.final_exam_title'),
        description: t('carriera.tesi.thesis_progress.final_exam'),
      },
      {
        key: 'final_thesis',
        label: t('carriera.tesi.thesis_progress.final_thesis_title'),
        description: t('carriera.tesi.thesis_progress.final_thesis'),
      },
    ];
  };

  const secondStep = getSecondStep();
  const thesisSteps = getThesisSteps();
  const steps = [firstStep, secondStep, ...thesisSteps];

  useEffect(() => {
    const container = timelineScrollRef.current;
    if (!container) return;
    const activeElement = container.querySelector('.progress-step.is-active-step');
    if (!activeElement) {
      container.scrollTop = 0;
      return;
    }
    const targetScrollTop = activeElement.offsetTop - container.clientHeight / 2 + activeElement.clientHeight / 2;
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    container.scrollTop = Math.min(Math.max(targetScrollTop, 0), Math.max(maxScrollTop, 0));
  }, [normalizedActiveStep, hasNoData, steps.length]);

  const renderStep = (step, activeStep) => {
    const { key, label, description } = step;

    const stepKeys = steps.map(s => s.key);
    const fallbackActiveStep = hasNoData ? 'pending' : activeStep;
    const isPendingOnly = fallbackActiveStep === 'pending' && !hasNoData;
    let effectiveActiveStep = isPendingOnly ? 'outcome' : fallbackActiveStep;
    const isConclusionRequested = activeStep === 'conclusion_requested';
    const isConclusionApproved = activeStep === 'conclusion_approved';
    const isConclusionRejected = activeStep === 'conclusion_rejected';
    const isDone = activeStep === 'done';

    if (isConclusionRequested) {
      effectiveActiveStep = 'conclusion_requested';
    } else if (isConclusionApproved) {
      effectiveActiveStep = 'almalaurea';
    } else if (isConclusionRejected) {
      effectiveActiveStep = 'conclusion_outcome';
    }
    const activeIndex = isDone ? stepKeys.length : stepKeys.indexOf(effectiveActiveStep);
    const thisIndex = stepKeys.indexOf(key);

    const isOutcomeWaitingActive = isConclusionRequested && key === 'conclusion_outcome';
    const isActive = effectiveActiveStep === key || isOutcomeWaitingActive;
    const isCompleted = thisIndex < activeIndex;
    const isFuture = thisIndex > activeIndex && !isOutcomeWaitingActive;
    const isConclusionRequestedStep = isConclusionRequested && key === 'conclusion_requested';

    let circleClass;
    let titleClass;
    let historyEntry = null;

    switch (key) {
      case 'pending':
      case 'rejected':
      case 'cancelled':
      case 'approved':
        historyEntry = statusHistory ? getHistoryForStatus(key) : null;
        break;
      case 'conclusion_outcome':
        historyEntry =
          statusHistory && (isConclusionApproved || isConclusionRejected)
            ? getHistoryForStatus(isConclusionApproved ? 'conclusion_approved' : 'conclusion_rejected')
            : null;
        break;
      default:
        historyEntry = null;
    }

    if (isActive) {
      if (['approved', 'rejected', 'cancelled'].includes(key)) {
        circleClass = key;
      } else if (hasNoData && key === 'pending') {
        circleClass = 'waiting';
      } else if (key === 'outcome') {
        circleClass = 'waiting';
      } else {
        circleClass = 'pending';
      }
      titleClass = 'active';
    } else if (isCompleted) {
      circleClass = 'approved';
      titleClass = 'completed';
    } else {
      circleClass = 'inactive';
      titleClass = '';
    }

    if (isConclusionRequested && key === 'conclusion_requested') {
      circleClass = 'pending';
      titleClass = 'active';
    }

    if (isConclusionRequested && key === 'conclusion_outcome') {
      circleClass = 'waiting';
      titleClass = 'active';
    }

    if (isConclusionApproved) {
      // outcome is confirmed and completed; next step (almalaurea) is the new pending active step
      if (key === 'conclusion_outcome') {
        circleClass = 'approved';
        titleClass = 'completed';
      }
    }

    if (isConclusionRejected) {
      if (key === 'conclusion_requested') {
        circleClass = 'approved';
        titleClass = 'completed';
      }
      if (key === 'conclusion_outcome') {
        circleClass = 'rejected';
        titleClass = 'active';
      }
    }

    return (
      <div
        key={key}
        className={[
          'progress-step',
          isActive ? 'is-active-step' : '',
          isDisabled && !(hasNoData && key === 'pending') && !isConclusionRequestedStep ? 'disabled' : '',
          isFuture && !isConclusionRequestedStep ? 'faded' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="progress-step-marker">
          <div className={`progress-step-circle ${circleClass}`}>
            {isActive && key === 'approved' && <i className="fa-solid fa-check align-vertical-center" />}
            {isActive && key === 'rejected' && <i className="fa-solid fa-xmark" />}
            {isActive && key === 'cancelled' && <i className="fa-solid fa-ban" />}
            {isCompleted && <i className="fa-solid fa-check align-vertical-center" />}
          </div>
        </div>
        <div className="progress-step-content">
          <h6 className={`progress-step-title ${titleClass}`}>{label}</h6>
          <p className="progress-step-description">{description}</p>
          {historyEntry && (
            <>
              <div className="progress-step-date">
                <i className="fa-solid fa-clock me-1" />
                {moment(historyEntry.changeDate).format('DD/MM/YYYY - HH:mm')}
              </div>
            </>
          )}
          {key === 'conclusion_requested' && conclusionRequestDate && (
            <div className="progress-step-date">
              <i className="fa-solid fa-clock me-1" />
              {moment(conclusionRequestDate).format('DD/MM/YYYY - HH:mm')}
            </div>
          )}
          {key === 'conclusion_outcome' && conclusionConfirmedDate && (
            <div className="progress-step-date">
              <i className="fa-solid fa-clock me-1" />
              {moment(conclusionConfirmedDate).format('DD/MM/YYYY - HH:mm')}
            </div>
          )}
        </div>
      </div>
    );
  };

  const getDeadlineSeverity = daysLeft => {
    if (daysLeft < 0) {
      return {
        className: 'deadline-status-overdue',
        label: t('carriera.tesi.deadline_status.overdue'),
        icon: 'fa-solid fa-triangle-exclamation',
      };
    }
    if (daysLeft === 0) {
      return {
        className: 'deadline-status-today',
        label: t('carriera.tesi.deadline_status.today'),
        icon: 'fa-solid fa-clock',
      };
    }
    if (daysLeft <= 7) {
      return {
        className: 'deadline-status-soon',
        label: t('carriera.tesi.deadline_status.soon'),
        icon: 'fa-solid fa-bell',
      };
    }
    return {
      className: 'deadline-status-upcoming',
      label: t('carriera.tesi.deadline_status.upcoming'),
      icon: 'fa-solid fa-calendar-days',
    };
  };

  return (
    <>
      <Card className={`mb-3 roundCard py-2${isDisabled ? ' timeline-disabled' : ''}`}>
        <Card.Header className="border-0">
          <div className="d-flex align-items-center">
            <h3 className="thesis-topic">
              <i className="fa-regular fa-books fa-sm pe-2" />
              {t('carriera.tesi.timeline')}
            </h3>
            <InfoTooltip tooltipText={t('carriera.tesi.timeline_tooltip')} placement="top" id="timeline-tooltip" />
            <Button
              className={`btn btn-${appliedTheme} btn-header ms-auto`}
              onClick={() => {
                setShow(true);
              }}
            >
              <i className="fa-regular fa-calendar-clock fa-lg me-1" /> {t('carriera.tesi.show_deadlines')}
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="timeline-scroll" ref={timelineScrollRef}>
            <div className="progress-tracker-container">
              {steps.map(step => renderStep(step, normalizedActiveStep))}
            </div>
          </div>
        </Card.Body>
      </Card>
      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fa-regular fa-calendar-clock fa-lg me-1" />
            {graduationSession
              ? i18n.language === 'en'
                ? graduationSession.session_name_en
                : graduationSession.session_name
              : t('carriera.tesi.no_deadlines_available')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="deadline-modal-body">
          {sortedDeadlines.length > 0 ? (
            <div className="deadline-list">
              {nextDeadline && (
                <div className="next-deadline-card">
                  <div className="next-deadline-header">{t('carriera.tesi.next_deadline')}</div>
                  <div className="next-deadline-title">
                    {t(`carriera.tesi.deadlines.${nextDeadline.deadline_type}`)}
                  </div>
                  <div className="next-deadline-meta">
                    <span>{moment.utc(nextDeadline.deadline_date).format('DD/MM/YYYY')}</span>
                    <span className="next-deadline-separator">•</span>
                    <span>
                      {nextDeadline.daysLeft === 0
                        ? t('carriera.tesi.deadline_countdown.today')
                        : t('carriera.tesi.deadline_countdown.days_left', { count: nextDeadline.daysLeft })}
                    </span>
                  </div>
                </div>
              )}

              {sortedDeadlines.map(deadline => {
                const severity = getDeadlineSeverity(deadline.daysLeft);
                return (
                  <div key={deadline.deadline_type} className="deadline-row">
                    <div className="deadline-row-main">
                      <div className="deadline-row-title">{t(`carriera.tesi.deadlines.${deadline.deadline_type}`)}</div>
                      <div className="deadline-row-date">{moment.utc(deadline.deadline_date).format('DD/MM/YYYY')}</div>
                    </div>
                    <div className={`deadline-status ${severity.className}`}>
                      <i className={`${severity.icon} me-1`} />
                      {severity.label}
                      {deadline.daysLeft > 0 && (
                        <span className="deadline-status-days">
                          {t('carriera.tesi.deadline_countdown.days_short', { count: deadline.daysLeft })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>{t('carriera.tesi.no_deadlines_available')}</p>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}

Timeline.propTypes = {
  activeStep: PropTypes.oneOf([
    'pending',
    'approved',
    'rejected',
    'cancelled',
    'none',
    'ongoing',
    'conclusion_requested',
    'conclusion_approved',
    'conclusion_rejected',
    'almalaurea',
    'final_exam',
    'final_thesis',
    'done',
  ]),
  statusHistory: PropTypes.arrayOf(
    PropTypes.shape({
      oldStatus: PropTypes.string,
      newStatus: PropTypes.string.isRequired,
      note: PropTypes.string,
      changeDate: PropTypes.string.isRequired,
    }),
  ),
  conclusionConfirmedDate: PropTypes.string,
  conclusionRequestDate: PropTypes.string,
  startDate: PropTypes.string,
  session: PropTypes.shape({
    graduationSession: PropTypes.shape({
      id: PropTypes.number,
      session_name: PropTypes.string,
      session_name_en: PropTypes.string,
    }).isRequired,
    deadlines: PropTypes.arrayOf(
      PropTypes.shape({
        deadline_type: PropTypes.string.isRequired,
        graduation_session_id: PropTypes.number.isRequired,
        deadline_date: PropTypes.string.isRequired,
      }),
    ),
  }).isRequired,
};
