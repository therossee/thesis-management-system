import axios from 'axios';

// API URL Endpoint
const URL = 'http://localhost:3001/api';

/****** User APIs ******/

async function getStudents() {
  try {
    const response = await axios.get(`${URL}/students`);
    return response.data;
  } catch (error) {
    console.error('Error fetching students:', error);
  }
}

async function getLoggedStudent() {
  try {
    const response = await axios.get(`${URL}/students/logged-student`);
    return response.data;
  } catch (error) {
    console.error('Error fetching logged student:', error);
  }
}

async function updateLoggedStudent(student) {
  try {
    const response = await axios.put(`${URL}/students/logged-student`, { student_id: student.id });
    return response.data;
  } catch (error) {
    console.error('Error updating logged student:', error);
  }
}

/****** Thesis Proposal APIs ******/

async function getThesisProposals(lang, page, limit, filters, search, sorting) {
  try {
    const params = buildParams(lang, page, limit, filters, search, sorting);
    const response = await axios.get(`${URL}/thesis-proposals`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching thesis proposals:', error);
  }
}

async function getTargetedThesisProposals(lang, page, limit, filters, search, sorting) {
  try {
    const params = buildParams(lang, page, limit, filters, search, sorting);
    const response = await axios.get(`${URL}/thesis-proposals/targeted`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching targeted thesis proposals:', error);
  }
}

async function getThesisProposalsTypes(lang, search) {
  try {
    const response = await axios.get(`${URL}/thesis-proposals/types`, {
      params: {
        lang,
        search,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching thesis proposals types:', error);
  }
}

async function getThesisProposalsKeywords(lang, search) {
  try {
    const response = await axios.get(`${URL}/thesis-proposals/keywords`, {
      params: {
        lang,
        search,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching thesis proposals keywords:', error);
  }
}

async function getThesisProposalsTeachers(search) {
  try {
    const response = await axios.get(`${URL}/thesis-proposals/teachers`, {
      params: {
        search,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching thesis proposals teachers:', error);
  }
}

async function getThesisProposalById(id, lang) {
  try {
    const response = await axios.get(`${URL}/thesis-proposals/${id}`, {
      params: {
        lang,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching thesis proposal by ID:', error);
  }
}

async function getProposalAvailability(thesisProposalId) {
  try {
    const response = await axios.get(`${URL}/thesis-proposals/${thesisProposalId}/availability`);
    return response.data;
  } catch (error) {
    console.error('Error fetching thesis proposal availability:', error);
  }
}

/****** Thesis Application APIs ******/

async function getLastStudentApplication() {
  try {
    const response = await axios.get(`${URL}/thesis-applications`);
    return response.data;
  } catch (error) {
    console.error('Error fetching last student thesis application:', error);
  }
}

async function createThesisApplication(applicationData) {
  try {
    const response = await axios.post(`${URL}/thesis-applications`, applicationData);
    return response.data;
  } catch (error) {
    console.error('Error creating thesis application:', error);
    throw error;
  }
}

async function checkStudentEligibility(studentId) {
  try {
    const response = await axios.get(`${URL}/thesis-applications/eligibility`, {
      params: { studentId },
    });
    return response.data;
  } catch (error) {
    console.error('Error checking student eligibility:', error);
  }
}

async function getStatusHistoryApplication(applicationId) {
  try {
    const response = await axios.get(`${URL}/thesis-applications/status-history`, {
      params: { applicationId },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching status history of thesis application:', error);
  }
}

async function getLoggedStudentThesis() {
  try {
    const response = await axios.get(`${URL}/thesis`);
    return response.data;
  } catch (error) {
    console.error('Error fetching student thesis:', error);
  }
}

async function getAllThesisApplications() {
  try {
    const response = await axios.get(`${URL}/thesis-applications/all`);
    return response.data;
  } catch (error) {
    console.error('Error fetching all thesis applications:', error);
  }
}

async function updateThesisApplicationStatus(updateData) {
  try {
    const response = await axios.put(`${URL}/test/thesis-application`, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating thesis application status:', error);
  }
}

async function cancelThesisApplication({ applicationId }) {
  try {
    const response = await axios.post(`${URL}/thesis-applications/cancel`, {
      id: applicationId,
    });
    return response.data;
  } catch (error) {
    console.error('Error cancelling thesis application:', error);
    throw error;
  }
}

// ------------------------------------
// Thesis Start from Application API
async function startThesisFromApplication(applicationData) {
  try {
    const response = await axios.post(`${URL}/thesis`, applicationData);
    return response.data;
  } catch (error) {
    console.error('Error starting thesis from application:', error);
    throw error;
  }
}

// ------------------------------------
// Companies API
async function getCompanies() {
  try {
    const response = await axios.get(`${URL}/companies`);
    return response.data;
  } catch (error) {
    console.error('Error fetching companies:', error);
  }
}

// ------------------------------------

// --------------------------------
// Thesis Conclusions APIs

const getSustainableDevelopmentGoals = async () => {
  try {
    const response = await axios.get(`${URL}/thesis-conclusion/sdgs`);
    return response.data;
  } catch (error) {
    console.error('Error fetching sustainable development goals:', error);
  }
};

const getAvailableLicenses = async lang => {
  console.log(lang);
  try {
    const response = await axios.get(`${URL}/thesis-conclusion/licenses`, {
      params: { lang },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching available licenses:', error);
  }
};

const getEmbargoMotivations = async lang => {
  try {
    const response = await axios.get(`${URL}/thesis-conclusion/embargo-motivations`, {
      params: { lang },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching embargo motivations:', error);
  }
};

const sendThesisConclusionRequest = async conclusionData => {
  try {
    const isFormData = conclusionData instanceof FormData;
    const response = await axios.post(
      `${URL}/thesis-conclusion`,
      conclusionData,
      isFormData ? undefined : { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  } catch (error) {
    console.error('Error sending thesis conclusion request:', error);
    throw error;
  }
};

const saveThesisConclusionDraft = async draftData => {
  try {
    const isFormData = draftData instanceof FormData;
    const response = await axios.post(
      `${URL}/thesis-conclusion/draft`,
      draftData,
      isFormData ? undefined : { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  } catch (error) {
    console.error('Error saving thesis conclusion draft:', error);
    throw error;
  }
};

const getThesisConclusionDraft = async () => {
  try {
    const response = await axios.get(`${URL}/thesis-conclusion/draft`);
    return response.data;
  } catch (error) {
    console.error('Error fetching thesis conclusion draft:', error);
    throw error;
  }
};

const getSessionDeadlines = async type => {
  try {
    const response = await axios.get(`${URL}/thesis-conclusion/deadlines`, { params: { type } });
    return response.data;
  } catch (error) {
    console.error('Error fetching session deadlines:', error);
  }
};

const getAllTheses = async () => {
  try {
    const response = await axios.get(`${URL}/thesis/all`);
    return response.data;
  } catch (error) {
    console.error('Error fetching all theses:', error);
  }
};

const updateThesisConclusionStatus = async updateData => {
  try {
    const response = await axios.put(`${URL}/test/thesis-conclusion`, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating thesis conclusion status:', error);
  }
};

const uploadFinalThesis = async (thesisFile, thesisSummary = null, additionalZip = null) => {
  try {
    const formData = new FormData();
    formData.append('thesisFile', thesisFile);
    if (thesisSummary) formData.append('thesisSummary', thesisSummary);
    if (additionalZip) formData.append('additionalZip', additionalZip);

    const response = await axios.post(`${URL}/thesis-conclusion/upload-final-thesis`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading final thesis:', error);
    throw error;
  }
};

const getThesisFile = async (thesisId, fileType) => {
  try {
    return await axios.get(`${URL}/thesis/${thesisId}/${fileType}`, {
      responseType: 'blob',
    });
  } catch (error) {
    console.error('Error fetching thesis file:', error);
    throw error;
  }
};

const getRequiredSummaryForLoggedStudent = async () => {
  try {
    const response = await axios.get(`${URL}/students/required-summary`);
    return response.data;
  } catch (error) {
    console.error('Error fetching required summary for logged student:', error);
  }
};

const requestThesisCancelation = async () => {
  try {
    const response = await axios.post(`${URL}/thesis/cancel`);
    return response.data;
  } catch (error) {
    console.error('Error requesting thesis cancelation:', error);
    throw error;
  }
};

// ------------------------------------

const buildParams = (lang, page, limit, filters, search, sorting) => {
  const params = {
    lang,
    page,
    limit,
  };

  if (filters.isAbroad) {
    if (filters.isAbroad === 1) {
      params.isAbroad = false;
    } else if (filters.isAbroad === 2) {
      params.isAbroad = true;
    }
  }
  if (filters.isInternal) {
    if (filters.isInternal === 1) {
      params.isInternal = true;
    } else if (filters.isInternal === 2) {
      params.isInternal = false;
    }
  }
  if (filters.keyword.length > 0) {
    filters.keyword.forEach(keyword => {
      params[`keywordId`] = params[`keywordId`] ? [...params[`keywordId`], keyword.id] : [keyword.id];
    });
  }
  if (filters.teacher.length > 0) {
    filters.teacher.forEach(teacher => {
      params[`teacherId`] = params[`teacherId`] ? [...params[`teacherId`], teacher.id] : [teacher.id];
    });
  }
  if (filters.type.length > 0) {
    filters.type.forEach(type => {
      params[`typeId`] = params[`typeId`] ? [...params[`typeId`], type.id] : [type.id];
    });
  }
  if (search) {
    params.search = search;
  }
  if (sorting) {
    params.sortBy = sorting.sortBy;
    params.orderBy = sorting.orderBy;
  }

  return params;
};

const API = {
  getStudents,
  getLoggedStudent,
  updateLoggedStudent,
  getThesisProposals,
  getTargetedThesisProposals,
  getThesisProposalsTypes,
  getThesisProposalsKeywords,
  getThesisProposalsTeachers,
  getThesisProposalById,
  getProposalAvailability,
  createThesisApplication,
  getLastStudentApplication,
  checkStudentEligibility,
  getLoggedStudentThesis,
  getStatusHistoryApplication,
  getAllThesisApplications,
  updateThesisApplicationStatus,
  cancelThesisApplication,
  startThesisFromApplication,
  getCompanies,
  getSustainableDevelopmentGoals,
  getAvailableLicenses,
  getEmbargoMotivations,
  sendThesisConclusionRequest,
  saveThesisConclusionDraft,
  getThesisConclusionDraft,
  getSessionDeadlines,
  updateThesisConclusionStatus,
  getAllTheses,
  uploadFinalThesis,
  getRequiredSummaryForLoggedStudent,
  getThesisFile,
  requestThesisCancelation,
};

export default API;
