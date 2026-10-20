# Project Management & Team Collaboration SaaS

A full-stack web application designed to help teams organize projects, manage tasks, track progress, and collaborate in one place.

The goal of this project is to build a centralized platform where teams can create projects, coordinate their work, assign tasks, and manage project activities through a simple and intuitive interface.

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
