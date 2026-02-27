import React, { useContext, useEffect, useState } from 'react';

import { Button, Form, FormText, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import PropTypes from 'prop-types';

import API from '../API';
import { ThemeContext } from '../App';
import '../styles/utilities.css';
import { getSystemTheme } from '../utils/utils';
import CustomModal from './CustomModal';
import CustomSelect from './CustomSelect';
import LoadingModal from './LoadingModal';

export default function ThesisRequestModal(props) {
  const { show, setShow, onSubmitResult } = props;
  const [showConfirm, setShowConfirm] = useState(false);
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;
  const [isLoading, setIsLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [supervisor, setSupervisor] = useState(null);
  const [coSupervisors, setCoSupervisors] = useState([]);
  const [company, setCompany] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const maxCharCount = 1500;
  const charCount = topic.length;
  const [errors, setErrors] = useState({
    topic: false,
    supervisor: false,
  });

  const handleSubmit = () => {
    API.createThesisApplication({
      topic,
      supervisor: teachers.find(teacher => teacher.id === supervisor.value),
      coSupervisors: coSupervisors.map(coSup => teachers.find(teacher => teacher.id === coSup.value)).filter(Boolean),
      company: company ? companies.find(comp => comp.id === company.value) : null,
    })
      .then(() => {
        setShow(false);
        setShowConfirm(false);
        onSubmitResult(true);
      })
      .catch(error => {
        console.error('Error submitting thesis application:', error);
        setShow(false);
        setShowConfirm(false);
        onSubmitResult(false);
      });
  };

  const handleShowConfirm = () => {
    const newErrors = {
      topic: !topic || topic.trim() === '' || charCount > maxCharCount,
      supervisor: !supervisor,
    };

    setErrors(newErrors);

    if (!newErrors.topic && !newErrors.supervisor && charCount <= maxCharCount) {
      setShow(false);
      setShowConfirm(true);
    }
  };

  useEffect(() => {
    Promise.all([
      API.getThesisProposalsTeachers()
        .then(data => {
          setTeachers(data);
        })
        .catch(error => {
          console.error('Error fetching thesis proposals teachers:', error);
          setTeachers([]);
        }),
      API.getCompanies()
        .then(data => {
          setCompanies(data);
        })
        .catch(error => {
          console.error('Error fetching companies:', error);
          setCompanies([]);
        }),
    ]);
  }, []);

  if (isLoading) {
    return <LoadingModal show={isLoading} onHide={() => setIsLoading(false)} />;
  }

  return (
    <>
      <CustomModal
        show={showConfirm}
        handleClose={() => {
          setShowConfirm(false);
          setShow(true);
        }}
        handleConfirm={handleSubmit}
        titleText={t('carriera.richiesta_tesi.confirm_title')}
        bodyText={t('carriera.richiesta_tesi.confirm_body')}
        onConfirm={handleSubmit}
        confirmText={t('carriera.richiesta_tesi.confirm')}
        confirmIcon="fa-solid fa-check"
      />
      <Modal className="modal-xxl" show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fa-regular fa-file-lines fa-lg pe-2" />
            {t('carriera.richiesta_tesi.title')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="thesisTopic">
              <Form.Label>{t('carriera.richiesta_tesi.topic')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                className={`form-control textarea-themed ${errors.topic ? 'is-invalid' : ''}`}
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder={t('carriera.richiesta_tesi.topic_placeholder')}
              />
              <div className="d-flex justify-content-between align-items-center mt-2 flex-nowrap">
                {errors.topic && (
                  <div className="invalid-feedback d-block">
                    {maxCharCount < charCount
                      ? t('carriera.richiesta_tesi.too_long')
                      : t('carriera.richiesta_tesi.topic_required')}
                  </div>
                )}
                <FormText className={`ms-auto text-nowrap ${maxCharCount - charCount < 150 ? 'text-danger' : ''}`}>
                  {maxCharCount - charCount}{' '}
                  {t('carriera.richiesta_tesi.chars_left', { count: charCount, max: maxCharCount })}
                </FormText>
              </div>
            </Form.Group>

            <Form.Group className="mb-3" controlId="supervisorSelect">
              <Form.Label>
                <i className="fa-regular fa-user fa-lg pe-2" /> {t('carriera.richiesta_tesi.select_supervisor')}
              </Form.Label>
              <CustomSelect
                mode="supervisor"
                options={teachers
                  .filter(teacher => !coSupervisors.some(co => co.value === teacher.id))
                  .map(item => ({
                    value: item.id,
                    label: `${item.lastName} ${item.firstName}`,
                    email: item.email,
                    variant: 'teacher',
                  }))}
                selected={supervisor}
                setSelected={setSupervisor}
                isMulti={false}
                placeholder={t('carriera.richiesta_tesi.select_supervisor_placeholder')}
                error={errors.supervisor}
              />
              {errors.supervisor && (
                <div className="text-danger mt-2">
                  <small>{t('carriera.richiesta_tesi.supervisor_required')}</small>
                </div>
              )}
            </Form.Group>
            <Form.Group className="mb-3" controlId="coSupervisorsSelect">
              <Form.Label>
                <i className="fa-regular fa-users fa-lg pe-2" /> {t('carriera.richiesta_tesi.select_co_supervisors')}
              </Form.Label>
              <CustomSelect
                mode="supervisor"
                options={teachers
                  .filter(teacher => teacher.id !== (supervisor ? supervisor.value : null))
                  .map(item => ({
                    value: item.id,
                    label: `${item.lastName} ${item.firstName}`,
                    email: item.email,
                    variant: 'teacher',
                  }))}
                selected={coSupervisors}
                setSelected={setCoSupervisors}
                isMulti={true}
                placeholder={t('carriera.richiesta_tesi.select_co_supervisors_placeholder')}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="companySelect">
              <Form.Label>
                <i className="fa-regular fa-building fa-lg pe-2" />
                {t('carriera.richiesta_tesi.select_company')}
              </Form.Label>
              <CustomSelect
                mode="company"
                options={companies.map(company => ({
                  value: company.id,
                  label: company.corporateName,
                  variant: 'external-company',
                }))}
                selected={company}
                setSelected={setCompany}
                placeholder={t('carriera.richiesta_tesi.select_company_placeholder')}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            className={`btn-${appliedTheme}`}
            onClick={() => {
              setTopic('');
              setSupervisor(null);
              setCoSupervisors([]);
              setCompany(null);
              setErrors({
                topic: false,
                supervisor: false,
              });
            }}
          >
            <i className="fa-solid fa-arrow-rotate-left fa-lg me-1" /> {t('carriera.richiesta_tesi.reset_form')}
          </Button>
          <Button className={`btn-primary-${appliedTheme}`} onClick={() => handleShowConfirm()} size="md">
            <i className="fa-solid fa-paper-plane fa-lg pe-2" />
            {t('carriera.richiesta_tesi.submit_request')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
ThesisRequestModal.propTypes = {
  show: PropTypes.bool.isRequired,
  setShow: PropTypes.func.isRequired,
  onSubmitResult: PropTypes.func.isRequired,
};
