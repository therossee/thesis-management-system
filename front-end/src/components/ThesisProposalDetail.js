import React, { useEffect, useRef, useContext, useState } from 'react';

import { Card, Col, Row, Button, Modal, Toast } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import Linkify from 'react-linkify';
import { ThemeContext } from '../App';
import { getSystemTheme } from '../utils/utils';
import API from '../API';
import CustomBlock from './CustomBlock';


import moment from 'moment';
import 'moment/locale/it';
import PropTypes from 'prop-types';

import '../styles/text.css';
import '../styles/utilities.css';
import '../styles/custom-modal.css';
import '../styles/custom-toast.css';
import CustomBadge from './CustomBadge';


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
  } = props.thesisProposal;

  const isEligible = props.isEligible;
  const setIsEligible = props.setIsEligible;

  const supervisors = [supervisor, ...internalCoSupervisors];
  const [sending, setSending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [success, setSuccess] = useState(true);
  const { t } = useTranslation();

  const sendApplication = () => {
    if (sending) return;
    const applicationData =       {thesisProposal: {
        id: id,
        topic: topic,
      },
      topic: topic + "\n" + description,
      company: props.thesisProposal.company || null,
      supervisor: props.thesisProposal.supervisor,
      coSupervisors: internalCoSupervisors
    };
    console.log(applicationData);
    setSending(true);
    API.createThesisApplication(applicationData)
      .then(() => {
        setIsEligible(false);
        setSuccess(true);
        setShowToast(true);
      })
      .catch((error) => {
        setIsEligible(true);
        setSuccess(false);
        setShowToast(true);
      })
      .finally(() => {
        setSending(false);
        setIsEligible(false);
        setShowModal(false);
      });
  };

  if (sending) {
    return <div>{'Invio candidatura in corso...'}</div>;
  }

  else {
    return (
      <>
      <div className="custom-toast-wrapper">
        <Toast
          onClose={() => setShowToast(false)}
          show={showToast}
          delay={5000}
          autohide
          className={`custom-toast ${success ? 'custom-toast--success' : 'custom-toast--error'}`}
        >
          <div className="d-flex align-items-start gap-2 w-100">
            <span className="custom-toast__icon">
              <i
                className={success ? 'fa-regular fa-circle-check' : 'fa-regular fa-circle-xmark'}
                aria-hidden="true"
              />
            </span>
            <div className="custom-toast__content">
              <strong className="custom-toast__title">
                {success
                  ? t('carriera.proposta_di_tesi.successo')
                  : t('carriera.proposta_di_tesi.errore')}
              </strong>
              <p className="custom-toast__message mb-0">
                {success
                  ? t('carriera.proposta_di_tesi.successo_content')
                  : t('carriera.proposta_di_tesi.errore_content')}
              </p>
            </div>
            <button
              type="button"
              className="custom-toast__close"
              onClick={() => setShowToast(false)}
              aria-label="Close"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </Toast>
      </div>
      <div className="proposals-container">
        <Card className="mb-3 roundCard py-2">
          {topic && (
            <Card.Header className="border-0">
              <Row className="d-flex justify-content-between">
                <Col xs={10} sm={10} md={11} lg={11} xl={11}>
                  <h3 className="thesis-topic">{topic}</h3>
                </Col>
                <Col xs={2} sm={2} md={1} lg={1} xl={1} className="thesis-topic text-end">
                  <CustomBadge variant={isAbroad ? 'abroad' : 'italy'} />
                </Col>
              </Row>
            </Card.Header>
          )}
          <Card.Body className="pt-2 pb-0">
            <div className="custom-badge-container mb-3">
              <CustomBadge variant="status" content={expirationDate} />
              <CustomBadge variant={isInternal ? 'internal' : 'external'} />
              {types.map(item => (
                <CustomBadge key={item.id} variant="type" content={item.type} />
              ))}
            </div>
            <CustomBlock icon="user" title="carriera.proposte_di_tesi.supervisors" ignoreMoreLines>
              <CustomBadge variant="teacher" content={supervisors.map(s => s.lastName + ' ' + s.firstName)} />
            </CustomBlock>
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
              <CustomBlock icon="calendar" title="carriera.proposte_di_tesi.creationDate">
                {moment(creationDate).format('DD/MM/YYYY')}
              </CustomBlock>
            )}
            <div className="d-flex align-items-start justify-content-between">
              {expirationDate && (
                <div className="flex-grow-1 me-3">
                  <CustomBlock icon="calendar-clock" title="carriera.proposte_di_tesi.expirationDate">
                    {moment(expirationDate).format('DD/MM/YYYY')}
                  </CustomBlock>
                </div>
              )}
              <ApplicationButton setShowModal={setShowModal} isEligible={isEligible} />
            </div>
          </Card.Body>
        </Card>
        <ProposalModal
          show={showModal}
          handleClose={() => setShowModal(false)}
          sendApplication={sendApplication}
        />
      </div>
      </>
    );
  }
}



function ApplicationButton(props) {
  const { theme } = useContext(ThemeContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;
  const { t } = useTranslation();
  const isEligible = props.isEligible;
  const setShowModal = props.setShowModal;
  return (
    <Button className={`btn-${appliedTheme} mb-3`} size="md" onClick={() => setShowModal(true)} disabled={!isEligible}>
      {t('carriera.proposta_di_tesi.candidatura')}
    </Button>);
}

function ProposalModal({ show, handleClose, sendApplication }) {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;


  return (
    <Modal
      show={show}
      onHide={handleClose}
      contentClassName="modal-content"
      backdropClassName="modal-overlay"
      centered
    >
      <Modal.Header closeButton={true} className="modal-header">
        <Modal.Title className="modal-title">
          <i className="fa-regular fa-circle-exclamation" />
          {` `}{t('carriera.proposta_di_tesi.candidatura')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="modal-body">
        {t('carriera.proposta_di_tesi.modal_contenuto')}
      </Modal.Body>
      <Modal.Footer className="modal-footer">
        <Button className="modal-cancel mb-3" size="md" onClick={handleClose}>
          {t('carriera.proposta_di_tesi.chiudi')}
        </Button>
        <Button className="modal-confirm mb-3" size="md" onClick={() => sendApplication()}>
          <i className="fa-regular fa-arrow-up-right-from-square"></i>
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
