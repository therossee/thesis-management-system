import React, { useContext } from 'react';

import { Button, Card } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaRegCircleQuestion } from 'react-icons/fa6';

import { ThemeContext } from '../App';
import { getSystemTheme } from '../utils/utils';

export default function ThesisNotFound() {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const appliedTheme = theme === 'auto' ? getSystemTheme() : theme;
  return (
    <Card className="mt-3 roundCard">
      <Card.Body className="d-flex flex-column align-items-center my-4">
        <div className="pol-headline pol-headline--with-bar" style={{ color: 'var(--primary)' }}>
          <h3 className="bold-weight">{t('carriera.tesi.not_found')}</h3>
        </div>
        <FaRegCircleQuestion size={100} style={{ color: 'var(--primary)' }} strokeWidth={1} />
        <div className="mb-3 mt-2 text-center" style={{ color: 'var(--text)' }}>
          <p> {t('carriera.tesi.message_not_found')} </p>
        </div>
        <Button className={`btn-${appliedTheme}`} size="sm" onClick={() => globalThis.history.back()}>
          <FaArrowLeft size={16} />
          {t('carriera.richiesta_tesi.go_back')}{' '}
        </Button>
      </Card.Body>
    </Card>
  );
}
