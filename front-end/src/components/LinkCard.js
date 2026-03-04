import React from 'react';

import { Card } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import PropTypes from 'prop-types';

import InfoTooltip from './InfoTooltip';

function LinkBlock({ icon, title, link }) {
  const { t } = useTranslation();

  return (
    <div className="link-container mb-3">
      {icon && <i className={`fa-regular fa-${icon} fa-fw`} />}
      <a href={t(link)} target="_blank" rel="noopener noreferrer">{`${t(title)}`}</a>
    </div>
  );
}

export default function LinkCard() {
  const { t } = useTranslation();
  return (
    <Card className="mb-3 roundCard py-2 ">
      <Card.Header className="border-0 d-flex align-items-center">
        <h3 className="thesis-topic mb-0">
          <i className="fa-regular fa-book fa-sm pe-2" />
          {t('carriera.tesi.utilities.title')}
        </h3>
        <InfoTooltip tooltipText={t('carriera.tesi.utilities.title')} placement="right" id="thesis-utilities-tooltip" />
      </Card.Header>
      <Card.Body className="pt-2 pb-0">
        <LinkBlock
          icon="copyright"
          title="carriera.tesi.utilities.copyright"
          link="carriera.tesi.utilities.copyright_link"
        />
        <LinkBlock
          icon="file-lines"
          title="carriera.tesi.utilities.thesis_template"
          link="https://www.overleaf.com/latex/templates/politecnico-di-torino-thesis-template/cmpmxftwvvbr"
        />
        <LinkBlock
          icon="file-pdf"
          title="carriera.tesi.utilities.pdfa_converter"
          link="carriera.tesi.utilities.pdfa_converter_link"
        />
        <LinkBlock
          icon="file-word"
          title="carriera.tesi.utilities.thesis_cover_word"
          link="carriera.tesi.utilities.thesis_cover_word_link"
        />
        <LinkBlock icon="file-image" title="carriera.tesi.utilities.logo" link="carriera.tesi.utilities.logo_link" />
        <LinkBlock
          icon="link"
          title="carriera.tesi.utilities.plagiarism"
          link="carriera.tesi.utilities.plagiarism_link"
        />
      </Card.Body>
    </Card>
  );
}

LinkBlock.propTypes = {
  icon: PropTypes.string,
  title: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
};
