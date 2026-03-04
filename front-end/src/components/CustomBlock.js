import React, { useEffect, useRef, useState } from 'react';

import { useTranslation } from 'react-i18next';

import PropTypes from 'prop-types';

function CustomBlock({ icon, title, children, ignoreMoreLines }) {
  const { t } = useTranslation();
  const [moreLines, setMoreLines] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (ignoreMoreLines) {
      return;
    }
    const element = contentRef.current;
    if (element) {
      const computedStyle = globalThis.getComputedStyle(element);
      const lineHeight = Number.parseFloat(computedStyle.lineHeight);
      const lines = element.offsetHeight / lineHeight;

      setMoreLines(lines > 1);
    }
  }, [children, ignoreMoreLines]);

  return (
    <div className={moreLines ? 'text-container' : 'info-container mb-3'}>
      <div className={`title-container ${moreLines ? 'pb-1' : ''}`}>
        {icon && <i className={`fa-regular fa-${icon} fa-fw`} />}
        {`${t(title)}:`}
      </div>
      <div ref={contentRef} className={`info-detail ${moreLines ? 'aligned mb-3' : ''}`}>
        {children}
      </div>
    </div>
  );
}

CustomBlock.propTypes = {
  icon: PropTypes.string,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  ignoreMoreLines: PropTypes.bool,
};

export default CustomBlock;
