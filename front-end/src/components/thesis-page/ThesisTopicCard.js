import React from 'react';

import { Button, Card } from 'react-bootstrap';

import PropTypes from 'prop-types';

import CustomBadge from '../CustomBadge';
import CustomBlock from '../CustomBlock';
import InfoTooltip from '../InfoTooltip';

export default function ThesisTopicCard({ t, normalizedTopic, showFullTopic, setShowFullTopic, company }) {
  return (
    <Card className="mb-3 roundCard py-2 pb-2">
      <Card.Header className="border-0 d-flex align-items-center">
        <h3 className="thesis-topic mb-0">
          <i className="fa-regular fa-book-open fa-sm pe-2" />
          {t('carriera.proposte_di_tesi.topic')}
        </h3>
        <InfoTooltip tooltipText={t('carriera.proposte_di_tesi.topic')} placement="right" id="thesis-topic-tooltip" />
      </Card.Header>

      <Card.Body className="pt-2 pb-0">
        <p className="info-detail">
          {normalizedTopic.length > 400 && !showFullTopic ? (
            <>{normalizedTopic.substring(0, 397) + '... '}</>
          ) : (
            <>{normalizedTopic}</>
          )}

          {normalizedTopic.length > 400 && (
            <Button
              variant="link"
              onClick={() => setShowFullTopic(!showFullTopic)}
              aria-expanded={showFullTopic}
              className="p-0 custom-link d-inline-flex align-items-center gap-1 align-baseline"
              style={{ fontSize: 'inherit', lineHeight: 'inherit', verticalAlign: 'baseline' }}
            >
              <i className={`fa-regular fa-chevron-${showFullTopic ? 'up' : 'down'} cosupervisor-button`} />
              <span className="cosupervisor-button">
                {t(`carriera.tesi.${showFullTopic ? 'show_less' : 'show_more'}`)}
              </span>
            </Button>
          )}
        </p>

        {company && (
          <CustomBlock icon="building" title="carriera.proposta_di_tesi.azienda" ignoreMoreLines>
            <CustomBadge variant="external-company" content={company.corporateName} />
          </CustomBlock>
        )}
      </Card.Body>
    </Card>
  );
}

ThesisTopicCard.propTypes = {
  t: PropTypes.func.isRequired,
  normalizedTopic: PropTypes.string.isRequired,
  showFullTopic: PropTypes.bool.isRequired,
  setShowFullTopic: PropTypes.func.isRequired,
  company: PropTypes.shape({
    corporateName: PropTypes.string,
  }),
};
