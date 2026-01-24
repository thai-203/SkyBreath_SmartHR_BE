import { registerAs } from '@nestjs/config';

export default registerAs('swagger', () => ({
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    title: process.env.SWAGGER_TITLE || 'SmartHR API',
    description:
        process.env.SWAGGER_DESCRIPTION || 'API Documentation for SmartHR',
    version: process.env.SWAGGER_VERSION || '1.0',
    path: process.env.SWAGGER_PATH || 'api/docs',
}));
