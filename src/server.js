import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { AppDataSource } from './database/data-source.js';
import { config } from './config/env.config.js';
import { authRoutes } from './routes/auth.routes.js';
import { usersRoutes } from './routes/users.routes.js';
import { rolesRoutes } from './routes/roles.routes.js';
import { departmentsRoutes } from './routes/departments.routes.js';
import { employeesRoutes } from './routes/employees.routes.js';
import { contractsRoutes } from './routes/contracts.routes.js';
import { jobGradesRoutes } from './routes/job-grades.routes.js';
import { positionsRoutes } from './routes/positions.routes.js';
import { employeeSalariesRoutes } from './routes/employee-salaries.routes.js';
import { errorMiddleware } from './common/middleware/error.middleware.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config.js';
import cookieParser from 'cookie-parser';
import redis from './config/redis.config.js';

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await redis.quit();
  process.exit(0);
});

const app = express();
const PORT = config.port;
const API_PREFIX = config.apiPrefix;
const API_VERSION = config.apiVersion;

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.resolve('uploads')));

// Routes
app.use(`/${API_PREFIX}/${API_VERSION}/auth`, authRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/users`, usersRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/roles`, rolesRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/departments`, departmentsRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/employees`, employeesRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/contracts`, contractsRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/job-grades`, jobGradesRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/positions`, positionsRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/employee-salaries`, employeeSalariesRoutes);

app.get('/', (req, res) => {
  res.send('SkyBreath SmartHR API is running');
});

app.get(`/${API_PREFIX}/${API_VERSION}/health`, (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error Handling
app.use(errorMiddleware);

// Database Initialization and Server Start
const startServer = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Data Source has been initialized!');

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(
        `API Endpoint: http://localhost:${PORT}/${API_PREFIX}/${API_VERSION}`,
      );
    });
  } catch (error) {
    console.error('Error during Data Source initialization:', error);
    process.exit(1);
  }
};

startServer();
