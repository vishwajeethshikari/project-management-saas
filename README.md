# Project Management & Team Collaboration SaaS

A full-stack web application designed to help teams organize projects, manage tasks, track progress, and collaborate in one place.

The goal of this project# Project Management & Team Collaboration SaaS

A full-stack web application designed to help teams organize projects, manage tasks, track progress, and collaborate through a centralized workspace.

The platform aims to simplify project coordination by bringing project management, task assignments, team membership, and collaboration activities into one place.

## 🎯 Project Objective

Managing projects through scattered messages and disconnected tools makes it difficult to track responsibilities, deadlines, and progress.

This project aims to provide a centralized platform where teams can create projects, assign tasks, manage deadlines, track progress, and collaborate efficiently.

The application is being developed collaboratively, with separate frontend, backend, and database components.

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Frontend tooling | Vite |
| UI framework | Bootstrap |
| Backend runtime | Node.js |
| Backend framework | Express.js |
| Database | PostgreSQL |
| Database driver | node-postgres (`pg`) |
| Authentication | JSON Web Tokens (JWT) |
| Password hashing | bcrypt |
| Request validation | Zod |
| Environment configuration | dotenv |
| Development server | Nodemon |
| API testing | Postman / REST Client |
| Version control | Git and GitHub |

## 📌 Current Development Status

The backend is being developed using Express.js. The initial project setup has been completed, and authentication and database integration are the current development priorities.

### Completed

- Created the shared GitHub repository and feature-branch workflow.
- Initialized the Express.js backend using npm.
- Installed the initial backend dependencies.
- Created the Express application and server entry points.
- Configured the development server using Nodemon.
- Added environment configuration examples and Git ignore rules.
- Started the Express.js server successfully.
- Committed and pushed the initial Express.js backend setup to the `vishwajeeth-user-auth-security` branch.

### Current Focus

- PostgreSQL connection configuration and verification.
- User registration and login APIs.
- Password hashing using bcrypt.
- JWT generation and verification.
- Authentication middleware for protected endpoints.
- Input validation and standardized error handling.
- Authentication and authorization testing.

### Planned Features

- Rebuild and test Project CRUD APIs using Express.js.
- Team creation and membership management.
- Task management and project-task relationships.
- Task assignment, priority, status, and due dates.
- Role-based access control.
- Comments and activity history.
- Notifications and dashboard statistics.
- React frontend integration.
- Automated testing and deployment.

Features will be marked as completed after implementation and testing.

## 🏗️ Architecture

The application follows a client-server architecture with a React frontend, an Express.js backend, and a PostgreSQL database.

```text
React Frontend (Vite + Bootstrap)
              |
              | REST API requests (JSON)
              v
       Express.js Backend
              |
              +-- Routes
              |
              +-- Controllers
              |
              +-- Middleware
              |     +-- JWT Authentication
              |     +-- Request Validation
              |     +-- Error Handling
              |
              +-- Business Logic
              |
              v
          PostgreSQL
```

The frontend communicates with the backend through REST APIs. Express.js handles incoming requests, validation, authentication, authorization, and business logic. PostgreSQL stores the application's persistent data.

## 📁 Project Structure

```text
project-management-saas/
├── frontend/
│   └── React application
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── validators/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── package-lock.json
│
├── database/
│   └── SQL scripts and database documentation
│
├── docs/
│   └── Project documentation
│
└── README.md
```

The structure will expand as authentication, project management, task management, and collaboration modules are implemented.

## 🔐 Authentication and Security

The authentication module is being developed using Express.js, bcrypt, and JWT.

Planned capabilities include:

- User registration with request validation.
- Secure password hashing using bcrypt.
- Login with credential verification.
- JWT access-token generation and verification.
- Authentication middleware for protected endpoints.
- Authorization checks for projects, teams, and tasks.
- Consistent handling of invalid credentials, missing tokens, and forbidden access.

Passwords will never be stored in plain text. Database credentials and JWT secrets will be maintained in environment variables and excluded from version control.

## 🗄️ Database Design

PostgreSQL is the relational database for the application. The database team is responsible for schema design, SQL scripts, relationships, constraints, and database testing.

The planned entities include:

