import React, { useContext } from 'react';

import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import moment from 'moment';
import PropTypes from 'prop-types';

import { ThemeContext } from '../App';
import '../styles/custom-badge.css';
import { getSystemTheme } from '../utils/utils';

moment.locale('it');
/**
 * Custom badge component.
 * @param {string} variant - The variant of the badge. Available options are:
 *  - "teacher": Renders a badge with a teacher icon. Requires a "content".
 *  - "keyword": Renders a badge with a keyword icon. Requires a "content".
 *  - "language": Renders a badge with a language flag icon. Requires a "content".
 *  - "internal": Renders a badge with an internal thesis icon.
 *  - "external": Renders a badge with an external thesis icon.
 *  - "italy": Renders a badge with the Italy flag icon.
 *  - "abroad": Renders a badge with an abroad icon.
 *  - "status": Renders a badge with a success, warning or error icon. Requires a "content" (the expiration date).
 *  - "success": Renders a badge with a success icon. Requires a "content".
 *  - "warning": Renders a badge with a warning icon. Requires a "content".
 *  - "error": Renders a badge with an error icon. Requires a "content".
 *  - "type": Renders a badge with a thesis type icon. Requires a "content". Valid content values are:
 *    - "ANALISI DATI" or "DATA ANALYSIS"
 *    - "ANALITICA" or "ANALYTICAL"
 *    - "APPLICATIVA" or "APPLIED"
 *    - "COMPILATIVA" or "BIBLIOGRAPHIC"
 *    - "COMPUTAZIONALE" or "COMPUTATIONAL"
 *    - "PROGETTUALE" or "DESIGN"
 *    - "RICERCA" or "RESEARCH"
 *    - "SIMULATIVA" or "SIMULATION"
 *    - "SPERIMENTALE" or "EXPERIMENTAL"
 *    - "SVILUPPO" or "DEVELOPMENT"
 *    - "TEORICA" or "THEORETICAL"
 *    - "NUMERICA" or "NUMERICAL"
 * - "sorting-ASC" or "sorting-DESC": Renders a badge with an ascending or descending sorting icon (only reset badge available).
 * - "app_status": Renders a badge with the application status icon. Requires a "content". Valid content values are:
 *    - "PENDING"
 *    - "REJECTED"
 *    - "APPROVED"
 *    - "cancelled"
 * @param {object|array<object>!string|array<string>} content - If available, populate the content of the badge. It could be a single object (with 'content' and 'id' attributes) or an array of objects, a single string or an array of strings.
 * If you provide an array, the component will automatically render a tag for every item.
 * @param {type} - Optional. It is used to specify if the badge is a 'reset' badge. If it is, the badge will be rendered as a button with a 'delete' icon at the end and will reset the filter when clicked.
 * @param {object} filters - The filters object. It's required only if the badge is a 'reset' badge.
 * @param {function} applyFilters - The function to apply filters. It's required only if the badge is a filter (e.g. a teacher or a keyword filter).
 * @param {object} removeProps - The props to pass to the reset badge button.
 * @param {function} resetSorting - The function to reset the sorting. It's required only if the badge is a sorting reset badge.
 * @returns {JSX.Element} - The badge component.
 */

const validVariants = [
  'teacher',
  'teacher_inline',
  'keyword',
  'sdg',
  'recommended',
  'language',
  'internal',
  'external',
  'external-company',
  'italy',
  'abroad',
  'type',
  'sorting-ASC',
  'sorting-DESC',
  'status',
  'warning',
  'success',
  'error',
  'app_status',
  'recommended',
];
const validTypes = ['reset', 'truncated', 'single_select'];
const validTypeContent = [
  'analisi dati',
  'data analysis',
  'analitica',
  'analytical',
  'applicativa',
  'applied',
  'compilativa',
  'bibliographic',
  'computazionale',
  'computational',
  'progettuale',
  'design',
  'ricerca',
  'research',
  'simulativa',
  'simulation',
  'sperimentale',
  'experimental',
  'sviluppo',
  'development',
  'teorica',
  'theoretical',
  'numerica',
  'numerical',
];

