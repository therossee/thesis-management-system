module.exports = (sequelize, DataTypes) => {
  const ThesisApplication = sequelize.define(
    'ThesisApplication',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      topic: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      submission_date: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'submission_date',
      },
      student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'student',
          key: 'id',
        },
        field: 'student_id',
      },
      thesis_proposal_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'thesis_proposal',
          key: 'id',
        },
        field: 'thesis_proposal_id',
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'company',
          key: 'id',
        },
        field: 'company_id',
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
        allowNull: false,
      },
    },
    {
      tableName: 'thesis_application',
      timestamps: false,
    },
  );

  return ThesisApplication;
};
