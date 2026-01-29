module.exports = (sequelize, DataTypes) => {
    const SustainableDevelopmentGoal = sequelize.define(
        'sustainable_development_goal',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            goal: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
        },
        {
            tableName: 'sustainable_development_goal',
            timestamps: false,
        },
    );
    return SustainableDevelopmentGoal;
}