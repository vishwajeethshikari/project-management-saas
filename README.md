# Project Management & Team Collaboration SaaS

A full-stack web application designed to help teams organize projects, manage tasks, track progress, and collaborate in one place.

The goal of this project is to build a centralized platform where teams can create projects, coordinate their work, assign tasks, and manage project activities through a simple and intuitive interface.

## 🎯 Project Objective# Project Management & Team Collaboration SaaS

A full-stack web application designed to help teams organize projects, manage tasks, track progress, and collaborate in one centralized platform.

The application aims to simplify team collaboration through project organization, task assignments, team membership, activity tracking, and project dashboards.

## 🎯 Project Objective

Managing projects across scattered messages and separate tools makes it difficult to track responsibilities, deadlines, and progress. This project aims to provide a centralized workspace where teams can manage projects, coordinate tasks, and collaborate efficiently.

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
| Database access | `pg` (node-postgres) |
| Authentication | JSON Web Tokens (JWT) |
| Password security | bcrypt |
| Request validation | Zod |
| Environment configuration | dotenv |
| API testing | Postman / REST Client |
| Version control | Git and GitHub |

## 📌 Current Development Status

The project is being developed incrementally. The backend is transitioning from Spring Boot to a unified Express.js architecture.

### Completed

- Initial React frontend project structure.
- Shared GitHub repository and collaborative branch workflow.
- Initialized the Express.js backend using npm.
- Installed the initial backend dependencies.
- Created the Express application entry point and server entry point.
- Configured the development server using Nodemon.
- Added environment-variable examples and Git ignore rules.
- Committed and pushed the initial Express.js backend setup to the `vishwajeeth-user-auth-security` branch.

### Authentication Completed

- Express.js authentication endpoints for registration, login, and current-user lookup.
- bcrypt password hashing, JWT bearer authentication, and request validation.
- PostgreSQL users migration and isolated automated authentication tests.

### Planned Features

- Rebuild and test Project CRUD APIs using Express.js.
- User account management and authorization enhancements.
- Team creation and membership management.
- Task creation, updating, deletion, and status tracking.
- Project-task relationships and task assignments.
- Role-based permissions and resource ownership checks.
- Comments, activity history, and notifications.
- Project dashboards and summary statistics.
- React frontend integration.
- Automated testing and deployment.

Features will be marked as completed only after implementation and testing.

## 🏗️ Architecture

The application uses a client-server architecture with a React frontend, an Express.js REST API, and a PostgreSQL database.

```text
React Frontend (Vite)
        |
        | HTTP requests / JSON
        v
Express.js REST API
        |
        +-- Routes
        |
        +-- Controllers
        |
        +-- Middleware
        |     +-- Authentication (JWT)
        |     +-- Request validation
        |     +-- Error handling
        |
        +-- Business Logic
        |
        +-- PostgreSQL Access (pg)
                  |
                  v
             PostgreSQL
```

The frontend communicates with the backend through REST APIs. Express.js handles requests, validation, authentication, authorization, and application logic. PostgreSQL stores users, teams, projects, tasks, and collaboration data.

## 📁 Project Structure

```text
project-management-saas/
├── frontend/
│   └── React application
│
├── backend/
│   ├── src/
│   │   ├── config/
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
│   └── Database scripts and schema documentation
│
├── docs/
│   └── Project documentation
│
└── README.md
```

Additional files and modules will be added as development progresses.

## 🔐 Authentication and Security

The authentication module uses Express.js, PostgreSQL, bcrypt, and JWT.

Implemented authentication capabilities include:

- User registration with input validation.
- Secure password hashing using bcrypt.
- Login with credential verification.
- JWT access-token generation and verification.
- Authentication middleware for protected endpoints.
- A protected `GET /api/auth/me` current-user profile endpoint.
- Consistent handling of invalid credentials, missing tokens, and expired tokens.

Passwords will never be stored in plain text. Sensitive configuration, including database credentials and JWT secrets, will be stored in environment variables and excluded from version control.

## 🗄️ Database

The application uses PostgreSQL as its relational database.

The planned database entities include:

