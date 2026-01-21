import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { ThemeContext } from '../App';
import { getSystemTheme } from '../utils/utils';
import API from '../API';
import { BodyDataLoadingContext } from '../App';
import { Button, Card, Col, FormText, Modal, Row, Toast } from 'react-bootstrap';
import LoadingModal from './LoadingModal';
import CustomBlock from './CustomBlock';
import { t } from 'i18next';
import SupervisorSelect from './SupervisorSelect';
import CompanySelect from './CompanySelect';
import '../styles/custom-textarea.css';

export default function ThesisApplicationForm({ proposalId }) {
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
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const navigate = useNavigate();
    const [showToast, setShowToast] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const { theme } = useContext(ThemeContext);
    const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;
    const { t } = useTranslation();

    const [errors, setErrors] = useState({
        topic: false,
        supervisor: false
    });

    useEffect(() => {
        setBodyDataLoading(true);
        setIsLoading(true);

        Promise.all([
            API.getThesisProposalsTeachers()
                .then((teachers) => {
                    setTeachers(teachers);
                    return teachers;
                })
                .catch((error) => {
                    console.error('Error fetching thesis proposal teachers:', error);
                    return [];
                }),
            API.getCompanies()
                .then((companies) => {
                    setCompanies(companies);
                    return companies;
                })
                .catch((error) => {
                    console.error('Error fetching companies:', error);
                    return [];
                })
        ]).then(([teachers, companies]) => {
            if (proposalId !== null && proposalId !== undefined) {
                API.getThesisProposalById(proposalId)
                    .then((proposal) => {
                        console.log(proposal);
                        setTopic(proposal.topic || '');

                        if (proposal.supervisor) {
                            const supervisor = teachers.find(t => t.id === proposal.supervisor.id);
                            if (supervisor) {
                                setSelectedSupervisor({
                                    value: supervisor.id,
                                    label: `${supervisor.lastName} ${supervisor.firstName}`
                                });
                            }
                        }
                        if (proposal.internalCoSupervisors && proposal.internalCoSupervisors.length > 0) {
                            const coSupOptions = proposal.internalCoSupervisors.map(coSup => {
                                const teacher = teachers.find(t => t.id === coSup.id);
                                if (teacher) {
                                    return {
                                        value: teacher.id,
                                        label: `${teacher.lastName} ${teacher.firstName}`
                                    };
                                }
                                return null;
                            }).filter(option => option !== null);
                            setSelectedCoSupervisors(coSupOptions);
                        }

                        if (proposal.company) {
                            const company = companies.find(c => c.id === proposal.company.id);
                            if (company) {
                                setSelectedCompany({
                                    value: company.id,
                                    label: company.corporateName
                                });
                            }
                        }
                    })
                    .catch((error) => {
                        console.error('Error fetching thesis proposal by ID:', error);
                    })
                    .finally(() => {
                        setBodyDataLoading(false);
                        setIsLoading(false);
                    });
            } else {
                setBodyDataLoading(false);
                setIsLoading(false);
            }
        });
    }, [setBodyDataLoading, proposalId, refreshTrigger]);

    const handleSubmit = () => {
        const newErrors = {
            topic: !topic || topic.trim() === '' || charCount > maxCharCount,
            supervisor: !selectedSupervisor
        };

        setErrors(newErrors);
        setShowModal(false);

        if (!newErrors.topic && !newErrors.supervisor && charCount <= maxCharCount) {
            API.createThesisApplication({
                topic,
                supervisor: teachers.find(teacher => teacher.id === selectedSupervisor.value),
                coSupervisors: selectedCoSupervisors.map(coSup => teachers.find(teacher => teacher.id === coSup.value)).filter(Boolean),
                company: selectedCompany ? companies.find(company => company.id === selectedCompany.value) : null
            })
                .then(() => {
                    setShowToast(true);
                    setSuccess(true);

                    setTimeout(() => {
                        navigate('/carriera/tesi');
                    }, 5000);
                })
                .catch((error) => {
                    console.error('Error submitting thesis application:', error);
                    // Handle submission error (e.g., show an error message)
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
                                        {success
                                            ? t('carriera.richiesta_tesi.success')
                                            : t('carriera.richiesta_tesi.error')}
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
                            <Col md={8} className="mb-3">
                                <Card className="roundCard py-2">
                                    <Card.Body>
                                        <h3 className="thesis-topic mb-3">
                                            <i className="fa-solid fa-file-circle-plus fa-lg pe-2" />
                                            {t('carriera.richiesta_tesi.title')}
                                        </h3>
                                        <CustomBlock icon="book-open" title="carriera.proposte_di_tesi.topic" >
                                            <p></p>
                                        </CustomBlock>
                                        <textarea
                                            id="topic"
                                            className={`form-control textarea-themed ${errors.topic ? 'is-invalid' : ''}`}
                                            placeholder={t('carriera.richiesta_tesi.topic_placeholder')}
                                            value={topic}
                                            onChange={(e) => {
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
                                                    {(maxCharCount < charCount) ? (t('carriera.richiesta_tesi.too_long')) : (t('carriera.richiesta_tesi.topic_required'))}
                                                </div>
                                            )}
                                            <FormText className={`ms-auto text-nowrap ${(maxCharCount - charCount) < 150 ? 'text-danger' : ''}`}>
                                                {maxCharCount - charCount} {t('carriera.richiesta_tesi.chars_left', { count: charCount, max: maxCharCount })}
                                            </FormText>
                                        </div>
                                    </Card.Body>
                                </Card>

                                <Card className="roundCard py-2" style={{ marginTop: '10px' }}>
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

                                                <p className="mb-0"><i className="fa-solid fa-1 fa-sm pe-3 pt-1" />{t('carriera.richiesta_tesi.step_1')}</p>
                                            </div>
                                            <div className="d-flex align-items-start mb-2">

                                                <p className="mb-0"><i className="fa-solid fa-2 fa-sm pe-3 pt-1" />{t('carriera.richiesta_tesi.step_2')}</p>
                                            </div>
                                            <div className="d-flex align-items-start mb-2">
                                                <p className="mb-0"><i className="fa-solid fa-3 fa-sm pe-3 pt-1" />{t('carriera.richiesta_tesi.step_3')}</p>
                                            </div>
                                        </div>

                                        <div className="d-flex gap-2 justify-content-end">
                                            <Button
                                                className={`btn-outlined-${appliedTheme} mb-3`} size="md"
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
                            <Col md={4}>
                                <Card className="roundCard py-2 mb-3">
                                    <Card.Body>
                                        <h3 className="thesis-topic mb-3">
                                            <i className="fa-solid fa-user fa-lg pe-2" />
                                            {t('carriera.richiesta_tesi.select_supervisor')}
                                        </h3>
                                        <SupervisorSelect
                                            isMulti={false}
                                            selected={selectedSupervisor}
                                            setSelected={(value) => {
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
                                <Card className="roundCard py-2 mb-3">
                                    <Card.Body>
                                        <h3 className="thesis-topic mb-3">
                                            <i className="fa-solid fa-users fa-lg pe-2" />
                                            {t('carriera.richiesta_tesi.select_co_supervisors')}
                                        </h3>
                                        <SupervisorSelect
                                            isMulti={true}
                                            selected={selectedCoSupervisors}
                                            setSelected={setSelectedCoSupervisors}
                                            isClearable={false}
                                            placeholder={t('carriera.richiesta_tesi.select_co_supervisors_placeholder')}
                                        />
                                    </Card.Body>
                                </Card>
                                <Card className="roundCard py-2 mb-3">
                                    <Card.Body>
                                        <h3 className="thesis-topic mb-3">
                                            <i className="fa-solid fa-building fa-lg pe-2" />
                                            {t('carriera.richiesta_tesi.select_company')}
                                        </h3>
                                        <CompanySelect
                                            isMulti={false}
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
            <FormModal
                show={showModal}
                handleClose={() => setShowModal(false)}
                sendApplication={handleSubmit}
            />
        </div>
    );
}

function FormModal({ show, handleClose, sendApplication }) {
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

ThesisApplicationForm.propTypes = {
    proposalId: PropTypes.number,
};

FormModal.propTypes = {
    show: PropTypes.bool.isRequired,
    handleClose: PropTypes.func.isRequired,
    sendApplication: PropTypes.func.isRequired,
};