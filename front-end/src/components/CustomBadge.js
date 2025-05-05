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
  'keyword',
  'internal',
  'external',
  'italy',
  'abroad',
  'type',
  'sorting-ASC',
  'sorting-DESC',
  'status',
  'warning',
  'success',
  'error',
];
const validTypes = ['reset', 'truncated'];
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
    return contentArray.map((item, index) => (
      <div
        key={`${item}-${index}`}
        className={`custom-badge badge ${variant}_${appliedTheme} ${variant === 'type' ? 'pe-2' : ''}`}
      >
        {variant === 'type' && <div className="custom-badge-icon">{renderIcon(item)}</div>}
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

  const renderPositionBadge = () => {
    return (
      <OverlayTrigger
        key={`${variant}`}
        delay={{ show: 250, hide: 400 }}
        overlay={
          <Tooltip id={`tooltip-${variant}`}>
            {variant === 'abroad'
              ? t('carriera.proposte_di_tesi.abroad_thesis')
              : t('carriera.proposte_di_tesi.italy_thesis')}
          </Tooltip>
        }
        placement="bottom"
      >
        {variant === 'abroad' ? (
          <i
            className="fa-sharp-duotone fa-solid fa-earth-americas fa-xl"
            style={{
              '--fa-primary-color': 'var(--green-500)',
              '--fa-secondary-color': 'var(--lightBlue-600)',
              '--fa-secondary-opacity': '1',
              height: '12px',
            }}
          />
        ) : (
          <svg style={{borderRadius: '3px', width: '25px', height: '25px'}}
          class="icon-italy" version="1.1" id="Layer_1" 
          xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" 
          viewBox="0 0 230 260" enable-background="new 0 0 230 260" space="preserve">
            <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
            <g id="SVGRepo_iconCarrier"> <path d="M174.276,218.293l-13.415,2.241l-14.306,4.967l-9.421,1.646l-12.335-4.724l-2.349,3.806l-5.101-1.862l-5.642,8.233 l4.886,5.992l4.724-0.378l20.757,10.986l2.915-0.486l6.155,2.538l3.401,5.074L165.126,258l6.235-8.26l-5.425-8.476l2.618-11.58 L174.276,218.293z M53.295,150.838l-5.912-4.291l-8.017,8.151l-13.064,5.264l4.912,8.071l0.783,32.715l3.293,4.13l4.778,1.971 l4.454-8.449l9.42,1.808l1.674-10.365l1.566-13.55l-2.052-3.536l2.268-11.04L53.295,150.838z M216.547,153.106l-40.894-16.736 l3.509-8.88l-3.482-3.617l-16.654,1.619l-19.678-13.955l-10.77-23.322l-24.024-17.95l-2.51-10.069l2.078-4.237l-1.7-9.34 l21.702-16.843l0.054-0.513l-4.616-12.012l5.021-6.073L103.42,8.262l-5.965-5.911L80.341,2l-2.645,4.805l-9.474-2.214l0.108,8.044 l-4.562-1.943l-5.048,6.505l-14.468,6.505l-2.888,7.342l-8.449-10.743l-10.257,7.801l-5.426-1.215L4.06,30.558l5.101,14.496 l-7.018,8.205l5.453,5.615l-3.59,4.076l3.185,7.801l11.85,4.076l0.027,7.585l8.017-3.671l9.177-11.094l10.905,0.728l18.922,13.416 l0.675,5.992l7.538,17.873l45.908,40l13.334-0.945l5.507,7.342l9.366,7.369l5.318-1.673l5.237,6.748l-1.431,4.049l8.8,5.425 l5.83-1.511l13.55,30.448l-7.018,4.372l1.674,3.806l-5.021,10.906l3.05,4.021l6.56-1.106l1.187-5.021l7.423-8.854l-1.241-6.451 l6.559-5.803l4.265,0.405l-0.081-12.957l-11.718-7.866l7.021-20.126l9.475,4.616l4.912-0.216l6.937,9.07l6.101,2.321l2.051-8.368 L216.547,153.106z"></path> </g>
          </svg>
        )}
      </OverlayTrigger>
    );
  };

  const renderIcon = content => {
    switch (variant) {
      case 'teacher':
        return <i className="fa-regular fa-user fa-lg" />;
      case 'keyword':
        return <i className="fa-regular fa-key fa-lg" />;
      case 'internal':
        return <i className="fa-regular fa-building-columns fa-lg" />;
      case 'external':
        return <i className="fa-regular fa-building-circle-arrow-right fa-lg" />;
      case 'italy':
        return (
          <svg style={{borderRadius: '3px', width: '12px', height: '12px'}}
          class="icon-italy-badge" version="1.1" id="Layer_1"
          xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" 
          viewBox="0 0 230 260" enable-background="new 0 0 230 260" space="preserve">
            <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
            <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
            <g id="SVGRepo_iconCarrier"> <path d="M174.276,218.293l-13.415,2.241l-14.306,4.967l-9.421,1.646l-12.335-4.724l-2.349,3.806l-5.101-1.862l-5.642,8.233 l4.886,5.992l4.724-0.378l20.757,10.986l2.915-0.486l6.155,2.538l3.401,5.074L165.126,258l6.235-8.26l-5.425-8.476l2.618-11.58 L174.276,218.293z M53.295,150.838l-5.912-4.291l-8.017,8.151l-13.064,5.264l4.912,8.071l0.783,32.715l3.293,4.13l4.778,1.971 l4.454-8.449l9.42,1.808l1.674-10.365l1.566-13.55l-2.052-3.536l2.268-11.04L53.295,150.838z M216.547,153.106l-40.894-16.736 l3.509-8.88l-3.482-3.617l-16.654,1.619l-19.678-13.955l-10.77-23.322l-24.024-17.95l-2.51-10.069l2.078-4.237l-1.7-9.34 l21.702-16.843l0.054-0.513l-4.616-12.012l5.021-6.073L103.42,8.262l-5.965-5.911L80.341,2l-2.645,4.805l-9.474-2.214l0.108,8.044 l-4.562-1.943l-5.048,6.505l-14.468,6.505l-2.888,7.342l-8.449-10.743l-10.257,7.801l-5.426-1.215L4.06,30.558l5.101,14.496 l-7.018,8.205l5.453,5.615l-3.59,4.076l3.185,7.801l11.85,4.076l0.027,7.585l8.017-3.671l9.177-11.094l10.905,0.728l18.922,13.416 l0.675,5.992l7.538,17.873l45.908,40l13.334-0.945l5.507,7.342l9.366,7.369l5.318-1.673l5.237,6.748l-1.431,4.049l8.8,5.425 l5.83-1.511l13.55,30.448l-7.018,4.372l1.674,3.806l-5.021,10.906l3.05,4.021l6.56-1.106l1.187-5.021l7.423-8.854l-1.241-6.451 l6.559-5.803l4.265,0.405l-0.081-12.957l-11.718-7.866l7.021-20.126l9.475,4.616l4.912-0.216l6.937,9.07l6.101,2.321l2.051-8.368 L216.547,153.106z"></path> </g>
          </svg>
        );
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
      case 'sorting-ASC':
        return <i className="fa-solid fa-arrow-up-short-wide fa-lg" />;
      case 'sorting-DESC':
        return <i className="fa-solid fa-arrow-down-short-wide fa-lg" />;
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
    (['teacher', 'keyword', 'type', 'sorting-ASC', 'sorting-DESC', 'status', 'success', 'warning', 'error'].includes(
      variant,
    ) &&
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
      case 'truncated':
        return <div className="custom-badge-container">{renderTruncatedBadge()}</div>;
      default:
        switch (variant) {
          case 'italy':
          case 'abroad':
            return renderPositionBadge();
          case 'internal':
          case 'external':
            return <div className="custom-badge-container">{renderStaticBadge()}</div>;
          case 'status': {
            variant = getStatusBadgeType(content);
            return <div className="custom-badge-container">{renderStaticBadge()}</div>;
          }
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

CustomBadge.propTypes = {
  variant: PropTypes.string.isRequired,
  content: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({ content: PropTypes.string, id: PropTypes.number }),
    PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.string, PropTypes.shape({ content: PropTypes.string, id: PropTypes.number })]),
    ),
  ]),
  type: PropTypes.oneOf(validTypes),
  filters: PropTypes.object,
  applyFilters: PropTypes.func,
  removeProps: PropTypes.object,
  resetSorting: PropTypes.func,
};