| Entity | Purpose |
|---|---|
| Users | User accounts and password hashes |
| Teams | Team information and ownership |
| Team Members | Membership and team roles |
| Projects | Project details and team association |
| Tasks | Task details, priority, status, and due dates |
| Comments | Discussion on tasks or projects |
| Activity Logs | History of project and task changes |
| Notifications | Updates for assignments and collaboration |

The final schema will be coordinated with the backend team before database-dependent APIs are integrated.

## 🚀 Running the Backend Locally

### Prerequisites

- Node.js (LTS recommended)
- npm
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/vishwajeethshikari/project-management-saas.git
cd project-management-saas
```

### 2. Install dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

Create a `.env` file inside `backend/` using `.env.example` as a reference.

Example configuration:

```dotenv
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=project_management_saas
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password
JWT_SECRET=your_secure_random_secret
JWT_EXPIRES_IN=15m
```

Replace the example values with your local configuration. Never commit `.env` or expose actual credentials.

### 4. Create the PostgreSQL database

Using pgAdmin or the PostgreSQL command line, create the database if it does not already exist:

```sql
CREATE DATABASE project_management_saas;
```

The required tables and relationships must be created using the database team's SQL scripts before database-dependent APIs can operate.

### 5. Start the backend

For development:

```bash
npm run dev
```

For normal execution:

```bash
npm start
```

The local server is configured to run at:

`http://localhost:5000`

### 6. Verify the server

The initial health-check endpoint is:

`GET http://localhost:5000/api/health`

Expected response:

```json
{
  "success": true,
  "message": "Project Management API is running"
}
```

Authentication and other database-dependent endpoints will become available as their implementation is completed.

## 🔗 Planned API Endpoints

The following table describes the intended API contract. These endpoints are planned and should not be considered implemented until the corresponding functionality has been developed and tested.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Authenticate a user |
| GET | `/api/users/me` | Retrieve the authenticated user's profile |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects` | Retrieve accessible projects |
| GET | `/api/projects/:id` | Retrieve a specific project |
| PUT | `/api/projects/:id` | Update a project |
| DELETE | `/api/projects/:id` | Delete a project |
| POST | `/api/tasks` | Create a task |
| GET | `/api/tasks/:id` | Retrieve a specific task |
| PUT | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |

Additional endpoints for teams, comments, notifications, and dashboards will be documented as the corresponding modules are implemented.

## 👥 Team Collaboration and Git Workflow

The project uses Git and GitHub for collaborative development.

- `main` is the shared integration branch.
- Contributors work on separate feature branches.
- Changes are committed with descriptive commit messages.
- Feature branches are pushed to GitHub.
- Pull requests are used for code review and integration.
- Frontend, backend, and database contributors coordinate API contracts and schema changes.

Current authentication branch:

`vishwajeeth-user-auth-security`

The Express.js migration and authentication work will be integrated into `main` through a reviewed pull request.

## 🗺️ Development Roadmap

1. **Backend foundation:** Express.js setup, configuration, and health checks.
2. **Authentication:** Registration, login, password hashing, and JWT.
3. **Project management:** Project CRUD, validation, and error handling.
4. **Teams and membership:** Team management and permissions.
5. **Task management:** Task CRUD, assignments, priorities, statuses, and due dates.
6. **Collaboration:** Comments, activity history, and notifications.
7. **Dashboard:** Project summaries and progress statistics.
8. **Integration and release:** React integration, automated testing, documentation, and deployment.

## 🎓 Project Goals

This project provides practical experience with full-stack development, REST API design, authentication, authorization, relational database design, secure backend development, testing, and collaborative software engineering.

The long-term goal is to deliver a maintainable and secure team collaboration platform with an intuitive frontend and a well-structured backend.

## 📄 License

A license has not yet been specified. An appropriate open-source license should be added before distributing the project under explicit license terms.
 is to build a centralized platform where teams can create projects, coordinate their work, assign tasks, and manage project activities through a simple and intuitive interface.

## 🎯 Project Objective

Managing team projects through scattered messages and separate tools can make it difficult to track responsibilities and progress. This application aims to provide a single platform for project organization, task tracking, and team collaboration.

