module.exports = (sequelize, DataTypes) => {
    const BlobStorage = sequelize.define(
        'blob_storage',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            file_data: {
                type: DataTypes.BLOB('long'),
                allowNull: false,
            },
        },
        {
            tableName: 'blob_storage',
            timestamps: false,
        },
    );
    return BlobStorage;
};