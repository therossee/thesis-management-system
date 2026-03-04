module.exports = function define_collegio(sequelize, DataTypes) {
  const Collegio = sequelize.define(
    'collegio',
    {
      id: {
        type: DataTypes.STRING(10),
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
    },
    {
      tableName: 'collegio',
      timestamps: false,
    },
  );
  return Collegio;
};
