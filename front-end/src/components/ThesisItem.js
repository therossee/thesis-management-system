import React, { useContext } from 'react';

import { Button, Card, Col, Row } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import moment from 'moment';
import 'moment/locale/it';
import PropTypes from 'prop-types';

import { ThemeContext } from '../App';
import '../styles/thesis-item.css';
import '../styles/utilities.css';
import { getSystemTheme } from '../utils/utils';
import CustomBadge from './CustomBadge';

function ThesisItem(props) {
  const teachers = [props.supervisor, ...props.internalCoSupervisors];
  const { theme } = useContext(ThemeContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;
  const navigate = useNavigate();

  const { t } = useTranslation();
  return (
    <Col xs={12} sm={12} md={12} lg={6} xl={6} className="mb-3">
      <Card className="mb-3 roundCard py-2 h-100 ">
        <Card.Header className="border-0">
          <Row className="d-flex justify-content-between align-items-start">
            <Col xs={8} sm={8} md={9} lg={8} xl={9}>
              <h3 className="thesis-topic">{props.topic}</h3>
            </Col>
            <Col xs={4} sm={4} md={3} lg={4} xl={3} className="justify-content-end d-flex">
              <CustomBadge variant="status" content={props.expirationDate} />
            </Col>
          </Row>
        </Card.Header>
        <Card.Body className="pt-2">
          <div className="custom-badge-container mb-2">
            {props.isInternal ? <CustomBadge variant="internal" /> : <CustomBadge variant="external" />}
            <CustomBadge variant={props.isAbroad ? 'abroad' : 'italy'} />
            {props.types.map(type => (
              <CustomBadge key={type.id} variant="type" content={type.type} />
            ))}
          </div>
          <div className="info-container mb-2">
            <div className="title-container">
              <i className="fa-regular fa-user fa-fw" />
              {t('carriera.proposte_di_tesi.supervisors')}:
            </div>
            <CustomBadge
              variant="teacher"
              content={teachers.map(teacher => teacher.lastName + ' ' + teacher.firstName)}
            />
          </div>
          {props.keywords.length > 0 && (
            <div className="info-container mb-2">
              <div className="title-container">
                <i className="fa-regular fa-key fa-fw" />
                {t('carriera.proposte_di_tesi.keywords')}:
              </div>
              <CustomBadge
                variant="keyword"
                content={props.keywords.map(keyword => keyword.keyword)}
                type="truncated"
              />
            </div>
          )}
          <Card.Text className="thesis-description">{props.description}</Card.Text>
        </Card.Body>
        <Card.Footer className="mx-2 px-2 d-flex justify-content-between border-0">
          <div className="title-container">
            <i className="fa-regular fa-calendar-clock" />
            {t('carriera.proposte_di_tesi.expires')}: <span>{moment(props.expirationDate).format('DD/MM/YYYY')}</span>
          </div>
          <Button
            className={`btn-${appliedTheme}`}
            size="md"
            onClick={() => navigate(`/carriera/tesi/proposta_di_tesi/${props.id}`)}
          >
            {t('carriera.proposte_di_tesi.show_more')}
          </Button>
        </Card.Footer>
      </Card>
    </Col>
  );
}

ThesisItem.propTypes = {
  id: PropTypes.number.isRequired,
  topic: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  types: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      type: PropTypes.string.isRequired,
    }),
  ),
  supervisor: PropTypes.shape({
    id: PropTypes.number.isRequired,
    firstName: PropTypes.string.isRequired,
    lastName: PropTypes.string.isRequired,
  }).isRequired,
  internalCoSupervisors: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      firstName: PropTypes.string.isRequired,
      lastName: PropTypes.string.isRequired,
    }),
  ),
  expirationDate: PropTypes.string.isRequired,
  isInternal: PropTypes.bool.isRequired,
  isAbroad: PropTypes.bool.isRequired,
  keywords: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      keyword: PropTypes.string.isRequired,
    }),
  ),
};

export { ThesisItem };
