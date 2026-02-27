module.exports = (sequelize, DataTypes) => {
  const ThesisKeyword = sequelize.define(
    'thesis-keyword',
    {
      thesis_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'thesis',
          key: 'id',
        },
        allowNull: false,
      },
      keyword_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'keyword',
          key: 'id',
        },
        allowNull: true,
      },
      keyword_other: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
    },
    {
      tableName: 'thesis_keyword',
      timestamps: false,
    },
  );
  return ThesisKeyword;
};
