import React, { useContext, useEffect, useState } from 'react';

import { Button, Card, Col, FormText, Row, Toast } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import PropTypes from 'prop-types';

import API from '../API';
import { BodyDataLoadingContext, ThemeContext } from '../App';
import '../styles/custom-textarea.css';
import { getSystemTheme } from '../utils/utils';
import CustomBlock from './CustomBlock';
import CustomModal from './CustomModal';
import LoadingModal from './LoadingModal';
import CustomSelect from './CustomSelect';

export default function ThesisApplicationForm() {
  const { setBodyDataLoading } = useContext(BodyDataLoadingContext);
  const [teachers, setTeachers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [selectedCoSupervisors, setSelectedCoSupervisors] = useState([]);
  const [topic, setTopic] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const charCount = topic.length;
  const maxCharCount = 1500;
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { theme } = useContext(ThemeContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;
  const { t } = useTranslation();

  const [errors, setErrors] = useState({
    topic: false,
    supervisor: false,
  });

  useEffect(() => {
    setBodyDataLoading(true);
    setIsLoading(true);

    Promise.all([
      API.getThesisProposalsTeachers()
        .then(teachers => {
          setTeachers(teachers);
          return teachers;
        })
        .catch(error => {
          console.error('Error fetching thesis proposal teachers:', error);
          return [];
        }),
      API.getCompanies()
        .then(companies => {
          setCompanies(companies);
          return companies;
        })
        .catch(error => {
          console.error('Error fetching companies:', error);
          return [];
        }),
    ]).then(() => {
      setIsLoading(false);
      setBodyDataLoading(false);
    });
  }, [setBodyDataLoading]);

  const handleSubmit = () => {
    const newErrors = {
      topic: !topic || topic.trim() === '' || charCount > maxCharCount,
      supervisor: !selectedSupervisor,
    };

    setErrors(newErrors);
    setShowModal(false);

    if (!newErrors.topic && !newErrors.supervisor && charCount <= maxCharCount) {
      API.createThesisApplication({
        topic,
        supervisor: teachers.find(teacher => teacher.id === selectedSupervisor.value),
        coSupervisors: selectedCoSupervisors
          .map(coSup => teachers.find(teacher => teacher.id === coSup.value))
          .filter(Boolean),
        company: selectedCompany ? companies.find(company => company.id === selectedCompany.value) : null,
      })
        .then(() => {
          setShowToast(true);
          setSuccess(true);

          setTimeout(() => {
            navigate('/carriera/tesi');
          }, 5000);
        })
        .catch(error => {
          console.error('Error submitting thesis application:', error);
          setSuccess(false);
          setShowToast(true);
        });
    }
  };

  return (
    <div>
      {isLoading ? (
        <LoadingModal show={isLoading} onHide={() => setIsLoading(false)} />
      ) : (
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
                    {success ? t('carriera.richiesta_tesi.success') : t('carriera.richiesta_tesi.error')}
                  </strong>
                  <p className="custom-toast__message mb-0">
                    {success
                      ? t('carriera.richiesta_tesi.success_content')
                      : t('carriera.richiesta_tesi.error_content')}
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
            <Row className="mb-3">
              <Col md={8} lg={8} className="mb-3">
                <Card className="roundCard ">
                  <Card.Body>
                    <h3 className="thesis-topic mb-3">
                      <i className="fa-solid fa-file-circle-plus fa-lg pe-2" />
                      {t('carriera.richiesta_tesi.title')}
                    </h3>
                    <CustomBlock icon="book-open" title="carriera.proposte_di_tesi.topic">
                      <p></p>
                    </CustomBlock>
                    <textarea
                      id="topic"
                      className={`form-control textarea-themed ${errors.topic ? 'is-invalid' : ''}`}
                      placeholder={t('carriera.richiesta_tesi.topic_placeholder')}
                      value={topic}
                      onChange={e => {
                        setTopic(e.target.value);
                        if (errors.topic && e.target.value) {
                          setErrors(prev => ({ ...prev, topic: false }));
                        }
                      }}
                      rows="4"
                      style={{ resize: 'none' }}
                    />
                    <div className="d-flex justify-content-between align-items-center mt-2 flex-nowrap">
                      {errors.topic && (
                        <div className="invalid-feedback d-block">
                          {maxCharCount < charCount
                            ? t('carriera.richiesta_tesi.too_long')
                            : t('carriera.richiesta_tesi.topic_required')}
                        </div>
                      )}
                      <FormText
                        className={`ms-auto text-nowrap ${maxCharCount - charCount < 150 ? 'text-danger' : ''}`}
                      >
                        {maxCharCount - charCount}{' '}
                        {t('carriera.richiesta_tesi.chars_left', { count: charCount, max: maxCharCount })}
                      </FormText>
                    </div>
                  </Card.Body>
                </Card>

                <Card className="roundCard " style={{ marginTop: '10px' }}>
                  <Card.Body>
                    <h3 className="thesis-topic mb-3">
                      <i className="fa-solid fa-lightbulb pe-2" />
                      {t('carriera.richiesta_tesi.useful_tips')}
                    </h3>
                    <ul className="mb-3 ps-3">
                      <li className="mb-2">{t('carriera.richiesta_tesi.tip_1')}</li>
                      <li className="mb-2">{t('carriera.richiesta_tesi.tip_2')}</li>
                      <li className="mb-2">{t('carriera.richiesta_tesi.tip_3')}</li>
                    </ul>
                    <hr />
                    <h3 className="thesis-topic mb-3">
                      <i className="fa-solid fa-timeline pe-2" />
                      {t('carriera.richiesta_tesi.what_happens_next')}
                    </h3>
                    <div className="d-flex flex-column mb-3">
                      <div className="d-flex align-items-start mb-2">
                        <p className="mb-0">
                          <i className="fa-solid fa-1 fa-sm pe-3 pt-1" />
                          {t('carriera.richiesta_tesi.ongoing')}
                        </p>
                      </div>
                      <div className="d-flex align-items-start mb-2">
                        <p className="mb-0">
                          <i className="fa-solid fa-2 fa-sm pe-3 pt-1" />
                          {t('carriera.richiesta_tesi.conclusion_request')}
                        </p>
                      </div>
                      <div className="d-flex align-items-start mb-2">
                        <p className="mb-0">
                          <i className="fa-solid fa-3 fa-sm pe-3 pt-1" />
                          {t('carriera.richiesta_tesi.almalaurea')}
                        </p>
                      </div>
                    </div>

                    <div className="d-flex gap-2 justify-content-end">
                      <Button
                        className={`btn-outlined-${appliedTheme} mb-3`}
                        size="md"
                        onClick={() => {
                          setTopic('');
                          setSelectedSupervisor(null);
                          setSelectedCoSupervisors([]);
                          setSelectedCompany(null);
                          setErrors({ topic: false, supervisor: false });
                        }}
                      >
                        <i className="fa-solid fa-rotate-left pe-2" />
                        {t('carriera.richiesta_tesi.reset')}
                      </Button>
                      <Button className={`btn-${appliedTheme} mb-3`} size="md" onClick={() => setShowModal(true)}>
                        <i className="fa-solid fa-paper-plane pe-2" />
                        {t('carriera.richiesta_tesi.submit')}
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} lg={4}>
                <Card className="roundCard  mb-3">
                  <Card.Body>
                    <h3 className="thesis-topic mb-3">
                      <i className="fa-solid fa-user fa-lg pe-2" />
                      {t('carriera.richiesta_tesi.select_supervisor')}
                    </h3>
                    <CustomSelect
                      mode="supervisor"
                      options={teachers
                        .filter(teacher => !selectedCoSupervisors.some(co => co.value === teacher.id))
                        .map(item => ({
                          value: item.id,
                          label: `${item.lastName} ${item.firstName}`,
                          email: item.email,
                          variant: 'teacher',
                        }))}
                      isMulti={false}
                      selected={selectedSupervisor}
                      setSelected={value => {
                        setSelectedSupervisor(value);
                        if (errors.supervisor && value) {
                          setErrors(prev => ({ ...prev, supervisor: false }));
                        }
                      }}
                      isClearable={true}
                      placeholder={t('carriera.richiesta_tesi.select_supervisor_placeholder')}
                    />
                    {errors.supervisor && (
                      <div className="text-danger mt-2">
                        <small>{t('carriera.richiesta_tesi.supervisor_required')}</small>
                      </div>
                    )}
                  </Card.Body>
                </Card>
                <Card className="roundCard  mb-3">
                  <Card.Body>
                    <h3 className="thesis-topic mb-3">
                      <i className="fa-solid fa-users fa-lg pe-2" />
                      {t('carriera.richiesta_tesi.select_co_supervisors')}
                    </h3>
                    <CustomSelect
                      mode="supervisor"
                      options={teachers
                        .filter(teacher => teacher.id !== (selectedSupervisor ? selectedSupervisor.value : null))
                        .map(item => ({
                          value: item.id,
                          label: `${item.lastName} ${item.firstName}`,
                          email: item.email,
                          variant: 'teacher',
                        }))}
                      isMulti={true}
                      selected={selectedCoSupervisors}
                      setSelected={setSelectedCoSupervisors}
                      isClearable={false}
                      placeholder={t('carriera.richiesta_tesi.select_co_supervisors_placeholder')}
                    />
                  </Card.Body>
                </Card>
                <Card className="roundCard  mb-3">
                  <Card.Body>
                    <h3 className="thesis-topic mb-3">
                      <i className="fa-solid fa-building fa-lg pe-2" />
                      {t('carriera.richiesta_tesi.select_company')}
                    </h3>
                    <CustomSelect
                      mode="company"
                      options={companies.map(company => ({
                        value: company.id,
                        label: company.corporateName,
                        variant: 'external-company',
                      }))}
                      selected={selectedCompany}
                      setSelected={setSelectedCompany}
                      isClearable={true}
                      placeholder={t('carriera.richiesta_tesi.select_company_placeholder')}
                    />
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>
        </>
      )}
      <CustomModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        confirm={handleSubmit}
        titleText="carriera.proposta_di_tesi.candidatura"
        bodyText="carriera.proposta_di_tesi.modal_contenuto"
        confirmText="carriera.proposta_di_tesi.prosegui"
        confirmIcon="fa-regular fa-paper-plane"
      />
    </div>
  );
}

ThesisApplicationForm.propTypes = {
  proposalId: PropTypes.number,
};
