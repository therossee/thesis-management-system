module.exports = (sequelize, DataTypes) => {
  const ThesisSupervisorCoSupervisor = sequelize.define(
    'thesis-supervisor-cosupervisor',
    {
      thesis_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
          model: 'thesis',
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
      scope: {
        type: DataTypes.ENUM('live', 'draft'),
        primaryKey: true,
        allowNull: false,
        defaultValue: 'live',
      },
      is_supervisor: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
    },
    {
      tableName: 'thesis_supervisor_cosupervisor',
      timestamps: false,
    },
  );
  return ThesisSupervisorCoSupervisor;
};
