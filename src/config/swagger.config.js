import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env.config.js';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SkyBreath SmartHR API',
            version: '1.0.0',
            description: 'API documentation for SkyBreath SmartHR Backend',
        },
        servers: [
            {
                url: `http://localhost:${config.port}/${config.apiPrefix}/${config.apiVersion}`,
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.js', './src/models/dto/**/*.js'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
