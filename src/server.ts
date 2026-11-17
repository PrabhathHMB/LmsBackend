import app from './app';
import { ENV } from './config/env';
import { prisma } from './config/prisma';

const startServer = async () => {
  try {
    const server = app.listen(ENV.PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 LMS Backend running at http://localhost:${ENV.PORT}`);
      console.log(`📡 Environment: ${ENV.NODE_ENV}`);
      console.log(`🔌 API Base URL: http://localhost:${ENV.PORT}/api/v1`);
      console.log(`===============================================`);
    });

    const shutdown = async () => {
      console.log('\nShutting down server gracefully...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database disconnected. Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
