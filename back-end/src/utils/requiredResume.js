const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

const REQUIRED_RESUME_COLLEGIO_IDS = new Set(['CL003']);

const isResumeRequiredForStudent = async student => {
  const degreeProgramme = await sequelize.query(
    `
      SELECT d.id_collegio AS collegioId
      FROM degree_programme d
      WHERE d.id = :degreeId
    `,
    { replacements: { degreeId: student.degree_id }, type: QueryTypes.SELECT },
  );

  const collegioId = degreeProgramme?.[0]?.collegioId;
  return REQUIRED_RESUME_COLLEGIO_IDS.has(collegioId);
};

module.exports = {
  isResumeRequiredForStudent,
};