The project is being developed collaboratively, with separate frontend, backend, and database components.

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Frontend tooling | Vite |
| Backend | Java, Spring Boot |
| Database | PostgreSQL |
| ORM and database access | Spring Data JPA, Hibernate |
| API documentation and testing | Swagger UI |
| Version control | Git and GitHub |

## ✅ Features Implemented

### Project Management APIs

The initial backend provides REST APIs for managing projects.

- **Create Project:** Create a new project.
- **Get All Projects:** Retrieve the list of projects.
- **Get Project by ID:** Retrieve a specific project.
- **Update Project:** Modify an existing project's details.
- **Delete Project:** Remove a project.

### Backend Validation and Error Handling

- Validate required project fields.
- Restrict project name and description lengths.
- Return structured error responses for missing projects.
- Handle invalid request data through validation error handling.

### Database Integration

- PostgreSQL database integration.
- Project entity and repository using Spring Data JPA.
- Database operations managed through the service and repository layers.

## 🏗️ Architecture

The application follows a layered backend architecture:

```text
React Frontend
      |
      | REST API requests (JSON)
      v
Spring Boot Backend
      |
      +-- Controller Layer
      |
      +-- Service Layer
      |
      +-- Repository Layer
      |
      v
PostgreSQL Database
```

The frontend communicates with the backend through REST APIs. The backend processes requests, applies business logic and validation, and interacts with PostgreSQL through the repository layer.

## 📁 Project Structure

```text
project-management-saas/
├── frontend/
│   └── React application
│
├── backend/
│   └── Spring Boot application
│       └── src/
│           ├── main/
│           │   ├── java/
│           │   └── resources/
│           └── test/
│
├── database/
│   └── Database scripts and schema documentation
│
└── README.md
```

The frontend, backend, and database components are maintained separately to help team members collaborate and integrate their work.

## 🔗 API Endpoints

Base URL: `http://localhost:8080`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/projects` | Create a project |
| GET | `/api/projects` | Retrieve all projects |
| GET | `/api/projects/{id}` | Retrieve a project by ID |
| PUT | `/api/projects/{id}` | Update a project |
| DELETE | `/api/projects/{id}` | Delete a project |

### API Documentation

When the backend is running, Swagger UI can be accessed at:

`http://localhost:8080/swagger-ui/index.html`

Use Swagger UI to inspect endpoints and test API requests.

## 🚀 Running the Backend Locally

### Prerequisites

- Java and Maven
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/vishwajeethshikari/project-management-saas.git
cd project-management-saas
```

### 2. Configure PostgreSQL

Create a PostgreSQL database named:

```sql
CREATE DATABASE project_management_saas;
```

Configure your database URL, username, and password in the backend's Spring Boot configuration. Keep credentials private and do not commit passwords or other secrets to GitHub.

### 3. Run the backend

Open a terminal in the `backend` directory and run:

**Windows:**

```cmd
mvnw.cmd spring-boot:run
```

**macOS/Linux:**

```bash
./mvnw spring-boot:run
```

If the Maven wrapper is unavailable, run the application using your installed Maven setup.

### 4. Test the APIs

Open Swagger UI:

`http://localhost:8080/swagger-ui/index.html`

Make sure PostgreSQL is running and the database configuration is correct.

## 🗺️ Planned Features

The following capabilities are planned for future development:

- Task creation, updating, deletion, and status tracking.
- Linking tasks to projects.
- Task due dates and assignments.
- User registration and authentication.
- Team membership and role-based access.
- React dashboards and project management interfaces.
- Frontend-to-backend API integration.
- Automated backend tests.
- Deployment and production configuration.

These features will be implemented incrementally as the project develops.

## 👥 Team Collaboration

The project is developed collaboratively using GitHub.

- Separate work areas for frontend, backend, and database development.
- Individual branches for contributors.
- Regular commits with descriptive messages.
- Code review before changes are merged into the main branch.
- Coordination between frontend and backend contributors before integration.

## 🎓 Project Goals

This project provides practical experience with full-stack development, REST API design, relational database integration, backend validation, collaborative Git workflows, and software integration.

**Current focus:** Strengthening the Project Management backend and building the Task Management module before integrating the complete application.

## 📄 License

A license has not yet been specified. Add an appropriate license before distributing the project publicly.
