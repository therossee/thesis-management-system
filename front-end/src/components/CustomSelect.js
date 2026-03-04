import React, { useMemo, useState } from 'react';

import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

import PropTypes from 'prop-types';

import '../styles/custom-select.css';
import CustomBadge from './CustomBadge';

const OptionWithEmail = props => {
  const { data, innerProps, isFocused } = props;
  return (
    <div
      {...innerProps}
      style={{
        backgroundColor: isFocused ? 'var(--dropdown-hover)' : 'inherit',
        padding: '8px 12px',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontWeight: 'bold', color: 'var(--text-800)', fontFamily: 'var(--font-family)' }}>{data.label}</div>
      {data.email && (
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-700)', fontFamily: 'var(--font-family)' }}>
          {data.email}
        </div>
      )}
    </div>
  );
};

OptionWithEmail.propTypes = {
  data: PropTypes.shape({
    label: PropTypes.string.isRequired,
    email: PropTypes.string,
  }).isRequired,
  innerProps: PropTypes.object.isRequired,
  isFocused: PropTypes.bool.isRequired,
};

const OptionBasic = props => {
  const { data, innerProps, isFocused } = props;
  return (
    <div
      {...innerProps}
      style={{
        backgroundColor: isFocused ? 'var(--dropdown-hover)' : 'inherit',
        padding: '8px 12px',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontWeight: 'bold', color: 'var(--text-800)', fontFamily: 'var(--font-family)' }}>{data.label}</div>
    </div>
  );
};

OptionBasic.propTypes = {
  data: PropTypes.shape({
    label: PropTypes.string.isRequired,
  }).isRequired,
  innerProps: PropTypes.object.isRequired,
  isFocused: PropTypes.bool.isRequired,
};

const CustomMultiValue = ({ data, removeProps, badgeVariant }) => (
  <CustomBadge
    variant={badgeVariant}
    type="reset"
    content={{ id: data.value, content: data.label }}
    removeProps={removeProps}
  />
);

CustomMultiValue.propTypes = {
  data: PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  removeProps: PropTypes.object.isRequired,
  badgeVariant: PropTypes.string.isRequired,
};

const CustomSingleValue = ({ data, badgeVariant }) => (
  <CustomBadge variant={badgeVariant} type="single_select" content={{ id: data.value, content: data.label }} />
);

CustomSingleValue.propTypes = {
  data: PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  badgeVariant: PropTypes.string.isRequired,
};

const CustomCompanySingleValue = ({ data }) => (
  <CustomBadge variant="external-company" type="single_select" content={{ content: data.label, id: data.value }} />
);

CustomCompanySingleValue.propTypes = {
  data: PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
};

const NoIndicatorSeparator = () => null;

const resolveIsClearable = (isClearable, fallbackValue) => {
  return typeof isClearable === 'boolean' ? isClearable : fallbackValue;
};

const buildClassName = (baseClassName, className, error) => {
  return `${baseClassName} ${className || ''} ${error ? 'is-invalid' : ''}`;
};

const filterByLabelOrEmail = (candidate, input) => {
  const label = candidate.data.label.toLowerCase();
  const email = candidate.data.email ? candidate.data.email.toLowerCase() : '';
  const inputLower = input.toLowerCase();
  return label.includes(inputLower) || email.includes(inputLower);
};

const handleBoundedSelectionChange = (value, isMulti, maxMulti, setSelected) => {
  if (!isMulti) {
    setSelected(value);
    return;
  }

  if (!value || value.length <= maxMulti) {
    setSelected(value);
  }
};

const renderKeywordSelect = ({
  isDisabled,
  options,
  isMenuOpen,
  placeholder,
  selected,
  setSelected,
  onMenuOpen,
  onMenuClose,
  error,
  commonStyles,
  formatCreateLabel,
  menuPortalTarget,
}) => {
  return (
    <CreatableSelect
      isMulti={true}
      isClearable={false}
      isDisabled={isDisabled}
      options={options}
      components={{
        MultiValue: props => <CustomMultiValue {...props} badgeVariant="keyword" />,
        Option: OptionBasic,
        IndicatorSeparator: NoIndicatorSeparator,
      }}
      placeholder={isMenuOpen ? '' : placeholder}
      value={selected}
      onChange={setSelected}
      onMenuOpen={onMenuOpen}
      onMenuClose={onMenuClose}
      className={buildClassName('multi-select', '', error)}
      classNamePrefix="select"
      styles={commonStyles}
      formatCreateLabel={formatCreateLabel || (inputValue => `Aggiungi "${inputValue}"`)}
      menuPortalTarget={menuPortalTarget}
      menuPosition="fixed"
      menuShouldScrollIntoView={false}
    />
  );
};

const renderCompanySelect = ({
  isClearable,
  isDisabled,
  selected,
  options,
  isMenuOpen,
  placeholder,
  setSelected,
  onMenuOpen,
  onMenuClose,
  className,
  error,
  commonStyles,
}) => {
  return (
    <Select
      isMulti={false}
      isClearable={resolveIsClearable(isClearable, true)}
      isDisabled={isDisabled}
      components={{
        SingleValue: CustomCompanySingleValue,
        IndicatorSeparator: NoIndicatorSeparator,
      }}
      name="companies"
      defaultValue={selected}
      options={options}
      placeholder={isMenuOpen ? '' : placeholder}
      value={selected}
      onChange={setSelected}
      onMenuOpen={onMenuOpen}
      onMenuClose={onMenuClose}
      className={buildClassName('single-select', className, error)}
      classNamePrefix="select"
      styles={commonStyles}
    />
  );
};

