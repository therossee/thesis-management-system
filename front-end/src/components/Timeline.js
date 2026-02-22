import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';

import { Button, Card } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import moment from 'moment';
import PropTypes from 'prop-types';

import { ThemeContext } from '../App';
import '../styles/custom-progress-tracker.css';
import { getSystemTheme } from '../utils/utils';
import DeadlinesModal from './DeadlinesModal';
import InfoTooltip from './InfoTooltip';

/**
 * Timeline rules (single file):
 *
 * Application:
 * - pending
 * - application_outcome (waiting/approved/rejected/cancelled)
 *
 * Thesis:
 * - ongoing
 * - Optional cancel flow: cancel_request -> cancel_outcome (waiting/cancel_approved)
 * - Normal flow:
 *   - conclusion_requested
 *   - conclusion_outcome (waiting/approved OR rejected detected by history: conclusion_requested -> ongoing)
 *   - almalaurea
 *   - compiled_questionnaire
 *   - final_exam
 *   - final_thesis
 *   - final_upload_outcome (waiting/approved OR rejected detected by history: final_thesis -> ongoing)
 *
 * Extra rules:
 * - If a thesis exists (history contains at least one ongoing), application_outcome is forced to approved.
 * - Reject outcomes do NOT advance progress: they are "special active" steps while progress stays anchored to ongoing.
 * - If we go (again) from ongoing to conclusion_requested, we reset the phase:
 *   all steps AFTER conclusion_requested behave as new (not completed by old history).
 *   Implemented by cutting history from last reset index (transition to conclusion_requested OR reject resets).
 */

const APPLICATION_OUTCOME_STATUSES = new Set(['approved', 'rejected', 'cancelled']);
const CANCEL_FLOW_STATUSES = new Set(['cancel_request', 'cancel_approved']);

const VALID_STATUSES = new Set([
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'ongoing',
  'cancel_request',
  'cancel_approved',
  'conclusion_requested',
  'conclusion_approved',
  // no conclusion_rejected
  'almalaurea',
  'compiled_questionnaire',
  'final_exam',
  'final_thesis',
  'done',
]);

const UI_STEP_KEYS = new Set([
  'pending',
  'application_outcome',
  'ongoing',
  'cancel_request',
  'cancel_outcome',
  'conclusion_requested',
  'conclusion_outcome',
  'almalaurea',
  'compiled_questionnaire',
  'final_exam',
  'final_thesis',
  'final_upload_outcome',
]);

function sortHistory(statusHistory) {
  if (!Array.isArray(statusHistory) || statusHistory.length === 0) return [];
  return [...statusHistory].sort((a, b) => moment(a.changeDate).valueOf() - moment(b.changeDate).valueOf());
}

function inferStatusFromHistory(orderedHistory) {
  if (!orderedHistory.length) return null;
  return orderedHistory[orderedHistory.length - 1]?.newStatus ?? null;
}

function getLastHistory(history, matcher) {
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    if (matcher(entry)) return entry;
  }
  return null;
}

/**
 * "Reset" points that invalidate completion for steps after them.
 * - Any transition TO conclusion_requested (restart of end phase)
 * - conclusion_requested -> ongoing (conclusion rejected)
 * - final_thesis -> ongoing (final upload rejected)
 */
function findLastResetIndex(orderedHistory) {
  for (let i = orderedHistory.length - 1; i >= 0; i--) {
    const h = orderedHistory[i];
    if (!h) continue;

    const isRestartToConclusionRequested = h.newStatus === 'conclusion_requested';
    const isConclusionRejectedReset = h.oldStatus === 'conclusion_requested' && h.newStatus === 'ongoing';
    const isFinalUploadRejectedReset = h.oldStatus === 'final_thesis' && h.newStatus === 'ongoing';

    if (isRestartToConclusionRequested || isConclusionRejectedReset || isFinalUploadRejectedReset) return i;
  }
  return -1;
}

function computeVisibleHistory(orderedHistory) {
  if (orderedHistory.length === 0) return [];

  const resetIndex = findLastResetIndex(orderedHistory);
  if (resetIndex < 0) return orderedHistory;

  // Keep application outcomes even if before reset.
  // For the thesis phase, only consider entries from the latest reset onward.
  return orderedHistory.filter((h, idx) => APPLICATION_OUTCOME_STATUSES.has(h?.newStatus) || idx >= resetIndex);
}

