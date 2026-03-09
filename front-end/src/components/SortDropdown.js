import React, { useContext, useEffect, useState } from 'react';

import { Badge, Dropdown, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import {
  faArrowDownShortWide,
  faArrowUpShortWide,
  faCheck,
  faChevronDown,
  faChevronUp,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';

import { ThemeContext } from '../App';
import '../styles/custom-dropdown.css';
import { getSystemTheme } from '../utils/utils';
import CustomMenu from './CustomMenu';
import CustomToggle from './CustomToggle';

export default function SortDropdown({ sorting, applySorting }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSorting, setSelectedSorting] = useState(sorting || '');
  const sortFields = ['topic', 'description', 'creationDate', 'expirationDate'];
  const sortI18nKeyByField = {
    topic: 'topic',
    description: 'description',
    creationDate: 'creation_date',
    expirationDate: 'expiration_date',
  };

  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;

  useEffect(() => {
    // Sync sorting with the parent component
    setSelectedSorting(sorting);
  }, [sorting]);

  const handleApply = sortBy => {
    const newSorting = { sortBy, orderBy: selectedSorting.orderBy };
    if (newSorting.sortBy === selectedSorting.sortBy) {
      // Remove sorting if it's already applied
      newSorting.sortBy = 'id';
    }
    setSelectedSorting(newSorting);
    setIsOpen(false);
    applySorting(newSorting, sorting);
  };

  const handleChangeOrderExternal = order => {
    setSelectedSorting({ ...sorting, orderBy: order });
    applySorting({ ...sorting, orderBy: order }, sorting);
  };

  const handleToggle = isOpen => {
    setIsOpen(isOpen);
    if (!isOpen) {
      setSelectedSorting(sorting);
    }
  };

  const sortOrderTooltip = `${t('carriera.proposte_di_tesi.sort_order_label')}: ${t(
    selectedSorting.orderBy === 'ASC'
      ? 'carriera.proposte_di_tesi.sort_order_ascending'
      : 'carriera.proposte_di_tesi.sort_order_descending',
  )}`;

  return (
    <Dropdown onToggle={handleToggle} show={isOpen} autoClose="outside" id="dropdown-sort">
      <Dropdown.Toggle as={CustomToggle} className={`btn-${appliedTheme}  custom-dropdown-toggle`}>
        <OverlayTrigger placement="top" overlay={<Tooltip id="sort-order-tooltip">{sortOrderTooltip}</Tooltip>}>
          {selectedSorting.orderBy === 'ASC' ? (
            <FontAwesomeIcon
              icon={faArrowUpShortWide}
              className="sort-order-icon"
              onClick={e => {
                e.stopPropagation();
                handleChangeOrderExternal('DESC');
              }}
            />
          ) : (
            <FontAwesomeIcon
              icon={faArrowDownShortWide}
              className="sort-order-icon"
              onClick={e => {
                e.stopPropagation();
                handleChangeOrderExternal('ASC');
              }}
            />
          )}
        </OverlayTrigger>
        {t('carriera.proposte_di_tesi.order')}
        {/* Display the count of applied sorting */}
        {sorting.sortBy !== 'id' && <Badge className={`top-0 squared-badge-${appliedTheme}`}>1</Badge>}
        {isOpen ? <FontAwesomeIcon icon={faChevronUp} /> : <FontAwesomeIcon icon={faChevronDown} />}
      </Dropdown.Toggle>
      <Dropdown.Menu as={CustomMenu} key={selectedSorting} className="custom-dropdown-menu">
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {sortFields.map(sortBy => (
            <Dropdown.Item className="custom-dropdown-item" key={'sort' + sortBy} onClick={() => handleApply(sortBy)}>
              <div className="d-flex align-items-center w-100">
                <div style={{ width: '1.5em' }}>
                  {selectedSorting.sortBy === sortBy && <FontAwesomeIcon icon={faCheck} />}
                </div>
                {t(`carriera.proposte_di_tesi.${sortI18nKeyByField[sortBy] || sortBy}`)}
              </div>
            </Dropdown.Item>
          ))}
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}

SortDropdown.propTypes = {
  applySorting: PropTypes.func.isRequired,
  sorting: PropTypes.object.isRequired,
};
