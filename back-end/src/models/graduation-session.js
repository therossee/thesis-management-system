module.exports = (sequelize, DataTypes) => {
  const GraduationSession = sequelize.define(
    'graduation_session',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      session_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      session_name_en: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: 'graduation_session',
      timestamps: false,
    },
  );

  return GraduationSession;
};
