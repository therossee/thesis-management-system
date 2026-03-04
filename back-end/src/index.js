const { app } = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3001;

const bootstrap = async () => {
  try {
    await sequelize.sync();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

bootstrap();
