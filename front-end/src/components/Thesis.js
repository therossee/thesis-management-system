import React, { useContext, useMemo, useState } from 'react';

import { Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import PropTypes from 'prop-types';

import API from '../API';
import { ThemeContext, ToastContext } from '../App';
import useThesisDownloader from '../hooks/useThesisDownloader';
import useThesisPageData from '../hooks/useThesisPageData';
import '../styles/utilities.css';
import { hasReachedConclusionRequest, normalizeTopic } from '../utils/thesisUtils';
import { getSystemTheme } from '../utils/utils';
import CustomModal from './CustomModal';
import FinalThesisUpload from './FinalThesisUpload';
import LinkCard from './LinkCard';
import LoadingModal from './LoadingModal';
import TeacherContactCard from './TeacherContactCard';
import ThesisRequestModal from './ThesisRequestModal';
import Timeline from './Timeline';
import NextStepsCard from './thesis-page/NextStepsCard';
import NoApplicationSection from './thesis-page/NoApplicationSection';
import ThesisSummaryCard from './thesis-page/ThesisSummaryCard';
import ThesisTopicCard from './thesis-page/ThesisTopicCard';

const APPLICATION_VARIANT_BY_STATUS = {
  rejected: 'application_rejected',
  cancelled: 'application_cancelled',
};

const buildModalConfig = isThesis => {
  if (isThesis) {
    return {
      title: 'carriera.tesi.modal_cancel.title',
      body: 'carriera.tesi.modal_cancel.body',
      confirmText: 'carriera.tesi.modal_cancel.confirm_text',
      confirmIcon: 'fa-regular fa-trash-can',
    };
  }

  return {
    title: 'carriera.tesi.cancel_application',
    body: 'carriera.tesi.cancel_application_content',
    confirmText: 'carriera.tesi.confirm_cancel',
    confirmIcon: 'fa-regular fa-xmark',
  };
};

function ThesisNextActionCard({ t, appliedTheme, isEligible, onOpenRequest, thesis, thesisApplication }) {
  if (thesis) {
    if (thesis.status !== 'cancel_approved') {
      return <LinkCard />;
    }

    return (
      <NextStepsCard
        t={t}
        appliedTheme={appliedTheme}
        variant="thesis_cancel_approved"
        isEligible={isEligible}
        onOpenRequest={onOpenRequest}
      />
    );
  }

  if (!thesisApplication) {
    return <LinkCard />;
  }

  const variant = APPLICATION_VARIANT_BY_STATUS[thesisApplication.status];
  if (!variant) {
    return <LinkCard />;
  }

  return (
    <NextStepsCard
      t={t}
      appliedTheme={appliedTheme}
      variant={variant}
      isEligible={isEligible}
      onOpenRequest={onOpenRequest}
    />
  );
}

ThesisNextActionCard.propTypes = {
  t: PropTypes.func.isRequired,
  appliedTheme: PropTypes.string.isRequired,
  isEligible: PropTypes.bool,
  onOpenRequest: PropTypes.func.isRequired,
  thesis: PropTypes.object,
  thesisApplication: PropTypes.object,
};

function ThesisDetailContent({
  thesis,
  thesisApplication,
  data,
  t,
  appliedTheme,
  isEligible,
  setShowRequestModal,
  normalizedTopic,
  showFullAbstract,
  setShowFullAbstract,
  showFullTopic,
  setShowFullTopic,
  requiredSummary,
  handleDownload,
  supervisors,
}) {
  if (!thesis && !thesisApplication) {
    return null;
  }

  return (
    <Col md={8} lg={8}>
      {thesis && hasReachedConclusionRequest(thesis.status) && (
        <ThesisSummaryCard
          t={t}
          thesis={thesis}
          requiredSummary={requiredSummary}
          showFullAbstract={showFullAbstract}
          setShowFullAbstract={setShowFullAbstract}
          onDownload={handleDownload}
        />
      )}

      <ThesisTopicCard
        t={t}
        normalizedTopic={normalizedTopic}
        showFullTopic={showFullTopic}
        setShowFullTopic={setShowFullTopic}
        company={data?.company}
      />

      <Row className="mb-3">
        {thesis && (
          <>
            <Col md={7} lg={7}>
              {supervisors && <TeacherContactCard supervisor={data.supervisor} coSupervisors={data.coSupervisors} />}
            </Col>
            <Col md={5} lg={5}>
              <ThesisNextActionCard
                t={t}
                appliedTheme={appliedTheme}
                isEligible={isEligible}
                onOpenRequest={() => setShowRequestModal(true)}
                thesis={thesis}
              />
            </Col>
          </>
        )}

        {thesisApplication && (
          <>
            <Col>
              {supervisors && <TeacherContactCard supervisor={data.supervisor} coSupervisors={data.coSupervisors} />}
            </Col>
            <Col md={5}>
              <ThesisNextActionCard
                t={t}
                appliedTheme={appliedTheme}
                isEligible={isEligible}
                onOpenRequest={() => setShowRequestModal(true)}
                thesisApplication={thesisApplication}
              />
            </Col>
          </>
        )}
      </Row>
    </Col>
  );
}

ThesisDetailContent.propTypes = {
  thesis: PropTypes.object,
  thesisApplication: PropTypes.object,
  data: PropTypes.object,
  t: PropTypes.func.isRequired,
  appliedTheme: PropTypes.string.isRequired,
  isEligible: PropTypes.bool,
  setShowRequestModal: PropTypes.func.isRequired,
  normalizedTopic: PropTypes.string,
  showFullAbstract: PropTypes.bool.isRequired,
  setShowFullAbstract: PropTypes.func.isRequired,
  showFullTopic: PropTypes.bool.isRequired,
  setShowFullTopic: PropTypes.func.isRequired,
  requiredSummary: PropTypes.bool,
  handleDownload: PropTypes.func.isRequired,
  supervisors: PropTypes.array,
};

export default function Thesis(props) {
  const {
    thesis,
    thesisApplication,
    showModal,
    setShowModal,
    showRequestModal,
    setShowRequestModal,
    onRequestSubmitResult,
    onFinalThesisUploadResult,
    onCancelApplicationResult,
    onCancelThesisRequestResult,
    showFinalThesis,
    setShowFinalThesis,
  } = props;

  const data = thesis || thesisApplication || null;
  const dataId = data?.id;

  const { showToast } = useContext(ToastContext);
  const { theme } = useContext(ThemeContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;
  const { t } = useTranslation();

  const [showFullTopic, setShowFullTopic] = useState(false);
  const [showFullAbstract, setShowFullAbstract] = useState(false);

  const supervisors = data ? [data.supervisor, ...(data.coSupervisors || [])] : [];
  let activeStep = 'none';
  if (data) {
    if (thesis) {
      activeStep = thesis.status;
    } else {
      activeStep = thesisApplication.status;
    }
  }

  const { isLoading, sessionDeadlines, isEligible, requiredSummary, appStatusHistory } = useThesisPageData({
    thesis,
    thesisApplication,
    dataId,
    API,
  });

  const downloadThesisFile = useThesisDownloader({ API, showToast, t });

  const normalizedTopic = useMemo(() => normalizeTopic(data?.topic), [data?.topic]);
  const modalConfig = buildModalConfig(Boolean(thesis));

  const cancelThesis = () => {
    API.requestThesisCancelation()
      .then(() => {
        setShowModal(false);
        onCancelThesisRequestResult(true);
      })
      .catch(error => {
        console.error('Error cancelling thesis:', error);
        setShowModal(false);
        onCancelThesisRequestResult(false);
      });
  };

  const cancelApplication = () => {
    API.cancelThesisApplication({ applicationId: data.id })
      .then(() => {
        showToast({
          success: true,
          title: t('carriera.tesi.success_application_cancelled'),
          message: t('carriera.tesi.success_application_cancelled_content'),
        });
        setShowModal(false);
        onCancelApplicationResult(true);
      })
      .catch(error => {
        console.error('Error cancelling thesis application:', error);
        showToast({
          success: false,
          title: t('carriera.tesi.error_application_cancelled'),
          message: t('carriera.tesi.error_application_cancelled_content'),
        });
        setShowModal(false);
        onCancelApplicationResult(false);
      });
  };

  const handleCancel = () => {
    const cancelHandler = thesis ? cancelThesis : cancelApplication;
    cancelHandler();
  };

  const handleDownload = ({ fileType, filePath }) => {
    if (!data) return;
    downloadThesisFile({ thesisId: data.id, fileType, filePath, topic: data.topic });
  };

  if (isLoading) {
    return <LoadingModal show={isLoading} onHide={() => {}} />;
  }

  return (
    <div className="proposals-container">
      <Row className="mb-3">
        <Col md={4} lg={4}>
          <Timeline
            activeStep={activeStep}
            statusHistory={appStatusHistory}
            conclusionRequestDate={thesis ? thesis.thesisConclusionRequestDate : null}
            conclusionConfirmedDate={thesis ? thesis.thesisConclusionConfirmedDate : null}
            session={sessionDeadlines}
          />
        </Col>

        {!thesis && !thesisApplication && (
          <NoApplicationSection
            t={t}
            appliedTheme={appliedTheme}
            isEligible={isEligible}
            onOpenRequest={() => setShowRequestModal(true)}
          />
        )}

        <ThesisDetailContent
          thesis={thesis}
          thesisApplication={thesisApplication}
          data={data}
          t={t}
          appliedTheme={appliedTheme}
          isEligible={isEligible}
          setShowRequestModal={setShowRequestModal}
          normalizedTopic={normalizedTopic}
          showFullAbstract={showFullAbstract}
          setShowFullAbstract={setShowFullAbstract}
          showFullTopic={showFullTopic}
          setShowFullTopic={setShowFullTopic}
          requiredSummary={requiredSummary}
          handleDownload={handleDownload}
          supervisors={supervisors}
        />
      </Row>

      <CustomModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        handleConfirm={handleCancel}
        titleText={modalConfig.title}
        bodyText={modalConfig.body}
        confirmText={modalConfig.confirmText}
        confirmIcon={modalConfig.confirmIcon}
      />

      <ThesisRequestModal
        show={showRequestModal}
        setShow={setShowRequestModal}
        onSubmitResult={onRequestSubmitResult}
      />

      <FinalThesisUpload
        show={showFinalThesis}
        setShow={setShowFinalThesis}
        onSubmitResult={onFinalThesisUploadResult}
      />
    </div>
  );
}

Thesis.propTypes = {
  thesis: PropTypes.shape({
    id: PropTypes.number.isRequired,
    topic: PropTypes.string.isRequired,
    supervisor: PropTypes.object.isRequired,
    coSupervisors: PropTypes.arrayOf(PropTypes.object),
    company: PropTypes.shape({
      id: PropTypes.number,
      corporateName: PropTypes.string,
    }),
    applicationStatusHistory: PropTypes.arrayOf(
      PropTypes.shape({
        oldStatus: PropTypes.string,
        newStatus: PropTypes.string.isRequired,
        note: PropTypes.string,
        changeDate: PropTypes.string.isRequired,
      }),
    ),
    status: PropTypes.string.isRequired,
    thesisFilePath: PropTypes.string,
    thesisSummaryPath: PropTypes.string,
    additionalZipPath: PropTypes.string,
    thesisConclusionRequestDate: PropTypes.string,
    thesisConclusionConfirmedDate: PropTypes.string,
    abstract: PropTypes.string,
    title: PropTypes.string,
  }),
  thesisApplication: PropTypes.shape({
    id: PropTypes.number.isRequired,
    topic: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    supervisor: PropTypes.object.isRequired,
    coSupervisors: PropTypes.arrayOf(PropTypes.object),
    company: PropTypes.shape({
      id: PropTypes.number,
      corporateName: PropTypes.string,
    }),
  }),
  showModal: PropTypes.bool.isRequired,
  setShowModal: PropTypes.func.isRequired,
  showRequestModal: PropTypes.bool,
  setShowRequestModal: PropTypes.func,
  onRequestSubmitResult: PropTypes.func.isRequired,
  onCancelApplicationResult: PropTypes.func.isRequired,
  onCancelThesisRequestResult: PropTypes.func.isRequired,
  showFinalThesis: PropTypes.bool,
  setShowFinalThesis: PropTypes.func,
  onFinalThesisUploadResult: PropTypes.func.isRequired,
};
