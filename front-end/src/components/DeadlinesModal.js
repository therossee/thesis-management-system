import React from 'react';

import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import moment from 'moment';
import PropTypes from 'prop-types';

export default function DeadlinesModal({ show, onHide, graduationSession, sortedDeadlines, nextDeadline }) {
  const { t, i18n } = useTranslation();

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

  let modalTitle = t('carriera.tesi.no_deadlines_available');
  if (graduationSession) {
    if (i18n.language === 'en') {
      modalTitle = graduationSession.sessionNameEn;
    } else {
      modalTitle = graduationSession.sessionName;
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fa-regular fa-calendar-clock fa-lg me-1" />
          {modalTitle}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="deadline-modal-body">
        {sortedDeadlines.length > 0 ? (
          <div className="deadline-list">
            {nextDeadline && (
              <div className="next-deadline-card">
                <div className="next-deadline-header">{t('carriera.tesi.next_deadline')}</div>
                <div className="next-deadline-title">{t(`carriera.tesi.deadlines.${nextDeadline.deadlineType}`)}</div>
                <div className="next-deadline-meta">
                  <span>{moment.utc(nextDeadline.deadlineDate).format('DD/MM/YYYY')}</span>
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
                <div key={deadline.deadlineType} className="deadline-row">
                  <div className="deadline-row-main">
                    <div className="deadline-row-title">{t(`carriera.tesi.deadlines.${deadline.deadlineType}`)}</div>
                    <div className="deadline-row-date">{moment.utc(deadline.deadlineDate).format('DD/MM/YYYY')}</div>
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
  );
}

DeadlinesModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  graduationSession: PropTypes.shape({
    id: PropTypes.number,
    sessionName: PropTypes.string,
    sessionNameEn: PropTypes.string,
  }),
  sortedDeadlines: PropTypes.arrayOf(
    PropTypes.shape({
      deadlineType: PropTypes.string.isRequired,
      deadlineDate: PropTypes.string.isRequired,
      daysLeft: PropTypes.number.isRequired,
    }),
  ).isRequired,
  nextDeadline: PropTypes.shape({
    deadlineType: PropTypes.string.isRequired,
    deadlineDate: PropTypes.string.isRequired,
    daysLeft: PropTypes.number.isRequired,
  }),
};