function didConclusionGetRejected(visibleHistory) {
  return Boolean(
    getLastHistory(visibleHistory, h => h?.oldStatus === 'conclusion_requested' && h?.newStatus === 'ongoing'),
  );
}

function didFinalUploadGetRejected(visibleHistory) {
  return Boolean(getLastHistory(visibleHistory, h => h?.oldStatus === 'final_thesis' && h?.newStatus === 'ongoing'));
}

function getHistoryForStep(visibleHistory, stepKey) {
  switch (stepKey) {
    case 'pending':
      return getLastHistory(visibleHistory, h => h?.newStatus === 'pending');

    case 'application_outcome':
      return getLastHistory(visibleHistory, h => APPLICATION_OUTCOME_STATUSES.has(h?.newStatus));

    case 'ongoing':
      return getLastHistory(visibleHistory, h => h?.newStatus === 'ongoing');

    case 'cancel_request':
      return getLastHistory(visibleHistory, h => h?.newStatus === 'cancel_request');

    case 'cancel_outcome':
      return getLastHistory(visibleHistory, h => h?.newStatus === 'cancel_approved');

    case 'conclusion_requested':
      return getLastHistory(visibleHistory, h => h?.newStatus === 'conclusion_requested');

    case 'conclusion_outcome':
      return getLastHistory(
        visibleHistory,
        h =>
          h?.newStatus === 'conclusion_approved' ||
          (h?.oldStatus === 'conclusion_requested' && h?.newStatus === 'ongoing'),
      );

    case 'almalaurea':
    case 'compiled_questionnaire':
    case 'final_exam':
    case 'final_thesis':
      return getLastHistory(visibleHistory, h => h?.newStatus === stepKey);

    case 'final_upload_outcome':
      return getLastHistory(
        visibleHistory,
        h => h?.newStatus === 'done' || (h?.oldStatus === 'final_thesis' && h?.newStatus === 'ongoing'),
      );

    default:
      return null;
  }
}

function deriveFlow(currentStatus) {
  return CANCEL_FLOW_STATUSES.has(currentStatus) ? 'cancel' : 'normal';
}

function mapStatusToBaseEffectiveActiveStep(currentStatus) {
  if (APPLICATION_OUTCOME_STATUSES.has(currentStatus)) return 'application_outcome';

  if (currentStatus === 'cancel_request') return 'cancel_request';
  if (currentStatus === 'cancel_approved') return 'cancel_outcome';

  if (currentStatus === 'conclusion_requested') return 'conclusion_requested';
  if (currentStatus === 'conclusion_approved') return 'almalaurea';

  if (currentStatus === 'done') return 'final_upload_outcome';

  if (UI_STEP_KEYS.has(currentStatus)) return currentStatus;

  return 'pending';
}

