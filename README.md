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

## ArcFace Service (AI Worker for Face Recognition)

The ArcFace service is a separate Python-based microservice that handles face recognition, liveness detection, and face extraction. It uses FastAPI and InsightFace for AI-powered facial analysis.

### Prerequisites

- [Python](https://www.python.org/) (v3.10 or higher)
- [pip](https://pip.pypa.io/) (Python package manager)
- CUDA GPU (optional, but recommended for better performance)

### Installation

1. **Navigate to the arcface-service directory**
   ```bash
   cd arcface-service
   ```

2. **Create a Python virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

### Running the Service

1. **Activate the virtual environment** (if not already active)
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

2. **Start the ArcFace service**
   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   The service will start at `http://localhost:8000`

3. **Access the API documentation**
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

### API Endpoints

- `GET /health` - Check service health status
- `POST /extract` - Extract face data from a single image (for check-in/check-out)
- `POST /extract-multi` - Extract face data from multiple images (for registration and multi-frame liveness detection)

### First Run

On the first run, the service will automatically download the required AI models (ArcFace and anti-spoof models). This may take some time depending on your internet connection. The models are cached locally in `~/.insightface/models/` after the first download.

### Troubleshooting

- **Models not downloading?** Ensure you have a stable internet connection
- **GPU memory issues?** The service can run on CPU, but will be slower
- **Port 8000 already in use?** Change the port in the command: `--port 8001`
