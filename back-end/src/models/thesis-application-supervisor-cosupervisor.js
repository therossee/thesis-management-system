module.exports = (sequelize, DataTypes) => {
  const ThesisApplicationSupervisorCoSupervisor = sequelize.define(
    'thesis-application-supervisor-cosupervisor',
    {
      thesis_application_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
          model: 'thesis_application',
          key: 'id',
        },
      },
      teacher_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
          model: 'teacher',
          key: 'id',
        },
      },
      is_supervisor: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
    },
    {
      tableName: 'thesis_application_supervisor_cosupervisor',
      timestamps: false,
    },
  );
  return ThesisApplicationSupervisorCoSupervisor;
};
