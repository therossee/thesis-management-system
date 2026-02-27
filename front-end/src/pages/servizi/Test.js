import React, { useContext, useEffect, useState } from 'react';

import { Button, ButtonGroup, Card, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import API from '../../API';
import { BodyDataLoadingContext } from '../../App';
import CustomBadge from '../../components/CustomBadge';
import CustomBreadcrumb from '../../components/CustomBreadcrumb';

export default function Test() {
  const { setBodyDataLoading } = useContext(BodyDataLoadingContext);
  const [thesisApplications, setThesisApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [theses, setTheses] = useState([]);
  const [studentsById, setStudentsById] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [statusChanged, setStatusChanged] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [showThesisModal, setShowThesisModal] = useState(false);
  const [selectedThesis, setSelectedThesis] = useState(null);
  const [selectedThesisStatus, setSelectedThesisStatus] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    setBodyDataLoading(true);
    setIsLoading(true);

    Promise.all([API.getAllThesisApplications(), API.getAllTheses(), API.getStudents()])
      .then(([applications, thesesData, students]) => {
        setThesisApplications(applications || []);
        setTheses(thesesData || []);
        const studentMap = (students || []).reduce((acc, s) => {
          acc[s.id] = s;
          return acc;
        }, {});
        setStudentsById(studentMap);
      })
      .catch(error => {
        console.error('Error fetching thesis:', error);
        setThesisApplications([]);
        setTheses([]);
      })
      .finally(() => {
        setIsLoading(false);
        setStatusChanged(false);
        setBodyDataLoading(false);
      });
  }, [setBodyDataLoading, statusChanged]);

  const openStatusChangeModal = (application, newStatus) => {
    setSelectedApplication(application);
    setSelectedStatus(newStatus);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedApplication(null);
    setSelectedStatus(null);
  };

  const openThesisStatusChangeModal = (thesis, newStatus) => {
    setSelectedThesis(thesis);
    setSelectedThesisStatus(newStatus);
    setShowThesisModal(true);
  };

  const handleCloseThesisModal = () => {
    setShowThesisModal(false);
    setSelectedThesis(null);
    setSelectedThesisStatus(null);
  };

  const handleConfirmStatusChange = async () => {
    try {
      await API.updateThesisApplicationStatus({
        id: selectedApplication.id,
        old_status: selectedApplication.status,
        new_status: selectedStatus,
      });

      setStatusChanged(true);
      handleCloseModal();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleConfirmThesisStatusChange = async () => {
    try {
      await API.updateThesisConclusionStatus({
        thesisId: selectedThesis.id,
        conclusionStatus: selectedThesisStatus,
      });

      setStatusChanged(true);
      handleCloseThesisModal();
    } catch (error) {
      console.error('Error updating thesis status:', error);
    }
  };

  const getStatusBadgeVariant = status => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'cancelled':
        return 'secondary';
      default:
        return 'info';
    }
  };

  const getStatusLabel = status => {
    switch (status) {
      case 'pending':
        return 'In valutazione';
      case 'approved':
        return 'Approvata';
      case 'rejected':
        return 'Rifiutata';
      case 'cancelled':
        return 'Cancellata';
      default:
        return status;
    }
  };

  const getThesisStatusLabel = status => {
    switch (status) {
      case 'ongoing':
        return 'Tesi in corso';
      case 'conclusion_requested':
        return 'Richiesta conclusione';
      case 'conclusion_approved':
        return 'Conclusione approvata';
      case 'cancel_requested':
        return 'Richiesta annullamento';
      case 'cancel_approved':
        return 'Annullamento approvato';
      case 'almalaurea':
        return 'AlmaLaurea';
      case 'compiled_questionnaire':
        return 'Questionario di fine corso';
      case 'final_exam':
        return 'Iscrizione esame finale';
      case 'final_thesis':
        return 'Tesi definitiva';
      case 'done':
        return 'Completata';
      default:
        return status;
    }
  };

  const getThesisActions = status => {
    switch (status) {
      case 'conclusion_requested':
        return [
          { label: 'Approve', status: 'conclusion_approved', variant: 'outline-success', icon: 'check' },
          { label: 'Reject', status: 'ongoing', variant: 'outline-danger', icon: 'xmark' },
        ];
      case 'conclusion_approved':
        return [{ label: 'AlmaLaurea', status: 'almalaurea', variant: 'outline-primary', icon: 'file-lines' }];
      case 'almalaurea':
        return [
          {
            label: 'Questionario fine corso',
            status: 'compiled_questionnaire',
            variant: 'outline-primary',
            icon: 'clipboard-list',
          },
        ];
      case 'compiled_questionnaire':
        return [{ label: 'Final exam', status: 'final_exam', variant: 'outline-primary', icon: 'calendar-check' }];
      case 'final_exam':
        return [{ label: 'Final thesis', status: 'final_thesis', variant: 'outline-primary', icon: 'book' }];
      case 'final_thesis':
        return [
          { label: 'Approve final thesis', status: 'done', variant: 'outline-success', icon: 'check' },
          { label: 'Reject final thesis', status: 'ongoing', variant: 'outline-danger', icon: 'xmark' },
        ];
      case 'cancel_requested':
        return [
          { label: 'Approve cancelation', status: 'cancel_approved', variant: 'outline-success', icon: 'check' },
          { label: 'Reject cancelation', status: 'ongoing', variant: 'outline-danger', icon: 'xmark' },
        ];
      default:
        return [];
    }
  };

  return (
    <>
      <CustomBreadcrumb
        items={[
          { label: t('servizi.title'), path: '/servizi' },
          { label: 'Test', path: '/servizi/test' },
        ]}
      />
      <div className="applications-container">
        {isLoading ? (
          <></>
        ) : (
          <>
            {thesisApplications.map(application => (
              <Card key={`app-${application.id}`} className="mb-3 roundCard py-2">
                <Card.Header className="border-0 d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-1 thesis-topic">
                      <i className="fa-solid fa-graduation-cap me-2" />
                      Application ID: {application.id}
                    </h5>
                  </div>
                  <CustomBadge variant="app_status" content={application.status} />
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <strong>
                      <i className="fa-solid fa-user me-2" />
                      Studente:
                    </strong>{' '}
                    {application.student?.firstName} {application.student?.lastName}
                    <br />
                    <strong>
                      <i className="fa-solid fa-chalkboard-user me-2" />
                      Relatore:
                    </strong>{' '}
                    {application.supervisor?.firstName} {application.supervisor?.lastName}
                    <br />
                    <strong>
                      <i className="fa-solid fa-calendar me-2" />
                      Data presentazione:
                    </strong>{' '}
                    {new Date(application.submissionDate).toLocaleDateString('it-IT')}
                  </div>

                  {application.description && (
                    <div className="mb-3">
                      <strong>Descrizione:</strong>
                      <p className="mb-0 mt-1">{application.description}</p>
                    </div>
                  )}

                  <hr />

                  {application.status === 'pending' && (
                    <div className="d-flex gap-3 justify-content-end align-items-center">
                      <strong>Cambia stato:</strong>
                      <ButtonGroup size="sm">
                        <Button
                          variant="outline-success"
                          disabled={application.status === 'approved'}
                          onClick={() => openStatusChangeModal(application, 'approved')}
                        >
                          <i className="fa-solid fa-check me-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline-danger"
                          disabled={application.status === 'rejected'}
                          onClick={() => openStatusChangeModal(application, 'rejected')}
                        >
                          <i className="fa-solid fa-xmark me-1" />
                          Reject
                        </Button>
                        <Button
                          variant="outline-secondary"
                          disabled={application.status === 'cancelled'}
                          onClick={() => openStatusChangeModal(application, 'cancelled')}
                        >
                          <i className="fa-solid fa-ban me-1" />
                          Cancel
                        </Button>
                      </ButtonGroup>
                    </div>
                  )}
                </Card.Body>
              </Card>
            ))}

            {theses.map(thesis => {
              const status = thesis.status;
              const student = studentsById[thesis.student_id] || studentsById[thesis.studentId];
              const actions = getThesisActions(status);

              return (
                <Card key={`thesis-${thesis.id}`} className="mb-3 roundCard py-2">
                  <Card.Header className="border-0 d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-1 thesis-topic">
                        <i className="fa-solid fa-book me-2" />
                        Thesis ID: {thesis.id}
                      </h5>
                    </div>
                    <CustomBadge variant="app_status" content={status} />
                  </Card.Header>
                  <Card.Body>
                    <div className="mb-3">
                      <strong>
                        <i className="fa-solid fa-user me-2" />
                        Studente:
                      </strong>{' '}
                      {student ? `${student.firstName} ${student.lastName}` : thesis.student_id}
                      <br />
                      <strong>
                        <i className="fa-solid fa-tag me-2" />
                        Stato:
                      </strong>{' '}
                      {getThesisStatusLabel(status)}
                    </div>

                    {actions.length > 0 && (
                      <div className="d-flex gap-3 justify-content-end align-items-center">
                        <strong>Cambia stato:</strong>
                        <ButtonGroup size="sm">
                          {actions.map(action => (
                            <Button
                              key={action.status}
                              variant={action.variant}
                              onClick={() => openThesisStatusChangeModal(thesis, action.status)}
                            >
                              <i className={`fa-solid fa-${action.icon} me-1`} />
                              {action.label}
                            </Button>
                          ))}
                        </ButtonGroup>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              );
            })}
          </>
        )}
      </div>

      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fa-solid fa-pen-to-square me-2" />
            Cambia stato candidatura
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">
            Stai per cambiare lo stato della candidatura <strong>#{selectedApplication?.id}</strong> in:{' '}
            <strong>{getStatusLabel(selectedStatus)}</strong>
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            <i className="fa-solid fa-xmark me-1" />
            Annulla
          </Button>
          <Button variant={getStatusBadgeVariant(selectedStatus)} onClick={handleConfirmStatusChange}>
            <i className="fa-solid fa-check me-1" />
            Conferma
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showThesisModal} onHide={handleCloseThesisModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fa-solid fa-pen-to-square me-2" />
            Cambia stato tesi
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">
            Stai per cambiare lo stato della tesi <strong>#{selectedThesis?.id}</strong> in:{' '}
            <strong>{getThesisStatusLabel(selectedThesisStatus)}</strong>
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseThesisModal}>
            <i className="fa-solid fa-xmark me-1" />
            Annulla
          </Button>
          <Button variant={getStatusBadgeVariant('approved')} onClick={handleConfirmThesisStatusChange}>
            <i className="fa-solid fa-check me-1" />
            Conferma
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
