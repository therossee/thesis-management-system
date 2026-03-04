module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define(
    'company',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      corporate_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
    },
    {
      tableName: 'company',
      timestamps: false,
    },
  );

  return Company;
};
