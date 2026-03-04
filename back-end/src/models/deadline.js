module.exports = (sequelize, DataTypes) => {
  const Deadline = sequelize.define(
    'deadline',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      deadline_type: {
        type: DataTypes.ENUM(
          'thesis_request',
          'exams',
          'internship_report',
          'conclusion_request',
          'final_exam_registration',
          'ielts',
        ),
        allowNull: false,
      },
      graduation_session_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      deadline_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: 'deadline',
      timestamps: false,
    },
  );

  return Deadline;
};
