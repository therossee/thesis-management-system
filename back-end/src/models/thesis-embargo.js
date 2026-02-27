module.exports = (sequelize, DataTypes) => {
  const ThesisEmbargo = sequelize.define(
    'thesis_embargo',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      thesis_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      duration: {
        type: DataTypes.ENUM('12_months', '18_months', '36_months', 'after_explicit_consent'),
        allowNull: false,
      },
    },
    {
      tableName: 'thesis_embargo',
      timestamps: false,
    },
  );
  return ThesisEmbargo;
};
