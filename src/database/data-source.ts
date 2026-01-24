import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config({
    path: `.env.${process.env.NODE_ENV || 'development'}`,
});

export const AppDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '12345',
    database: process.env.DB_DATABASE || 'smarthr_db',
    entities: ['src/**/*.entity{.ts,.js}'],
    migrations: ['src/database/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
});
