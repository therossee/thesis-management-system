import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { useTranslation } from 'react-i18next';

import { ThemeContext } from '../App';
import { getSystemTheme } from '../utils/utils';
import API from '../API';
import CustomBadge from './CustomBadge';

export default function CompanySelect({ selected, setSelected, isMulti, placeholder }) {
    const { theme } = useContext(ThemeContext);
    const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;
    const { i18n, t } = useTranslation();

    const [options, setOptions] = useState([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        API.getCompanies().then(data => {
            setOptions(data.map(item => ({
                value: item.id,
                label: item.corporateName,
                variant: 'external-company',
            })));
        });
    }, [i18n.language]);

    return (
        <div>
            <Select
                isMulti={isMulti}
                isClearable={true}
                components={{ SingleValue: CustomSingleValue, IndicatorSeparator: () => null }}
                name="companies"
                defaultValue={selected}
                options={options}
                placeholder={isMenuOpen ? '' : placeholder}
                value={selected}
                onChange={selected => setSelected(selected)}
                onMenuOpen={() => setIsMenuOpen(true)}
                onMenuClose={() => setIsMenuOpen(false)}
                className="multi-select"
                classNamePrefix="select"
                styles={{
                    option: (basicStyles, state) => ({
                        ...basicStyles,
                        backgroundColor: state.isFocused ? 'var(--dropdown-hover)' : basicStyles.backgroundColor,
                    }),
                    placeholder: basicStyles => ({ ...basicStyles, color: 'var(--section-description)' }),
                }}
            />
        </div>
    );
}

const CustomSingleValue = ({ data }) => (
    <CustomBadge
        variant="external-company"
        type="single_select"
        content={{ content: data.label, id: data.value }}
    />
);

CustomSingleValue.propTypes = {
    data: PropTypes.object.isRequired,
};

CompanySelect.propTypes = {
    selected: PropTypes.array,
    setSelected: PropTypes.func.isRequired,
    isMulti: PropTypes.bool,
    placeholder: PropTypes.string,
};
