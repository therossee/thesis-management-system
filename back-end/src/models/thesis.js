module.exports = (sequelize, DataTypes) => {
  const Thesis = sequelize.define(
    'thesis',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      topic: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      title_eng: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      language: {
        type: DataTypes.ENUM('it', 'en'),
        allowNull: true,
      },
      abstract: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      abstract_eng: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      thesis_file_path: {
        type: DataTypes.STRING(1024),
        allowNull: true,
      },
      thesis_resume_path: {
        type: DataTypes.STRING(1024),
        allowNull: true,
      },
      additional_zip_path: {
        type: DataTypes.STRING(1024),
        allowNull: true,
      },
      license_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'company',
          key: 'id',
        },
      },
      student_id: {
        type: DataTypes.STRING(6),
        allowNull: false,
      },
      thesis_application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          'ongoing',
          'cancel_requested',
          'cancel_approved',
          'conclusion_requested',
          'conclusion_approved',
          'conclusion_rejected',
          'almalaurea',
          'compiled_questionnaire',
          'final_exam',
          'final_thesis',
          'done',
        ),
        allowNull: false,
        defaultValue: 'ongoing',
      },
      thesis_start_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      thesis_conclusion_request_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      thesis_conclusion_confirmation_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      thesis_draft_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'thesis',
      timestamps: false,
    },
  );

  return Thesis;
};
