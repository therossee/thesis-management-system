const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const Collegio = require('./collegio')(sequelize, Sequelize.DataTypes);
const ThesisProposal = require('./thesis-proposal')(sequelize, Sequelize.DataTypes);
const DegreeProgramme = require('./degree-programme')(sequelize, Sequelize.DataTypes);
const DegreeProgrammeContainer = require('./degree-programme-container')(sequelize, Sequelize.DataTypes);
const ThesisProposalDegree = require('./thesis-proposal-degree')(sequelize, Sequelize.DataTypes);
const Keyword = require('./keyword')(sequelize, Sequelize.DataTypes);
const ThesisProposalKeyword = require('./thesis-proposal-keyword')(sequelize, Sequelize.DataTypes);
const Type = require('./type')(sequelize, Sequelize.DataTypes);
const ThesisProposalType = require('./thesis-proposal-type')(sequelize, Sequelize.DataTypes);
const Teacher = require('./teacher')(sequelize, Sequelize.DataTypes);
const Thesis = require('./thesis')(sequelize, Sequelize.DataTypes);
const ThesisSupervisorCoSupervisor = require('./thesis-supervisor-cosupervisor')(sequelize, Sequelize.DataTypes);
const ThesisProposalSupervisorCoSupervisor = require('./thesis-proposal-supervisor-cosupervisor')(
  sequelize,
  Sequelize.DataTypes,
);
const LoggedStudent = require('./logged-student')(sequelize, Sequelize.DataTypes);
const Student = require('./student')(sequelize, Sequelize.DataTypes);
const ThesisApplication = require('./thesis-application')(sequelize, Sequelize.DataTypes);
const ThesisApplicationSupervisorCoSupervisor = require('./thesis-application-supervisor-cosupervisor')(
  sequelize,
  Sequelize.DataTypes,
);
const ThesisApplicationStatusHistory = require('./thesis-application-status-history')(sequelize, Sequelize.DataTypes);
const Company = require('./company')(sequelize, Sequelize.DataTypes);
const License = require('./license')(sequelize, Sequelize.DataTypes);
const SustainableDevelopmentGoal = require('./sustainable-development-goal')(sequelize, Sequelize.DataTypes);
const ThesisSustainableDevelopmentGoal = require('./thesis-sustainable-development-goal')(
  sequelize,
  Sequelize.DataTypes,
);
const EmbargoMotivation = require('./embargo-motivation')(sequelize, Sequelize.DataTypes);
const ThesisEmbargo = require('./thesis-embargo')(sequelize, Sequelize.DataTypes);
const ThesisEmbargoMotivation = require('./thesis-embargo-motivation')(sequelize, Sequelize.DataTypes);
const ThesisKeyword = require('./thesis-keyword')(sequelize, Sequelize.DataTypes);
const Deadline = require('./deadline')(sequelize, Sequelize.DataTypes);
const GraduationSession = require('./graduation-session')(sequelize, Sequelize.DataTypes);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.Collegio = Collegio;
db.ThesisProposal = ThesisProposal;
db.DegreeProgramme = DegreeProgramme;
db.DegreeProgrammeContainer = DegreeProgrammeContainer;
db.ThesisProposalDegree = ThesisProposalDegree;
db.Keyword = Keyword;
db.ThesisProposalKeyword = ThesisProposalKeyword;
db.Type = Type;
db.ThesisProposalType = ThesisProposalType;
db.Teacher = Teacher;
db.ThesisProposalSupervisorCoSupervisor = ThesisProposalSupervisorCoSupervisor;
db.Student = Student;
db.ThesisApplication = ThesisApplication;
db.ThesisApplicationSupervisorCoSupervisor = ThesisApplicationSupervisorCoSupervisor;
db.ThesisApplicationStatusHistory = ThesisApplicationStatusHistory;
db.Thesis = Thesis;
db.ThesisSupervisorCoSupervisor = ThesisSupervisorCoSupervisor;
db.LoggedStudent = LoggedStudent;
db.Company = Company;
db.License = License;
db.SustainableDevelopmentGoal = SustainableDevelopmentGoal;
db.ThesisSustainableDevelopmentGoal = ThesisSustainableDevelopmentGoal;
db.EmbargoMotivation = EmbargoMotivation;
db.ThesisEmbargo = ThesisEmbargo;
db.ThesisEmbargoMotivation = ThesisEmbargoMotivation;
db.ThesisKeyword = ThesisKeyword;
db.Deadline = Deadline;
db.GraduationSession = GraduationSession;
// Define relationships

// DegreeProgramme and Collegio (one-to-many)
DegreeProgramme.belongsTo(Collegio, {
  foreignKey: 'id_collegio',
});

Collegio.hasMany(DegreeProgramme, {
  foreignKey: 'id_collegio',
});