const renderSdgSelect = ({
  isMulti,
  isClearable,
  isDisabled,
  selected,
  options,
  isMenuOpen,
  placeholder,
  maxMulti,
  setSelected,
  onMenuOpen,
  onMenuClose,
  className,
  error,
  commonStyles,
}) => {
  return (
    <Select
      isMulti={!!isMulti}
      isClearable={resolveIsClearable(isClearable, !isMulti)}
      isDisabled={isDisabled}
      components={{
        SingleValue: props => <CustomSingleValue {...props} badgeVariant="sdg" />,
        MultiValue: props => <CustomMultiValue {...props} badgeVariant="sdg" />,
        Option: OptionBasic,
        IndicatorSeparator: NoIndicatorSeparator,
      }}
      name={isMulti ? 'sdgs' : 'sdg'}
      defaultValue={selected}
      options={options}
      placeholder={isMenuOpen ? '' : placeholder}
      value={selected}
      onChange={value => handleBoundedSelectionChange(value, isMulti, maxMulti, setSelected)}
      onMenuOpen={onMenuOpen}
      onMenuClose={onMenuClose}
      className={buildClassName('multi-select', className, error)}
      classNamePrefix="select"
      styles={commonStyles}
      menuPortalTarget={typeof document === 'undefined' ? null : document.body}
      menuPosition="fixed"
      menuPlacement="top"
      menuShouldScrollIntoView={false}
    />
  );
};

const renderSupervisorSelect = ({
  isMulti,
  isClearable,
  isDisabled,
  selected,
  options,
  isMenuOpen,
  placeholder,
  maxMulti,
  setSelected,
  onMenuOpen,
  onMenuClose,
  badgeVariant,
  className,
  error,
  commonStyles,
  menuOutside,
  menuPortalTarget,
}) => {
  return (
    <Select
      isMulti={!!isMulti}
      isClearable={resolveIsClearable(isClearable, !isMulti)}
      isDisabled={isDisabled}
      components={{
        SingleValue: props => <CustomSingleValue {...props} badgeVariant={badgeVariant} />,
        MultiValue: props => <CustomMultiValue {...props} badgeVariant={badgeVariant} />,
        Option: OptionWithEmail,
        IndicatorSeparator: NoIndicatorSeparator,
      }}
      name={isMulti ? 'supervisors' : 'supervisor'}
      defaultValue={selected}
      options={options}
      placeholder={isMenuOpen ? '' : placeholder}
      value={selected}
      onChange={value => handleBoundedSelectionChange(value, isMulti, maxMulti, setSelected)}
      onMenuOpen={onMenuOpen}
      onMenuClose={onMenuClose}
      className={buildClassName('multi-select', className, error)}
      classNamePrefix="select"
      filterOption={filterByLabelOrEmail}
      styles={commonStyles}
      menuPortalTarget={menuOutside ? menuPortalTarget : undefined}
      menuPosition={menuOutside ? 'fixed' : 'absolute'}
      menuShouldScrollIntoView={menuOutside ? false : undefined}
    />
  );
};

export default function CustomSelect({
  mode,
  options = [],
  selected,
  setSelected,
  isMulti,
  placeholder,
  error,
  isDisabled = false,
  isClearable,
  badgeVariant = 'teacher',
  className,
  formatCreateLabel,
  maxMulti = 4,
  menuOutside = false,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuPortalTarget = typeof document === 'undefined' ? null : document.body;
  const onMenuOpen = () => setIsMenuOpen(true);
  const onMenuClose = () => setIsMenuOpen(false);

  const commonStyles = useMemo(
    () => ({
      option: (basicStyles, state) => ({
        ...basicStyles,
        backgroundColor: state.isFocused ? 'var(--dropdown-hover)' : basicStyles.backgroundColor,
      }),
      placeholder: basicStyles => ({ ...basicStyles, color: 'var(--section-description)' }),
    }),
    [],
  );

  const commonParams = {
    isDisabled,
    options,
    isMenuOpen,
    placeholder,
    selected,
    setSelected,
    onMenuOpen,
    onMenuClose,
    error,
    commonStyles,
    className,
    isClearable,
    isMulti,
    maxMulti,
  };

  const byMode = {
    keyword: renderKeywordSelect({
      ...commonParams,
      formatCreateLabel,
      menuPortalTarget,
    }),
    company: renderCompanySelect(commonParams),
    sdg: renderSdgSelect(commonParams),
    supervisor: renderSupervisorSelect({
      ...commonParams,
      badgeVariant,
      menuOutside,
      menuPortalTarget,
    }),
  };

  return <div>{byMode[mode] || byMode.supervisor}</div>;
}

CustomSelect.propTypes = {
  mode: PropTypes.oneOf(['supervisor', 'keyword', 'company', 'sdg']).isRequired,
  options: PropTypes.array,
  selected: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  setSelected: PropTypes.func.isRequired,
  isMulti: PropTypes.bool,
  placeholder: PropTypes.string,
  error: PropTypes.bool,
  isDisabled: PropTypes.bool,
  isClearable: PropTypes.bool,
  badgeVariant: PropTypes.string,
  className: PropTypes.string,
  formatCreateLabel: PropTypes.func,
  maxMulti: PropTypes.number,
  menuOutside: PropTypes.bool,
};