export default function CustomBadge({ variant, content, type, filters, applyFilters, removeProps, resetSorting }) {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslation();
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;

  const handleRemoveFilter = () => {
    if (resetSorting) {
      resetSorting();
    }
    if (applyFilters) {
      if (variant === 'internal' || variant === 'external') {
        applyFilters('isInternal', 0);
      } else if (variant === 'italy' || variant === 'abroad') {
        applyFilters('isAbroad', 0);
      } else {
        applyFilters(
          variant,
          filters[variant].filter(filter => filter.id !== content.id),
        );
      }
    }
  };

  const renderSimpleBadge = () => {
    const contentArray = Array.isArray(content) ? content : [content];
    const selectedVariant = variant === 'external-company' ? 'external' : variant;
    return contentArray.map((item, index) => (
      <div
        key={`${item}-${index}`}
        className={`custom-badge badge ${selectedVariant}_${appliedTheme} ${variant === 'type' ? 'pe-2' : ''}`}
      >
        {(variant === 'type' ||
          variant === 'teacher_inline' ||
          variant === 'sdg' ||
          variant === 'external-company') && <div className="custom-badge-icon">{renderIcon(item)}</div>}
        <div className="custom-badge-text">{item}</div>
      </div>
    ));
  };

  const renderStaticBadge = () => {
    return (
      <div className={`custom-badge badge ${variant}_${appliedTheme} pe-2`}>
        <div className="custom-badge-icon">{renderIcon()}</div>
        {renderTranslatedContent()}
      </div>
    );
  };

  const renderApplicationStatusBadge = () => {
    return (
      <div className={`custom-badge badge ${getApplicationStatusBadgeType(content)}_${appliedTheme} pe-2`}>
        <div className="custom-badge-icon">{renderIcon(content)}</div>
        {renderTranslatedContent()}
      </div>
    );
  };

  const renderStatusBadge = () => {
    return (
      <OverlayTrigger
        key={`${variant}`}
        delay={{ show: 250, hide: 400 }}
        overlay={
          <Tooltip id={`tooltip-${variant}`}>
            {t('carriera.proposte_di_tesi.expires')}: {moment(content).format('DD/MM/YYYY')}
          </Tooltip>
        }
        placement="bottom"
      >
        <div className={`custom-badge badge ${variant}_${appliedTheme} pe-2`}>
          <div className="custom-badge-icon">{renderIcon()}</div>
          {renderTranslatedContent()}
        </div>
      </OverlayTrigger>
    );
  };

  const renderTruncatedBadge = () => {
    const contentArray = Array.isArray(content) ? content : [content];
    const truncatedContentArray = contentArray.slice(2);
    content = [...contentArray.slice(0, 2)];
    return (
      <>
        {renderSimpleBadge()}
        {truncatedContentArray.length > 0 && (
          <OverlayTrigger
            delay={{ show: 250, hide: 400 }}
            overlay={<Tooltip id={`tooltip-${truncatedContentArray}`}>{truncatedContentArray.join(', ')}</Tooltip>}
            placement="top"
          >
            <div className={`custom-badge badge ${variant}_${appliedTheme} pe-2 clickable truncated`}>
              <span className="custom-badge-text">{t('carriera.proposte_di_tesi.others') + '...'}</span>
            </div>
          </OverlayTrigger>
        )}
      </>
    );
  };

  const renderResetBadge = () => {
    const contentText = content?.content || null;
    return (
      <Button
        key="custom-badge-button"
        className={`custom-badge badge ${variant}_${appliedTheme} reset clickable`}
        onClick={() => {
          handleRemoveFilter();
        }}
        {...removeProps}
      >
        <div className="custom-badge-icon">{renderIcon(contentText)}</div>
        {contentText ? <span className="custom-badge-text">{contentText}</span> : renderTranslatedContent()}
        <div className="custom-badge-icon">
          <i className="fa-regular fa-circle-xmark fa-lg" />
        </div>
      </Button>
    );
  };

  const renderSingleSelectBadge = () => {
    const contentText = content?.content || null;
    const selectedVariant = variant === 'external-company' ? 'external' : variant;
    const iconKey = variant === 'language' && content?.id ? content.id : contentText;
    return (
      <Button
        key="custom-badge-button"
        className={`custom-badge badge ${selectedVariant}_${appliedTheme} reset clickable`}
      >
        <div className="custom-badge-icon">{renderIcon(iconKey)}</div>
        {contentText ? <span className="custom-badge-text">{contentText}</span> : renderTranslatedContent()}
      </Button>
    );
  };

  const renderIcon = content => {
    switch (variant) {
      case 'teacher':
      case 'teacher_inline':
        return <i className="fa-regular fa-user fa-lg" />;
      case 'keyword':
        return <i className="fa-regular fa-key fa-lg" />;
      case 'language': {
        const code = String(content || '').toLowerCase();
        const flagMap = {
          it: 'it',
          en: 'gb',
          jp: 'jp',
          es: 'es',
          fr: 'fr',
          pt: 'pt',
          zh: 'cn',
          se: 'se',
          de: 'de',
          ru: 'ru',
        };
        const flagCode = flagMap[code] || 'gb';
        return <span className={`fi fi-${flagCode}`} aria-hidden="true" />;
      }
      case 'internal':
        return <i className="fa-regular fa-building-columns fa-lg" />;
      case 'external':
      case 'external-company':
        return <i className="fa-regular fa-building-circle-arrow-right fa-lg" />;
      case 'italy':
      case 'abroad':
        return (
          <i
            className="fa-sharp-duotone fa-solid fa-earth-americas fa-lg"
            style={{
              '--fa-primary-color': 'var(--green-500)',
              '--fa-secondary-color': 'var(--lightBlue-600)',
              '--fa-secondary-opacity': '1',
            }}
          />
        );
      case 'success':
        return <i className="fa-regular fa-circle-check fa-lg" />;
      case 'warning':
        return <i className="fa-regular fa-circle-exclamation fa-lg" />;
      case 'error':
        return <i className="fa-regular fa-circle-xmark fa-lg" />;
      case 'type':
        switch (content.toLowerCase()) {
          // analisi dati
          case 'analisi dati':
          case 'data analysis':
            return <i className="fa-regular fa-chart-column fa-lg" />;
          // analitica
          case 'analitica':
          case 'analytical':
            return <i className="fa-regular fa-chart-line fa-lg" />;
          // applicativa
          case 'applicativa':
          case 'applied':
            return <i className="fa-regular fa-gear fa-lg" />;
          // compilativa
          case 'compilativa':
          case 'bibliographic':
            return <i className="fa-regular fa-pen-to-square fa-lg" />;
          // computazionale
          case 'computazionale':
          case 'computational':
            return <i className="fa-regular fa-brain fa-lg" />;
          // progettuale
          case 'progettuale':
          case 'design':
            return <i className="fa-brands fa-uncharted fa-lg" />;
          // ricerca
          case 'ricerca':
          case 'research':
            return <i className="fa-regular fa-book-atlas fa-lg" />;
          // simulativa
          case 'simulativa':
          case 'simulation':
            return <i className="fa-regular fa-chart-pie fa-lg" />;
          // sperimentale
          case 'sperimentale':
          case 'experimental':
            return <i className="fa-regular fa-flask fa-lg" />;
          // sviluppo
          case 'sviluppo':
          case 'development':
            return <i className="fa-solid fa-code fa-lg" />;
          // teorica
          case 'teorica':
          case 'theoretical':
            return <i className="fa-regular fa-book fa-lg" />;
          // numerica
          case 'numerica':
          case 'numerical':
            return <i className="fa-regular fa-calculator fa-lg" />;
          default:
            return <i className="fa-regular fa-circle-xmark fa-lg" />;
        }
      case 'sdg':
        return <i className="fa-regular fa-leaf fa-lg" />;
      case 'sorting-ASC':
        return <i className="fa-solid fa-arrow-up-short-wide fa-lg" />;
      case 'sorting-DESC':
        return <i className="fa-solid fa-arrow-down-short-wide fa-lg" />;
      case 'app_status':
        switch (content.toLowerCase()) {
          case 'pending':
            return <i className="fa-regular fa-clock fa-lg" />;
          case 'rejected':
            return <i className="fa-regular fa-circle-xmark fa-lg" />;
          case 'approved':
            return <i className="fa-regular fa-circle-check fa-lg" />;
          case 'cancelled':
            return <i className="fa-regular fa-circle-minus fa-lg" />;
          default:
            return <i className="fa-regular fa-circle-xmark fa-lg" />;
        }
      default:
        return <i className="fa-regular fa-circle-xmark fa-lg" />;
    }
  };

  const renderTranslatedContent = () => {
    switch (variant) {
      case 'internal':
        return t('carriera.proposte_di_tesi.internal_thesis');
      case 'external':
        return t('carriera.proposte_di_tesi.external_thesis');
      case 'italy':
        return t('carriera.proposte_di_tesi.italy_thesis');
      case 'abroad':
        return t('carriera.proposte_di_tesi.abroad_thesis');
      case 'success':
        return t('carriera.proposta_di_tesi.disponibile');
      case 'warning':
        return t('carriera.proposta_di_tesi.in_scadenza');
      case 'error':
        return t('carriera.proposta_di_tesi.scaduta');
      case 'app_status':
        switch (content.toLowerCase()) {
          case 'pending':
            return t('carriera.tesi.thesis_progress.pending');
          case 'approved':
            return t('carriera.tesi.thesis_progress.approved');
          case 'rejected':
            return t('carriera.tesi.thesis_progress.rejected');
          case 'cancelled':
            return t('carriera.tesi.thesis_progress.cancelled');
          default:
            return t('carriera.proposta_di_tesi.badge_errato');
        }
      default:
        return t('carriera.proposta_di_tesi.badge_errato');
    }
  };

  const isValidTypeContent = content => {
    if (Array.isArray(content)) {
      if (applyFilters) {
        return content.every(item => validTypeContent.includes(item.content.toLowerCase()));
      } else {
        return content.every(item => validTypeContent.includes(item.toLowerCase()));
      }
    }
    if (type === 'reset') {
      return validTypeContent.includes(content.content.toLowerCase());
    } else {
      return validTypeContent.includes(content.toLowerCase());
    }
  };

  if (
    !validVariants.includes(variant) ||
    (type && !validTypes.includes(type)) ||
    ([
      'teacher',
      'keyword',
      'language',
      'external-company',
      'type',
      'sorting-ASC',
      'sorting-DESC',
      'status',
      'success',
      'warning',
      'error',
      'app_status',
      'recommended',
    ].includes(variant) &&
      !content) ||
    (variant === 'type' && !isValidTypeContent(content))
  ) {
    return (
      <div className="custom-badge-container">
        <div className={`custom-badge badge error_${appliedTheme}`}>
          <div className="custom-badge-icon">
            <i className="fa-regular fa-circle-xmark fa-lg" />
          </div>
          <div className="custom-badge-text">{t('carriera.proposta_di_tesi.badge_errato')}</div>
        </div>
      </div>
    );
  }

  const renderBadge = () => {
    switch (type) {
      case 'reset':
        return <div className="custom-badge-container">{renderResetBadge()}</div>;
      case 'single_select':
        return <div className="custom-badge-container">{renderSingleSelectBadge()}</div>;
      case 'truncated':
        return <div className="custom-badge-container">{renderTruncatedBadge()}</div>;
      default:
        switch (variant) {
          case 'internal':
          case 'external':
          case 'italy':
          case 'abroad':
            return <div className="custom-badge-container">{renderStaticBadge()}</div>;
          case 'status': {
            variant = getStatusBadgeType(content);
            return <div className="custom-badge-container">{renderStatusBadge()}</div>;
          }
          case 'app_status':
            return <div className="custom-badge-container">{renderApplicationStatusBadge()}</div>;
          default:
            return <div className="custom-badge-container">{renderSimpleBadge()}</div>;
        }
    }
  };

  return <>{renderBadge()}</>;
}

const getStatusBadgeType = content => {
  const start = moment();
  const end = moment(content);
  const remainingTime = end.diff(start, 'seconds') / 86400;
  if (remainingTime > 14) return 'success';
  if (remainingTime <= 14 && remainingTime > 0) return 'warning';
  return 'error';
};

const getApplicationStatusBadgeType = content => {
  switch (content.toLowerCase()) {
    case 'pending':
      return 'warning';
    case 'rejected':
      return 'error';
    case 'approved':
      return 'success';
    case 'cancelled':
      return 'error';
  }
};

CustomBadge.propTypes = {
  variant: PropTypes.string.isRequired,
  content: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.shape({
      content: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.node]),
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.shape({
          content: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.node]),
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        }),
      ]),
    ),
  ]),
  type: PropTypes.oneOf(validTypes),
  filters: PropTypes.object,
  applyFilters: PropTypes.func,
  removeProps: PropTypes.object,
  resetSorting: PropTypes.func,
};
