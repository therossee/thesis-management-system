module.exports = (sequelize, DataTypes) => {
  const ThesisKeyword = sequelize.define(
    'thesis-keyword',
    {
      thesis_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
          model: 'thesis',
          key: 'id',
        },
      },
      keyword_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
          model: 'keyword',
          key: 'id',
        },
      },
    },
    {
      tableName: 'thesis_keyword',
      timestamps: false,
    },
  );
  return ThesisKeyword;
};