- **Users:** Account details, email, password hash, and role information.
- **Teams:** Team information and ownership.
- **Team Members:** Membership and permissions.
- **Projects:** Project details, ownership, and team association.
- **Tasks:** Task descriptions, status, priority, assignee, and due dates.
- **Comments:** Discussion associated with projects or tasks.
- **Activity History:** Records of relevant project and task events.
- **Notifications:** Updates about assignments and collaboration activity.

The users table is defined in `database/migrations/001_create_users.sql`; other schemas and relationships will be established as their modules are implemented.

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

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

Create a `.env` file inside `backend/` using `backend/.env.example` as a reference.

Example configuration:

```dotenv
PORT=5000
DATABASE_URL=postgresql://<username>:<password>@localhost:5432/project_management_saas
JWT_SECRET=<generate-a-random-secret-of-at-least-32-characters>
JWT_EXPIRES_IN=1h
```

Replace the placeholders with your local PostgreSQL credentials and a securely generated JWT secret. Alternatively, configure `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` instead of `DATABASE_URL`.

Do not commit `.env` or expose real credentials.

### 4. Create the PostgreSQL database

Using pgAdmin or the PostgreSQL command line, create the database:

```sql
CREATE DATABASE project_management_saas;
```

Apply the non-destructive users migration from the repository root:

```bash
psql -U your_db_user -d project_management_saas -f database/migrations/001_create_users.sql
```

The database connection and migration must be configured before using auth endpoints.

### 5. Start the backend

For development:

```bash
npm run dev
```

For normal execution:

```bash
npm start
```

The development server is configured to run at:

`http://localhost:5000`

### 6. Test the server

The initial health-check endpoint is:

`GET http://localhost:5000/api/health`

Expected response:

```json
{
  "success": true,
  "message": "Project Management API is running"
}
```

Run the authentication tests from `backend/`. They use an in-memory database stub and do not connect to PostgreSQL:

```bash
npm test
```

## 🔗 Planned API Endpoints

The following endpoints describe the intended API design. Endpoints are not considered implemented until their routes, business logic, and tests are complete.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Authenticate a user |
| GET | `/api/auth/me` | Retrieve the authenticated user's profile |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects` | Retrieve accessible projects |
| GET | `/api/projects/:id` | Retrieve a specific project |
| PUT | `/api/projects/:id` | Update a project |
| DELETE | `/api/projects/:id` | Delete a project |
| POST | `/api/tasks` | Create a task |
| GET | `/api/tasks/:id` | Retrieve a specific task |
| PUT | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |

Additional endpoints for teams, comments, notifications, and dashboards will be documented as they are implemented.

## 👥 Team Collaboration and Git Workflow

The project uses Git and GitHub for collaborative development.

- `main` is the shared integration branch.
- Contributors work on separate feature branches.
- Changes are committed with descriptive commit messages.
- Feature branches are pushed to GitHub for review.
- Pull requests are used to review and merge completed work into `main`.
- API contracts and database schemas are coordinated between frontend and backend contributors.

Current authentication branch:

`vishwajeeth-user-auth-security`

The Express.js migration and authentication work should be integrated through a pull request after review and successful testing.

## 🗺️ Development Roadmap

1. **Backend foundation:** Express.js setup, configuration, and health checks.
2. **Authentication:** User registration, login, password hashing, and JWT.
3. **Project management:** Project CRUD, validation, and error handling.
4. **Teams and membership:** Team creation, membership, and permissions.
5. **Task management:** Task CRUD, assignments, priorities, statuses, and due dates.
6. **Collaboration:** Comments, activity history, and notifications.
7. **Dashboard:** Project progress and summary statistics.
8. **Integration and release:** React integration, automated tests, documentation, and deployment.

## 🎓 Project Goals

This project provides practical experience with full-stack development, REST API design, authentication, authorization, relational database design, secure backend development, automated testing, and collaborative software engineering.

The long-term goal is to deliver a reliable and maintainable team collaboration platform with a clean interface and a well-structured backend.

## 📄 License

A license has not yet been specified. An appropriate open-source license should be added before distributing the project under explicit license terms.


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
