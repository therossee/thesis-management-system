import React, { createContext, useContext } from 'react';

import PropTypes from 'prop-types';

const ConclusionRequestContext = createContext(null);

export function ConclusionRequestProvider({ value, children }) {
  return <ConclusionRequestContext.Provider value={value}>{children}</ConclusionRequestContext.Provider>;
}

export function useConclusionRequest() {
  const context = useContext(ConclusionRequestContext);
  if (!context) {
    throw new Error('useConclusionRequest must be used inside ConclusionRequestProvider');
  }
  return context;
}

ConclusionRequestProvider.propTypes = {
  value: PropTypes.object.isRequired,
  children: PropTypes.node.isRequired,
};
