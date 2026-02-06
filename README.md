# SkyBreath SmartHR Backend

Backend API for SkyBreath SmartHR system, built with Express, TypeScript, and TypeORM.

## Tech Stack

- **Framework**: [Express](https://expressjs.com/)
- **Language**: TypeScript
- **Database**: MySQL with [TypeORM](https://typeorm.io/)
- **Authentication**: JWT, Passport
- **Documentation**: Swagger (OpenAPI)

## Prerequisites

- [Node.js](https://nodejs.org/) (v22.0.1 or higher)
- [MySQL](https://www.mysql.com/)
- [Redis](https://redis.io/) (For caching and password resets)

### Running Redis with Docker (Recommended)
If you have Docker installed, you can start Redis with:
```bash
docker run -d --name smarthr-redis -p 6379:6379 redis
```

## Installation

1.  **Clone the repository**

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Copy `.env.development` to `.env` and update your database credentials:
    ```bash
    cp .env.development .env
    ```
    *Make sure to create the database in MySQL matching your `.env` configuration (default: `skybreath_smarthr`).*

## Running the Application

### Development
Run the application in watch mode (hot-reload):
```bash
npm run start:dev
```
The server will start at `http://localhost:3000` (or your configured PORT).

### Production
Build and run the compiled JavaScript:
```bash
npm run build
npm run start:prod
```

## Database Seeding

To populate the database with initial data (Admin user, Roles, etc.), run the seed script:

```bash
npm run seed
```

**Note:** Ensure your database is running and the connection settings in `.env` are correct before running the seed.

## API Documentation

Once the server is running, you can access the Swagger UI documentation at:

`http://localhost:3000/api/docs`
