module.exports = (sequelize, DataTypes) => {
    const ThesisEmbargoMotivation = sequelize.define(
        'thesis_embargo_motivation',
        {
            thesis_embargo_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                references: {
                    model: 'thesis_embargo',
                    key: 'id',
                },
            },
            motivation_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                references: {
                    model: 'embargo_motivation',
                    key: 'id',
                },
            },
            other_motivation: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
        },
        {
            tableName: 'thesis_embargo_motivation',
            timestamps: false,
        },
    );
    return ThesisEmbargoMotivation;
};