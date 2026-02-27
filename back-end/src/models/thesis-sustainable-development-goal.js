module.exports = (sequelize, DataTypes) => {
  const ThesisSustainableDevelopmentGoal = sequelize.define(
    'thesis_sustainable_development_goal',
    {
      thesis_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
          model: 'thesis',
          key: 'id',
        },
      },
      goal_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
          model: 'sustainable_development_goal',
          key: 'id',
        },
      },
      sdg_level: {
        type: DataTypes.ENUM('primary', 'secondary'),
        allowNull: false,
      },
    },
    {
      tableName: 'thesis_sustainable_development_goal',
      timestamps: false,
    },
  );
  return ThesisSustainableDevelopmentGoal;
};