// DegreeProgramme and DegreeProgrammeContainerMapping (one-to-many)
DegreeProgramme.belongsTo(DegreeProgrammeContainer, {
  foreignKey: 'degree_id',
  otherKey: 'container_id',
});

DegreeProgrammeContainer.hasMany(DegreeProgramme, {
  foreignKey: 'degree_id',
  otherKey: 'container_id',
});

// ThesisProposal and DegreeProgramme (many-to-many)
ThesisProposal.belongsToMany(DegreeProgramme, {
  through: ThesisProposalDegree,
  foreignKey: 'thesis_proposal_id',
  otherKey: 'degree_id',
});

DegreeProgramme.belongsToMany(ThesisProposal, {
  through: ThesisProposalDegree,
  foreignKey: 'degree_id',
  otherKey: 'thesis_proposal_id',
});

// ThesisProposal and Keyword (many-to-many)
ThesisProposal.belongsToMany(Keyword, {
  through: ThesisProposalKeyword,
  foreignKey: 'thesis_proposal_id',
  otherKey: 'keyword_id',
});

Keyword.belongsToMany(ThesisProposal, {
  through: ThesisProposalKeyword,
  foreignKey: 'keyword_id',
  otherKey: 'thesis_proposal_id',
});

// ThesisProposal and Type (many-to-many)
ThesisProposal.belongsToMany(Type, {
  through: ThesisProposalType,
  foreignKey: 'thesis_proposal_id',
  otherKey: 'type_id',
});

Type.belongsToMany(ThesisProposal, {
  through: ThesisProposalType,
  foreignKey: 'type_id',
  otherKey: 'thesis_proposal_id',
});

// ThesisProposal and Teacher (many-to-many)
ThesisProposal.belongsToMany(Teacher, {
  through: ThesisProposalSupervisorCoSupervisor,
  foreignKey: 'thesis_proposal_id',
  otherKey: 'teacher_id',
});

Teacher.belongsToMany(ThesisProposal, {
  through: ThesisProposalSupervisorCoSupervisor,
  foreignKey: 'teacher_id',
  otherKey: 'thesis_proposal_id',
});

ThesisProposal.belongsTo(Company, {
  foreignKey: 'company_id',
});

Company.hasMany(ThesisProposal, {
  foreignKey: 'company_id',
});

// Student and DegreeProgramme (one-to-many)
Student.belongsTo(DegreeProgramme, {
  foreignKey: 'degree_id',
});

DegreeProgramme.hasMany(Student, {
  foreignKey: 'degree_id',
});

// Student and LoggedStudent (one-to-one)
Student.hasOne(LoggedStudent, {
  foreignKey: 'student_id',
});

LoggedStudent.belongsTo(Student, {
  foreignKey: 'student_id',
});

Student.hasMany(ThesisApplication, {
  foreignKey: 'student_id',
});

Company.hasMany(ThesisApplication, {
  foreignKey: 'company_id',
});

ThesisProposal.hasMany(ThesisApplication, {
  foreignKey: 'thesis_proposal_id',
});

Teacher.belongsToMany(Thesis, {
  through: ThesisSupervisorCoSupervisor,
  foreignKey: 'teacher_id',
  otherKey: 'thesis_id',
});

ThesisApplication.belongsToMany(Teacher, {
  through: ThesisApplicationSupervisorCoSupervisor,
  foreignKey: 'thesis_application_id',
  otherKey: 'teacher_id',
});

Teacher.belongsToMany(ThesisApplication, {
  through: ThesisApplicationSupervisorCoSupervisor,
  foreignKey: 'teacher_id',
  otherKey: 'thesis_application_id',
});

ThesisApplication.belongsTo(Company, {
  foreignKey: 'company_id',
});

Thesis.belongsToMany(Teacher, {
  through: ThesisSupervisorCoSupervisor,
  foreignKey: 'thesis_id',
  otherKey: 'teacher_id',
});

Thesis.belongsTo(ThesisApplication, {
  foreignKey: 'thesis_application_id',
});

ThesisApplication.hasOne(Thesis, {
  foreignKey: 'thesis_application_id',
});

Thesis.hasOne(License, {
  foreignKey: 'id',
  sourceKey: 'license_id',
});

Thesis.hasMany(ThesisSustainableDevelopmentGoal, {
  foreignKey: 'thesis_id',
});

ThesisSustainableDevelopmentGoal.belongsTo(Thesis, {
  foreignKey: 'thesis_id',
});

Thesis.hasMany(ThesisKeyword, {
  foreignKey: 'thesis_id',
});

ThesisKeyword.belongsTo(Thesis, {
  foreignKey: 'thesis_id',
});

Deadline.belongsTo(GraduationSession, {
  foreignKey: 'graduation_session_id',
});

GraduationSession.hasMany(Deadline, {
  foreignKey: 'graduation_session_id',
});

module.exports = db;
