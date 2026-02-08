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
  const menuPortalTarget = typeof document !== 'undefined' ? document.body : null;

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

  const filterOption = (candidate, input) => {
    const label = candidate.data.label.toLowerCase();
    const email = candidate.data.email ? candidate.data.email.toLowerCase() : '';
    const inputLower = input.toLowerCase();
    return label.includes(inputLower) || email.includes(inputLower);
  };

  if (mode === 'keyword') {
    return (
      <div>
        <CreatableSelect
          isMulti={true}
          isClearable={false}
          isDisabled={isDisabled}
          options={options}
          components={{
            MultiValue: props => <CustomMultiValue {...props} badgeVariant="keyword" />,
            Option: OptionBasic,
            IndicatorSeparator: () => null,
          }}
          placeholder={isMenuOpen ? '' : placeholder}
          value={selected}
          onChange={setSelected}
          onMenuOpen={() => setIsMenuOpen(true)}
          onMenuClose={() => setIsMenuOpen(false)}
          className={`multi-select ${error ? 'is-invalid' : ''}`}
          classNamePrefix="select"
          styles={commonStyles}
          formatCreateLabel={formatCreateLabel || (inputValue => `Aggiungi "${inputValue}"`)}
          menuPortalTarget={menuPortalTarget}
          menuPosition="fixed"
          menuShouldScrollIntoView={false}
        />
      </div>
    );
  }

  if (mode === 'company') {
    return (
      <div>
        <Select
          isMulti={false}
          isClearable={isClearable !== undefined ? isClearable : true}
          isDisabled={isDisabled}
          components={{
            SingleValue: CustomCompanySingleValue,
            IndicatorSeparator: () => null,
          }}
          name="companies"
          defaultValue={selected}
          options={options}
          placeholder={isMenuOpen ? '' : placeholder}
          value={selected}
          onChange={value => setSelected(value)}
          onMenuOpen={() => setIsMenuOpen(true)}
          onMenuClose={() => setIsMenuOpen(false)}
          className={`single-select ${className || ''} ${error ? 'is-invalid' : ''}`}
          classNamePrefix="select"
          styles={commonStyles}
        />
      </div>
    );
  }

  if (mode === 'sdg') {
    return (
      <div>
        <Select
          isMulti={!!isMulti}
          isClearable={isClearable !== undefined ? isClearable : !isMulti}
          isDisabled={isDisabled}
          components={{
            SingleValue: props => <CustomSingleValue {...props} badgeVariant="sdg" />,
            MultiValue: props => <CustomMultiValue {...props} badgeVariant="sdg" />,
            Option: OptionBasic,
            IndicatorSeparator: () => null,
          }}
          name={isMulti ? 'sdgs' : 'sdg'}
          defaultValue={selected}
          options={options}
          placeholder={isMenuOpen ? '' : placeholder}
          value={selected}
          onChange={value => {
            if (isMulti) {
              if (!value || value.length <= maxMulti) setSelected(value);
            } else {
              setSelected(value);
            }
          }}
          onMenuOpen={() => setIsMenuOpen(true)}
          onMenuClose={() => setIsMenuOpen(false)}
          className={`multi-select ${className || ''} ${error ? 'is-invalid' : ''}`}
          classNamePrefix="select"
          styles={commonStyles}
          menuPortalTarget={menuPortalTarget}
          menuPosition="fixed"
          menuPlacement="top"
          menuShouldScrollIntoView={false}
        />
      </div>
    );
  }

  return (
    <div>
      <Select
        isMulti={!!isMulti}
        isClearable={isClearable !== undefined ? isClearable : !isMulti}
        isDisabled={isDisabled}
        components={{
          SingleValue: props => <CustomSingleValue {...props} badgeVariant={badgeVariant} />,
          MultiValue: props => <CustomMultiValue {...props} badgeVariant={badgeVariant} />,
          Option: OptionWithEmail,
          IndicatorSeparator: () => null,
        }}
        name={isMulti ? 'supervisors' : 'supervisor'}
        defaultValue={selected}
        options={options}
        placeholder={isMenuOpen ? '' : placeholder}
        value={selected}
        onChange={value => {
          if (isMulti) {
            if (!value || value.length <= maxMulti) setSelected(value);
          } else {
            setSelected(value);
          }
        }}
        onMenuOpen={() => setIsMenuOpen(true)}
        onMenuClose={() => setIsMenuOpen(false)}
        className={`multi-select ${className || ''} ${error ? 'is-invalid' : ''}`}
        classNamePrefix="select"
        filterOption={filterOption}
        styles={commonStyles}
        menuPortalTarget={menuOutside ? menuPortalTarget : undefined}
        menuPosition={menuOutside ? 'fixed' : 'absolute'}
        menuShouldScrollIntoView={menuOutside ? false : undefined}
      />
    </div>
  );
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
