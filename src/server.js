import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
// import { actionLogMiddleware } from './common/middleware/action-log.middleware.js';
import { errorMiddleware } from './common/middleware/error.middleware.js';
import { requestContextMiddleware } from './common/middleware/request-context.middleware.js';
import { config } from './config/env.config.js';
import redis from './config/redis.config.js';
import { swaggerSpec } from './config/swagger.config.js';
import { AppDataSource } from './database/data-source.js';
import { actionLogsRoutes } from './routes/action-logs.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { contractsRoutes } from './routes/contracts.routes.js';
import { departmentsRoutes } from './routes/departments.routes.js';
import { employeeSalariesRoutes } from './routes/employee-salaries.routes.js';
import { employeesRoutes } from './routes/employees.routes.js';
import { holidayListRoutes } from './routes/holiday-list.routes.js';
import { jobGradesRoutes } from './routes/job-grades.routes.js';
import { onboardingRoutes } from './routes/onboarding.routes.js';
import { overtimeRulesRoutes } from './routes/overtime-rules.routes.js';
import { overtimeTypesRoutes } from './routes/overtime-types.routes.js';
import { payrollTypeRoutes } from './routes/payroll-type.routes.js';
import { payrollRoutes } from './routes/payroll.routes.js';
import { penaltiesRoutes } from './routes/penalties.routes.js';
import { permissionsRoutes } from './routes/permissions.routes.js';
import { positionsRoutes } from './routes/positions.routes.js';
import { requestsRoutes } from './routes/requests.routes.js';
import { rolesRoutes } from './routes/roles.routes.js';
import { shiftsRoutes } from './routes/shifts.routes.js';
import { timesheetsRoutes } from './routes/timesheets.routes.js';
import { usersRoutes } from './routes/users.routes.js';
import { ContractsService } from './services/contracts.service.js';

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

app.set('trust proxy', true);
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.resolve('uploads')));
app.use(requestContextMiddleware);
// Routes
app.use(`/${API_PREFIX}/${API_VERSION}/auth`, authRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/users`, usersRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/roles`, rolesRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/departments`, departmentsRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/employees`, employeesRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/permissions`, permissionsRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/contracts`, contractsRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/action-logs`, actionLogsRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/job-grades`, jobGradesRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/positions`, positionsRoutes);
app.use(
  `/${API_PREFIX}/${API_VERSION}/employee-salaries`,
  employeeSalariesRoutes,
);
app.use(`/${API_PREFIX}/${API_VERSION}/onboarding`, onboardingRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/timesheets`, timesheetsRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/overtime-rules`, overtimeRulesRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/overtime-types`, overtimeTypesRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/penalties`, penaltiesRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/shifts`, shiftsRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/holiday-list`, holidayListRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/payroll`, payrollRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/payroll-types`, payrollTypeRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/requests`, requestsRoutes);

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

    // Seed overtime_types nếu chưa có
    try {
      const { OvertimeTypeEntity } = await import('./models/entities/overtime-type.entity.js');
      const typeRepo = AppDataSource.getRepository(OvertimeTypeEntity);
      const overtimeTypes = [
        { code: 'WEEKDAY', name: 'OT ngày thường', description: 'Làm thêm giờ vào ngày làm việc bình thường' },
        { code: 'WEEKEND', name: 'OT cuối tuần', description: 'Làm thêm giờ vào thứ 7 hoặc chủ nhật' },
        { code: 'HOLIDAY', name: 'OT ngày lễ', description: 'Làm thêm giờ vào ngày lễ, tết' },
      ];
      for (const ot of overtimeTypes) {
        const exists = await typeRepo.findOne({ where: { code: ot.code } });
        if (!exists) {
          await typeRepo.save(typeRepo.create(ot));
          console.log(`Seeded overtime_type: ${ot.code}`);
        }
      }
    } catch (e) {
      console.error('Failed to seed overtime_types:', e);
    }

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(
        `API Endpoint: http://localhost:${PORT}/${API_PREFIX}/${API_VERSION}`,
      );

      // start a background timer to apply scheduled terminations/expirations
      try {
        const contractsService = new ContractsService();
        const intervalMs = 1000 * 60 * 60; // every hour

        const runScheduled = async () => {
          try {
            await contractsService.processScheduledUpdates();
          } catch (err) {
            console.error('Error running scheduled contract update', err);
          }
        };

        // run once at startup
        runScheduled();
        setInterval(runScheduled, intervalMs);
        console.log('Scheduled contract processor started (hourly)');
      } catch (e) {
        console.error('Failed to initialize scheduled contract processor', e);
      }
    });
  } catch (error) {
    console.error('Error during Data Source initialization:', error);
    process.exit(1);
  }
};

startServer();
