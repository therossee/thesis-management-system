module.exports = (sequelize, DataTypes) => {
  const EmbargoMotivation = sequelize.define(
    'embargo_motivation',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      motivation: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      motivation_en: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
    },
    {
      tableName: 'embargo_motivation',
      timestamps: false,
    },
  );
  return EmbargoMotivation;
};
