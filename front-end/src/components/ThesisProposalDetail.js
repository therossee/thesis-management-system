import React, { useContext, useEffect, useState } from 'react';

import { Button, Card, Col, Modal, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import Linkify from 'react-linkify';

import moment from 'moment';
import 'moment/locale/it';
import PropTypes from 'prop-types';

import API from '../API';
import { LoggedStudentContext, ThemeContext, ToastContext } from '../App';
import '../styles/custom-modal.css';
import '../styles/custom-toast.css';
import '../styles/text.css';
import '../styles/utilities.css';
import { getSystemTheme } from '../utils/utils';
import CustomBadge from './CustomBadge';
import CustomBlock from './CustomBlock';
import LoadingModal from './LoadingModal';

moment.locale('it');

function ThesisProposalDetail(props) {
  const {
    id,
    topic,
    description,
    link,
    requiredSkills,
    additionalNotes,
    supervisor,
    internalCoSupervisors,
    externalCoSupervisors,
    creationDate,
    expirationDate,
    isInternal,
    isAbroad,
    attachmentUrl,
    keywords,
    types,
    company,
  } = props.thesisProposal;

  const supervisors = [supervisor, ...internalCoSupervisors];
  const [sending, setSending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const { loggedStudent } = useContext(LoggedStudentContext);
  const { showToast } = useContext(ToastContext);
  const { t } = useTranslation();

  useEffect(() => {
    API.checkStudentEligibility()
      .then(data => {
        setIsEligible(data.eligible);
      })
      .catch(error => {
        console.error('Error checking student eligibility:', error);
      });
    API.getProposalAvailability(id)
      .then(response => {
        setIsAvailable(response.available);
      })
      .catch(error => console.error('Error fetching thesis proposal availability:', error))
      .finally(() => {
        setIsLoading(false);
      });
  }, [loggedStudent]);

  const sendApplication = () => {
    if (sending) return;
    const applicationData = {
      thesisProposal: {
        id: id,
        topic: topic,
      },
      topic: topic + '\n' + description,
      company: company ? company : null,
      supervisor: props.thesisProposal.supervisor,
      coSupervisors: internalCoSupervisors,
    };
    console.log(applicationData);
    setSending(true);
    API.createThesisApplication(applicationData)
      .then(() => {
        setIsEligible(false);
        showToast({
          success: true,
          title: t('carriera.richiesta_tesi.success'),
          message: t('carriera.richiesta_tesi.success_content'),
        });
      })
      .catch(error => {
        console.error('Error sending thesis application:', error);
        setIsEligible(true);
        showToast({
          success: false,
          title: t('carriera.richiesta_tesi.error'),
          message: t('carriera.richiesta_tesi.error_content'),
        });
      })
      .finally(() => {
        setSending(false);
        setIsEligible(false);
        setShowModal(false);
      });
  };

  if (sending) {
    return <div>{'Invio candidatura in corso...'}</div>;
  } else if (isLoading) {
    return <LoadingModal show={isLoading} onHide={() => setIsLoading(false)} />;
  } else {
    return (
      <>
        <div className="proposals-container">
          <Card className="mb-3 roundCard py-2 py-2">
            {topic && (
              <Card.Header className="border-0">
                <Row className="d-flex justify-content-between align-items-start">
                  <Col xs="auto" className="flex-grow-1">
                    <h3 className="thesis-topic">{topic}</h3>
                  </Col>
                  <Col xs="auto" className="text-end">
                    <CustomBadge variant="status" content={expirationDate} />
                  </Col>
                </Row>
              </Card.Header>
            )}
            <Card.Body className="pt-2 pb-0">
              <div className="custom-badge-container mb-3">
                <CustomBadge variant={isInternal ? 'internal' : 'external'} />
                <CustomBadge variant={isAbroad ? 'abroad' : 'italy'} />
                {types.map(item => (
                  <CustomBadge key={item.id} variant="type" content={item.type} />
                ))}
              </div>
              <CustomBlock icon="user" title="carriera.proposte_di_tesi.supervisors" ignoreMoreLines>
                <CustomBadge variant="teacher" content={supervisors.map(s => s.lastName + ' ' + s.firstName)} />
              </CustomBlock>
              {company && (
                <CustomBlock icon="building" title="carriera.proposta_di_tesi.azienda" ignoreMoreLines>
                  <CustomBadge variant="external-company" content={company.corporateName} />
                </CustomBlock>
              )}
              {keywords.length > 0 ? (
                <CustomBlock icon="key" title="carriera.proposte_di_tesi.keywords" ignoreMoreLines>
                  <CustomBadge variant="keyword" content={keywords.map(item => item.keyword)} />
                </CustomBlock>
              ) : null}
              {externalCoSupervisors && (
                <CustomBlock icon="user-plus" title="carriera.proposta_di_tesi.relatori_esterni">
                  <Linkify>{externalCoSupervisors}</Linkify>
                </CustomBlock>
              )}
              {description && (
                <CustomBlock icon="memo" title="carriera.proposta_di_tesi.descrizione">
                  <Linkify>{description}</Linkify>
                </CustomBlock>
              )}
              {requiredSkills && (
                <CustomBlock icon="head-side-brain" title="carriera.proposta_di_tesi.conoscenze_richieste">
                  <Linkify>{requiredSkills}</Linkify>
                </CustomBlock>
              )}
              {additionalNotes && (
                <CustomBlock icon="notes" title="carriera.proposta_di_tesi.note">
                  <Linkify>{additionalNotes}</Linkify>
                </CustomBlock>
              )}
              {link && (
                <CustomBlock icon="link" title="Link">
                  <Linkify>{link}</Linkify>
                </CustomBlock>
              )}
              {attachmentUrl && (
                <CustomBlock icon="paperclip" title="carriera.proposta_di_tesi.allegato">
                  <a
                    href={`https://didattica.polito.it/pls/portal30/sviluppo.tesi_proposte.download_alleg?idts=${id}&lang=IT`}
                    className="info-detail d-flex align-items-center"
                  >
                    {attachmentUrl}
                  </a>
                </CustomBlock>
              )}
              {creationDate && (
                <CustomBlock icon="calendar" title="carriera.proposte_di_tesi.creation_date">
                  {moment(creationDate).format('DD/MM/YYYY')}
                </CustomBlock>
              )}
              <div className="d-flex align-items-start justify-content-between">
                {expirationDate && (
                  <div className="flex-grow-1 me-3">
                    <CustomBlock icon="calendar-clock" title="carriera.proposte_di_tesi.expiration_date">
                      {moment(expirationDate).format('DD/MM/YYYY')}
                    </CustomBlock>
                  </div>
                )}
                <div className="d-flex gap-2">
                  <ApplicationButton setShowModal={setShowModal} isEligible={isEligible && isAvailable} />
                </div>
              </div>
            </Card.Body>
          </Card>
          <ProposalModal show={showModal} handleClose={() => setShowModal(false)} sendApplication={sendApplication} />
        </div>
      </>
    );
  }
}

function ApplicationButton(props) {
  const { t } = useTranslation();
  const isEligible = props.isEligible;
  const setShowModal = props.setShowModal;
  const { theme } = useContext(ThemeContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;
  return (
    <Button
      className={`btn-primary-${appliedTheme} mb-3`}
      size="md"
      onClick={() => setShowModal(true)}
      disabled={!isEligible}
    >
      <i className="fa-solid fa-paper-plane"></i>
      {t('carriera.proposta_di_tesi.candidatura')}
    </Button>
  );
}

function ProposalModal({ show, handleClose, sendApplication }) {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;

  return (
    <Modal show={show} onHide={handleClose} contentClassName="modal-content" backdropClassName="modal-overlay" centered>
      <Modal.Header closeButton={true} className="modal-header">
        <Modal.Title className="modal-title">
          <i className="fa-regular fa-circle-exclamation" />
          {` `}
          {t('carriera.proposta_di_tesi.candidatura')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="modal-body">{t('carriera.proposta_di_tesi.modal_contenuto')}</Modal.Body>
      <Modal.Footer className="modal-footer">
        <Button className="modal-cancel mb-3" size="md" onClick={handleClose}>
          {t('carriera.proposta_di_tesi.chiudi')}
        </Button>
        <Button className={`btn-primary-${appliedTheme} mb-3`} size="md" onClick={() => sendApplication()}>
          <i className="fa-solid fa-paper-plane"></i>
          {t('carriera.proposta_di_tesi.prosegui')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

ThesisProposalDetail.propTypes = {
  thesisProposal: PropTypes.shape({
    id: PropTypes.number.isRequired,
    topic: PropTypes.string,
    description: PropTypes.string,
    link: PropTypes.string,
    requiredSkills: PropTypes.string,
    additionalNotes: PropTypes.string,
    supervisor: PropTypes.object,
    internalCoSupervisors: PropTypes.array,
    externalCoSupervisors: PropTypes.string,
    creationDate: PropTypes.string,
    expirationDate: PropTypes.string,
    isInternal: PropTypes.bool,
    isAbroad: PropTypes.bool,
    attachmentUrl: PropTypes.string,
    keywords: PropTypes.array,
    types: PropTypes.array,
    company: PropTypes.shape({
      id: PropTypes.number.isRequired,
      corporateName: PropTypes.string.isRequired,
    }),
  }).isRequired,
};

ApplicationButton.propTypes = {
  isEligible: PropTypes.bool.isRequired,
  setShowModal: PropTypes.func.isRequired,
};

ProposalModal.propTypes = {
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  sendApplication: PropTypes.func.isRequired,
};

export default ThesisProposalDetail;
