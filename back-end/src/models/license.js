module.exports = (sequelize, DataTypes) => {
    const License = sequelize.define(
        'license',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            name: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            name_en: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            description_en: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
        },
        {
            tableName: 'license',
            timestamps: false,
        },
    );
    return License;
}