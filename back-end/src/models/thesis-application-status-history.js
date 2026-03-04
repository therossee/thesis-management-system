module.exports = (sequelize, DataTypes) => {
  const ThesisApplicationStatusHistory = sequelize.define(
    'thesis-application-status-history',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      thesis_application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'thesis_application',
          key: 'id',
        },
        field: 'thesis_application_id',
      },
      old_status: {
        type: DataTypes.ENUM(
          'pending',
          'approved',
          'rejected',
          'cancelled',
          'ongoing',
          'cancel_requested',
          'cancel_approved',
          'conclusion_requested',
          'conclusion_approved',
          'almalaurea',
          'compiled_questionnaire',
          'final_exam',
          'final_thesis',
          'done',
        ),
        allowNull: true,
        field: 'old_status',
      },
      new_status: {
        type: DataTypes.ENUM(
          'pending',
          'approved',
          'rejected',
          'cancelled',
          'ongoing',
          'cancel_requested',
          'cancel_approved',
          'conclusion_requested',
          'conclusion_approved',
          'almalaurea',
          'compiled_questionnaire',
          'final_exam',
          'final_thesis',
          'done',
        ),
        allowNull: false,
        field: 'new_status',
      },
      change_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'change_date',
      },
    },
    {
      tableName: 'thesis_application_status_history',
      timestamps: false,
    },
  );
  return ThesisApplicationStatusHistory;
};
