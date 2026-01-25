import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { AppDataSource } from './database/data-source';
import { config } from './config/env.config';
import { authRoutes } from './routes/auth.routes';
import { usersRoutes } from './routes/users.routes';
import { rolesRoutes } from './routes/roles.routes';
import { errorMiddleware } from './common/middleware/error.middleware';

const app = express();
const PORT = config.port;
const API_PREFIX = config.apiPrefix;
const API_VERSION = config.apiVersion;

// Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use(`/${API_PREFIX}/${API_VERSION}/auth`, authRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/users`, usersRoutes);
app.use(`/${API_PREFIX}/${API_VERSION}/roles`, rolesRoutes);

app.get('/', (req, res) => {
    res.send('SkyBreath SmartHR API is running');
});

app.get(`/${API_PREFIX}/${API_VERSION}/health`, (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config';
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
            console.log(`API Endpoint: http://localhost:${PORT}/${API_PREFIX}/${API_VERSION}`);
        });
    } catch (error) {
        console.error('Error during Data Source initialization:', error);
        process.exit(1);
    }
};

startServer();
