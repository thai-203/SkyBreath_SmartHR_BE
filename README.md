# SkyBreath SmartHR Backend

Backend API for SkyBreath SmartHR system.

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Language**: TypeScript
- **Database**: MySQL with [TypeORM](https://typeorm.io/)
- **Authentication**: JWT, Passport
- **Documentation**: Swagger (OpenAPI)

## Running the App

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Environment:
   Copy `.env.development` to `.env` and update your database credentials:
   ```bash
   cp .env.development .env
   ```

3. Run:
   ```bash
   # development
   npm run start

   # watch mode
   npm run start:dev

   # production
   npm run start:prod
   ```

## API Documentation

Access Swagger UI at: `http://localhost:3000/api/docs`