function buildSteps(t, currentStatus, hasNoData, hasThesis, conclusionRejected, finalUploadRejected) {
  const flow = deriveFlow(currentStatus);

  const steps = [
    {
      key: 'pending',
      label: hasNoData
        ? t('carriera.tesi.thesis_progress.pending_to_submit')
        : t('carriera.tesi.thesis_progress.pending'),
      description: hasNoData
        ? t('carriera.tesi.thesis_progress.pending_to_submit_description')
        : t('carriera.tesi.thesis_progress.pending_description'),
    },
  ];

  // application outcome
  const isApproved = hasThesis || currentStatus === 'approved';
  const isRejected = !hasThesis && currentStatus === 'rejected';
  const isCancelled = !hasThesis && currentStatus === 'cancelled';

  steps.push({
    key: 'application_outcome',
    label: isApproved
      ? t('carriera.tesi.thesis_progress.approved')
      : isRejected
        ? t('carriera.tesi.thesis_progress.rejected')
        : isCancelled
          ? t('carriera.tesi.thesis_progress.cancelled')
          : t('carriera.tesi.thesis_progress.outcome'),
    description: isApproved
      ? t('carriera.tesi.thesis_progress.approved_description')
      : isRejected
        ? t('carriera.tesi.thesis_progress.rejected_description')
        : isCancelled
          ? t('carriera.tesi.thesis_progress.cancelled_description')
          : t('carriera.tesi.thesis_progress.outcome_description'),
  });

  // ongoing
  steps.push({
    key: 'ongoing',
    label: t('carriera.tesi.thesis_progress.ongoing_title'),
    description: t('carriera.tesi.thesis_progress.ongoing'),
  });

  // cancel flow (only these steps)
  if (flow === 'cancel') {
    const isCancelApproved = currentStatus === 'cancel_approved';

    steps.push(
      {
        key: 'cancel_request',
        label: t('carriera.tesi.thesis_progress.cancel_requested_title'),
        description: t('carriera.tesi.thesis_progress.cancel_requested'),
      },
      {
        key: 'cancel_outcome',
        label: isCancelApproved
          ? t('carriera.tesi.thesis_progress.cancel_approved_title')
          : t('carriera.tesi.thesis_progress.cancel_outcome_title'),
        description: isCancelApproved
          ? t('carriera.tesi.thesis_progress.cancel_approved')
          : t('carriera.tesi.thesis_progress.cancel_outcome'),
      },
    );

    return steps;
  }

  const isConclusionApproved = currentStatus === 'conclusion_approved';

  steps.push(
    {
      key: 'conclusion_requested',
      label: t('carriera.tesi.thesis_progress.conclusion_request_title'),
      description: t('carriera.tesi.thesis_progress.conclusion_request'),
    },
    {
      key: 'conclusion_outcome',
      label: isConclusionApproved
        ? t('carriera.tesi.thesis_progress.conclusion_confirmed_title')
        : conclusionRejected
          ? t('carriera.tesi.thesis_progress.conclusion_rejected_title')
          : t('carriera.tesi.thesis_progress.conclusion_outcome_title'),
      description: isConclusionApproved
        ? t('carriera.tesi.thesis_progress.conclusion_confirmed')
        : conclusionRejected
          ? t('carriera.tesi.thesis_progress.conclusion_rejected')
          : t('carriera.tesi.thesis_progress.conclusion_outcome'),
    },
    {
      key: 'almalaurea',
      label: t('carriera.tesi.thesis_progress.almalaurea_title'),
      description: t('carriera.tesi.thesis_progress.almalaurea'),
    },
    {
      key: 'compiled_questionnaire',
      label: t('carriera.tesi.thesis_progress.compiled_questionnaire_title'),
      description: t('carriera.tesi.thesis_progress.compiled_questionnaire'),
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
    {
      key: 'final_upload_outcome',
      label:
        currentStatus === 'done'
          ? t('carriera.tesi.thesis_progress.final_upload_approved_title')
          : finalUploadRejected
            ? t('carriera.tesi.thesis_progress.final_upload_rejected_title')
            : t('carriera.tesi.thesis_progress.final_upload_outcome_title'),
      description:
        currentStatus === 'done'
          ? t('carriera.tesi.thesis_progress.final_upload_approved')
          : finalUploadRejected
            ? t('carriera.tesi.thesis_progress.final_upload_rejected')
            : t('carriera.tesi.thesis_progress.final_upload_outcome'),
    },
  );

  return steps;
}

/**
 * Key fix:
 * - Completion/progress is based ONLY on baseActiveStep (real status).
 * - Rejected outcomes can be "special active" but must NOT advance completion.
 * - When in conclusion_requested, we don't show special outcome actives (reset phase).
 */
function decorateSteps({
  steps,
  currentStatus,
  visibleHistory,
  hasNoData,
  hasThesis,
  conclusionRejected,
  finalUploadRejected,
}) {
  const stepKeys = steps.map(s => s.key);

  const baseActiveStep = mapStatusToBaseEffectiveActiveStep(currentStatus);
  const baseActiveIndex = currentStatus === 'done' ? stepKeys.length : Math.max(stepKeys.indexOf(baseActiveStep), 0);

  const specialOutcomeActive =
    currentStatus === 'conclusion_requested'
      ? null
      : currentStatus === 'ongoing' && finalUploadRejected
        ? 'final_upload_outcome'
        : currentStatus === 'ongoing' && conclusionRejected
          ? 'conclusion_outcome'
          : null;

  return steps.map(step => {
    const key = step.key;
    const thisIndex = stepKeys.indexOf(key);

    const isFinalUploadOutcomeWaiting = currentStatus === 'final_thesis' && key === 'final_upload_outcome';

    const isActive = key === baseActiveStep || key === specialOutcomeActive || isFinalUploadOutcomeWaiting;

    // Completion uses ONLY the baseActiveIndex (never specialOutcomeActive)
    const isCompleted = thisIndex < baseActiveIndex;

    // Future is after base progress, but don't fade the special outcome active or waiting outcome
    const isFuture = thisIndex > baseActiveIndex && key !== specialOutcomeActive && !isFinalUploadOutcomeWaiting;

    const historyEntry = getHistoryForStep(visibleHistory, key);

    const shouldShowTimestamp =
      Boolean(historyEntry) &&
      (currentStatus !== 'ongoing' || isCompleted || key === specialOutcomeActive || isFinalUploadOutcomeWaiting);

    let circleClass = 'inactive';
    let titleClass = '';

    if (isCompleted) {
      circleClass = 'approved';
      titleClass = 'completed';
    } else if (isActive) {
      titleClass = 'active';

      if (hasNoData && key === 'pending') {
        circleClass = 'waiting';
      } else if (key === 'application_outcome') {
        if (hasThesis) circleClass = 'approved';
        else if (currentStatus === 'approved') circleClass = 'approved';
        else if (currentStatus === 'rejected') circleClass = 'rejected';
        else if (currentStatus === 'cancelled') circleClass = 'cancelled';
        else circleClass = 'waiting';
      } else if (key === 'conclusion_outcome') {
        if (conclusionRejected) circleClass = 'rejected';
        else if (currentStatus === 'conclusion_approved') circleClass = 'approved';
        else circleClass = 'waiting';
      } else if (key === 'cancel_outcome') {
        circleClass = currentStatus === 'cancel_approved' ? 'rejected' : 'waiting';
      } else if (key === 'final_upload_outcome') {
        if (finalUploadRejected) circleClass = 'rejected';
        else if (currentStatus === 'done') circleClass = 'approved';
        else circleClass = 'waiting';
      } else if (key === 'pending') {
        circleClass = 'pending';
      } else {
        circleClass = 'pending';
      }
    }

    const disabledClass = hasNoData && key !== 'pending' ? 'disabled' : '';
    const fadedClass = isFuture ? 'faded' : '';

    return {
      ...step,
      ui: {
        isActive,
        isCompleted,
        isFuture,
        circleClass,
        titleClass,
        disabledClass,
        fadedClass,
        shouldShowTimestamp,
        timestampText: shouldShowTimestamp ? moment(historyEntry.changeDate).format('DD/MM/YYYY - HH:mm') : null,
      },
    };
  });
}

function computeSortedDeadlines(deadlines) {
  if (!Array.isArray(deadlines) || deadlines.length === 0) return [];
  return [...deadlines]
    .map(deadline => {
      const date = moment.utc(deadline.deadline_date).startOf('day');
      const daysLeft = date.diff(moment.utc().startOf('day'), 'days');
      return { ...deadline, daysLeft };
    })
    .sort((a, b) => moment.utc(a.deadline_date).valueOf() - moment.utc(b.deadline_date).valueOf());
}

function computeNextDeadline(sortedDeadlines, currentStatus) {
  const upcoming = sortedDeadlines.filter(d => d.daysLeft >= 0);
  if (!upcoming.length) return null;

  const thesisStatuses = new Set([
    'ongoing',
    'cancel_request',
    'cancel_approved',
    'conclusion_requested',
    'conclusion_approved',
    'almalaurea',
    'compiled_questionnaire',
    'final_exam',
    'final_thesis',
    'done',
  ]);

  if (thesisStatuses.has(currentStatus)) {
    const relevant = upcoming.find(d => d.deadline_type === 'conclusion_request' || d.deadline_type === 'exams');
    if (relevant) return relevant;
  }

  return upcoming[0];
}

export default function Timeline({ activeStep, statusHistory, session }) {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;

  const { graduationSession, deadlines } = session || {};
  const [show, setShow] = useState(false);
  const timelineScrollRef = useRef(null);

  const orderedHistory = useMemo(() => sortHistory(statusHistory), [statusHistory]);
  const inferredStatus = useMemo(() => inferStatusFromHistory(orderedHistory), [orderedHistory]);

  const currentStatus = useMemo(() => {
    if (VALID_STATUSES.has(activeStep)) return activeStep;
    if (VALID_STATUSES.has(inferredStatus)) return inferredStatus;
    return null;
  }, [activeStep, inferredStatus]);

  const hasNoData = !currentStatus && orderedHistory.length === 0;
  const hasThesis = useMemo(() => orderedHistory.some(h => h?.newStatus === 'ongoing'), [orderedHistory]);

  // Cut history at last reset so steps after reset behave like new.
  const visibleHistory = useMemo(() => computeVisibleHistory(orderedHistory), [orderedHistory]);

  const conclusionRejected = useMemo(() => didConclusionGetRejected(visibleHistory), [visibleHistory]);
  const finalUploadRejected = useMemo(() => didFinalUploadGetRejected(visibleHistory), [visibleHistory]);

  const steps = useMemo(() => {
    const statusForModel = currentStatus ?? 'pending';
    const base = buildSteps(t, statusForModel, hasNoData, hasThesis, conclusionRejected, finalUploadRejected);
    return decorateSteps({
      steps: base,
      currentStatus: statusForModel,
      visibleHistory,
      hasNoData,
      hasThesis,
      conclusionRejected,
      finalUploadRejected,
    });
  }, [t, currentStatus, hasNoData, hasThesis, conclusionRejected, finalUploadRejected, visibleHistory]);

  const sortedDeadlines = useMemo(() => computeSortedDeadlines(deadlines), [deadlines]);
  const nextDeadline = useMemo(
    () => computeNextDeadline(sortedDeadlines, currentStatus ?? 'pending'),
    [sortedDeadlines, currentStatus],
  );

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
  }, [currentStatus, hasNoData, steps.length]);

  const renderStep = step => {
    const { key, label, description, ui } = step;

    return (
      <div
        key={key}
        className={['progress-step', ui.isActive ? 'is-active-step' : '', ui.disabledClass, ui.fadedClass]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="progress-step-marker">
          <div className={`progress-step-circle ${ui.circleClass}`}>
            {ui.isActive && ui.circleClass === 'approved' && <i className="fa-solid fa-check align-vertical-center" />}
            {ui.isActive && ui.circleClass === 'rejected' && <i className="fa-solid fa-xmark" />}
            {ui.isActive && ui.circleClass === 'cancelled' && <i className="fa-solid fa-ban" />}
            {ui.isCompleted && <i className="fa-solid fa-check align-vertical-center" />}
          </div>
        </div>

        <div className="progress-step-content">
          <h6 className={`progress-step-title ${ui.titleClass}`}>{label}</h6>
          <p className="progress-step-description">{description}</p>

          {ui.shouldShowTimestamp && (
            <div className="progress-step-date">
              <i className="fa-solid fa-clock me-1" />
              {ui.timestampText}
            </div>
          )}
        </div>
      </div>
    );
  };

  const isDisabled = hasNoData;

  return (
    <>
      <Card className={`mb-3 roundCard py-2 timeline-card${isDisabled ? ' timeline-disabled' : ''}`}>
        <Card.Header className="border-0">
          <div className="d-flex align-items-center timeline-header-row">
            <h3 className="thesis-topic">
              <i className="fa-regular fa-books fa-sm pe-2" />
              {t('carriera.tesi.timeline')}
            </h3>
            <InfoTooltip tooltipText={t('carriera.tesi.timeline_tooltip')} placement="top" id="timeline-tooltip" />
            <Button
              className={`btn btn-${appliedTheme} btn-header ms-auto timeline-deadlines-btn`}
              onClick={() => setShow(true)}
            >
              <i className="fa-regular fa-calendar-clock fa-lg me-1" /> {t('carriera.tesi.show_deadlines')}
            </Button>
          </div>
        </Card.Header>

        <Card.Body className="timeline-card-body">
          <div className="timeline-scroll" ref={timelineScrollRef}>
            <div className="progress-tracker-container">{steps.map(renderStep)}</div>
          </div>
        </Card.Body>
      </Card>

      <DeadlinesModal
        show={show}
        onHide={() => setShow(false)}
        graduationSession={graduationSession}
        sortedDeadlines={sortedDeadlines}
        nextDeadline={nextDeadline}
      />
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
    'cancel_request',
    'cancel_approved',
    'conclusion_requested',
    'conclusion_approved',
    'almalaurea',
    'compiled_questionnaire',
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
