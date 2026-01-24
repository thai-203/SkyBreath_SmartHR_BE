import * as Joi from 'joi';

export const validationSchema = Joi.object({
    // Application
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    APP_NAME: Joi.string().default('SkyBreath SmartHR'),
    APP_PORT: Joi.number().default(3000),
    APP_HOST: Joi.string().default('localhost'),
    API_PREFIX: Joi.string().default('api'),
    API_VERSION: Joi.string().default('v1'),

    // Database
    DB_HOST: Joi.string().default('localhost'),
    DB_PORT: Joi.number().default(3306),
    DB_USERNAME: Joi.string().default('root'),
    DB_PASSWORD: Joi.string().allow('').default(''),
    DB_DATABASE: Joi.string().default('smarthr_db'),
    DB_SYNCHRONIZE: Joi.boolean().default(false),
    DB_LOGGING: Joi.boolean().default(false),

    // JWT
    JWT_SECRET: Joi.string().required(),
    JWT_EXPIRES_IN: Joi.string().default('15m'),
    JWT_REFRESH_SECRET: Joi.string().required(),
    JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

    // File Upload
    UPLOAD_DEST: Joi.string().default('./uploads'),
    MAX_FILE_SIZE: Joi.number().default(10485760),

    // Swagger
    SWAGGER_ENABLED: Joi.boolean().default(true),
});
