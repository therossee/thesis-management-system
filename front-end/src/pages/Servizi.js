import React from 'react';

import { Container, Row } from 'react-bootstrap';

import BaseCard from '../components/BaseCard';
import CustomBreadcrumb from '../components/CustomBreadcrumb';

export default function Servizi() {
  return (
    <>
      <CustomBreadcrumb />
      <Container className="card-container">
        <Row>
          <BaseCard
            icon={<i className="fa-solid fa-gears fa-lg pe-2" />}
            service="Test"
            description="Testing funzionalità relative alla parte studente del portale di gestione tesi."
            servicePath={'/servizi/test'}
          />
        </Row>
      </Container>
    </>
  );
}
