import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Card, Collapse, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import '../styles/teacher-contact-card.css';

export default function TeacherContactCard({ supervisor, coSupervisors }) {
  const { t } = useTranslation();
  const [showCoSupervisors, setShowCoSupervisors] = useState(false);

  const getInitials = (firstName, lastName) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  return (
    <Card className="teacher-contact-card">
      <Card.Body>
        <h5 className="contact-title">
          <i className="fa-solid fa-address-card me-2" />
          {t('carriera.tesi.contacts.title')}
        </h5>
        <div className="supervisor-main">
          <div className="contact-item d-flex align-items-start gap-3">
            <div className="contact-avatar contact-avatar-primary">
              {getInitials(supervisor.firstName, supervisor.lastName)}
            </div>
            <div className="contact-info flex-grow-1">
              <strong className="contact-name">
                {supervisor.firstName} {supervisor.lastName}
              </strong>
              <div className="contact-role">
                {t('carriera.tesi.contacts.supervisor')}
              </div>
              <div className="contact-role">
                {supervisor.role + " - " + supervisor.facilityShortName}
              </div>
              {supervisor.email && (
                <a href={`mailto:${supervisor.email}`} className="contact-email">
                  <i className="fa-solid fa-envelope me-1" />
                  {supervisor.email}
                </a>
              )}
            </div>
          </div>
          
          {coSupervisors && coSupervisors.length > 0 && (
            <div className="cosupervisors-section mt-3">
              <Button 
                variant="contact-link"
                onClick={() => setShowCoSupervisors(!showCoSupervisors)}
                aria-expanded={showCoSupervisors}
                className="p-0 text-decoration-none d-flex align-items-center gap-2"
              >
                <i className={`fa-solid fa-chevron-${showCoSupervisors ? 'up' : 'down'}`} />
                <span>
                  {t('carriera.tesi.contacts.co_supervisors')}
                </span>
              </Button>
              
              <Collapse in={showCoSupervisors}>
                <div className="mt-3">
                  <div className="d-flex flex-column gap-3">
                    {coSupervisors.map((coSupervisor, index) => (
                      <div key={index} className="contact-item d-flex align-items-start gap-3">
                        <div className="contact-avatar contact-avatar-secondary">
                          {getInitials(coSupervisor.firstName, coSupervisor.lastName)}
                        </div>
                        <div className="contact-info flex-grow-1">
                          <strong className="contact-name">
                            {coSupervisor.firstName} {coSupervisor.lastName}
                          </strong>
                          {coSupervisor.role && coSupervisor.facilityShortName && (
                            <div className="contact-role">
                              {coSupervisor.role + " - " + coSupervisor.facilityShortName}
                            </div>
                          )}
                          {coSupervisor.email && (
                            <a href={`mailto:${coSupervisor.email}`} className="contact-email">
                              <i className="fa-solid fa-envelope me-1" />
                              {coSupervisor.email}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Collapse>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}

TeacherContactCard.propTypes = {
  supervisor: PropTypes.shape({
    firstName: PropTypes.string.isRequired,
    lastName: PropTypes.string.isRequired,
    email: PropTypes.string,
  }).isRequired,
  coSupervisors: PropTypes.arrayOf(PropTypes.shape({
    firstName: PropTypes.string.isRequired,
    lastName: PropTypes.string.isRequired,
    email: PropTypes.string,
  })),
};