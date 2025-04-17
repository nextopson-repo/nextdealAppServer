// import 'reflect-metadata';
import { env } from '@/common/utils/envConfig';
import { app, logger } from '@/server';

const server = app.listen(env.PORT || 5000 , '0.0.0.0', () => {
  const { NODE_ENV, HOST, PORT } = env;
  logger.info(`Server (${NODE_ENV}) running on port http://${HOST}:${PORT}`);
  logger.info(`Swagger docs available at http://${HOST}:${PORT}/api-docs`);
});

const onCloseSignal = () => {
  logger.info('sigint received, shutting down');
  server.close(() => {
    logger.info('server closed');
    process.exit();
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', onCloseSignal);
process.on('SIGTERM', onCloseSignal);
