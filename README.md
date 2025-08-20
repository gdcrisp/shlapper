# Shlapper Project Management System

> A comprehensive tutorial for building a full-stack project management application using Gleam, Wisp, and Lustre frameworks with PostgreSQL.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Architecture Guide](#architecture-guide)
5. [Tutorial: Setting Up Your Development Environment](#tutorial-setting-up-your-development-environment)
6. [Tutorial: Understanding the Backend](#tutorial-understanding-the-backend)
7. [Tutorial: Understanding the Frontend](#tutorial-understanding-the-frontend)
8. [Tutorial: Database Design](#tutorial-database-design)
9. [API Reference](#api-reference)
10. [Advanced Topics](#advanced-topics)
11. [Troubleshooting](#troubleshooting)
12. [Contributing](#contributing)

## Overview

Shlapper is a modern project management application that demonstrates full-stack development using Gleam. This documentation serves as both a reference and tutorial for building similar applications. The project showcases:

- **Backend**: RESTful API using Gleam's Wisp framework
- **Frontend**: Interactive web application using Lustre framework  
- **Database**: PostgreSQL with well-designed relational schema
- **Features**: Project tracking, task management, team collaboration

### What You'll Learn

By following this documentation, you'll learn how to:

1. Set up a Gleam full-stack development environment
2. Design and implement a REST API with proper error handling
3. Create interactive frontends with Lustre's Elm-like architecture
4. Structure a PostgreSQL database with proper relationships
5. Implement real-time features like drag-and-drop
6. Add theming and responsive design with TailwindCSS

## Prerequisites

Before starting, ensure you have:

- **Gleam** (latest stable) - [Installation Guide](https://gleam.run/getting-started/installing/)
- **PostgreSQL** (12+) - [Download](https://postgresql.org/download/)
- **Basic Gleam Knowledge** - [Gleam Language Tour](https://gleam.run/book/)
- **Git** - For version control

### Recommended Tools

- **VS Code** with Gleam extension
- **pgAdmin** or similar database management tool
- **Postman** or **curl** for API testing

## Quick Start

Get the application running in under 5 minutes:

### 1. Clone and Setup

```bash
git clone <repository-url>
cd shlapper
```

### 2. Database Setup

```bash
# Create database
createdb shlapper

# Initialize schema
psql shlapper < backend/src/backend/schema.sql
```

### 3. Start Backend

```bash
cd backend
gleam deps download
gleam run
```

Your API is now running at `http://localhost:3000`

### 4. Start Frontend

```bash
cd frontend
gleam deps download
gleam build
```

Open `frontend/index.html` in your browser to access the application.

## Architecture Guide

### Project Structure Overview

```
shlapper/
├── backend/          # REST API Server
│   ├── src/
│   │   ├── backend/
│   │   │   ├── sql/      # Database queries
│   │   │   ├── api.gleam # API endpoints
│   │   │   ├── db.gleam  # Database layer
│   │   │   └── router.gleam # HTTP routing
│   │   └── backend.gleam # Entry point
│   └── test/
├── frontend/         # Web Application
│   ├── src/
│   │   ├── pages/    # Page components
│   │   ├── frontend.gleam # Main app
│   │   └── types.gleam    # Type definitions
│   └── index.html
└── README.md
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Backend** | Gleam + Wisp | REST API server |
| **Frontend** | Gleam + Lustre | Interactive web UI |
| **Database** | PostgreSQL + Pog | Data persistence |
| **Styling** | TailwindCSS | Responsive design |
| **HTTP** | Mist | HTTP server |
| **JSON** | gleam_json | Data serialization |

## Tutorial: Setting Up Your Development Environment

### Step 1: Install Gleam

Follow the [official installation guide](https://gleam.run/getting-started/installing/) for your platform.

Verify installation:
```bash
gleam --version
```

### Step 2: Set Up PostgreSQL

1. **Install PostgreSQL** for your platform
2. **Create a development database**:
   ```bash
   createdb shlapper_dev
   ```
3. **Test connection**:
   ```bash
   psql shlapper_dev -c "SELECT version();"
   ```

### Step 3: Project Dependencies

The project uses these key dependencies:

**Backend** (`backend/gleam.toml`):
```toml
[dependencies]
gleam_stdlib = ">= 0.44.0 and < 2.0.0"
wisp = "~> 1.8"              # Web framework
pog = ">= 4.1.0 and < 5.0.0" # PostgreSQL driver
mist = ">= 5.0.3 and < 6.0.0" # HTTP server
gleam_json = "~> 3.0.2"      # JSON handling
```

**Frontend** (`frontend/gleam.toml`):
```toml
[dependencies]
lustre = ">= 5.3.2 and < 6.0.0" # UI framework
rsvp = ">= 1.1.3 and < 2.0.0"   # HTTP client
gleam_json = "~> 3.0.2"         # JSON handling
```

### Step 4: Initialize Project

```bash
# Download dependencies
cd backend && gleam deps download
cd ../frontend && gleam deps download

# Run initial build
cd ../backend && gleam build
cd ../frontend && gleam build
```

## Tutorial: Understanding the Backend

### Entry Point Analysis

The backend starts in `backend/src/backend.gleam`:

```gleam
pub fn main() {
  wisp.configure_logger()
  io.println("Starting Project Management API server on http://localhost:3000")

  let assert Ok(conn) = db.connect()
  let secret_key_base = wisp.random_string(64)

  let assert Ok(_) =
    wisp_mist.handler(
      fn(req) { router.handle_request(req, conn) },
      secret_key_base,
    )
    |> mist.new
    |> mist.port(3000)
    |> mist.start
  process.sleep_forever()
}
```

**Key Points:**
- Line 13: Database connection established
- Line 15: Secure session key generated  
- Line 18: Router function handles all requests
- Line 23: Server listens on port 3000

### Database Connection (`backend/src/backend/db.gleam`)

The database layer provides connection management:

```gleam
pub fn connect() -> Result(DatabaseConnection, String) {
  // Connection logic here
}
```

### HTTP Routing (`backend/src/backend/router.gleam`)

The router handles CORS and API routing:

```gleam
pub fn handle_request(req: Request, conn: db.DatabaseConnection) -> Response {
  use req <- web.middleware(req)
  
  case req.method {
    Options -> cors_preflight_response()
    _ -> route_api_requests(req, conn)
  }
}
```

**Routing Pattern:**
- Line 15: CORS preflight handling
- Line 26: API endpoints under `/api/*`
- Line 71: 404 for unmatched routes

### API Endpoints (`backend/src/backend/api.gleam`)

Each endpoint follows this pattern:

```gleam
pub fn get_projects_json(conn: DatabaseConnection) -> Response {
  case sql.get_projects(conn) {
    Ok(projects) -> {
      projects
      |> json.array(project_to_json)
      |> json.to_string_builder
      |> wisp.json_response(200)
    }
    Error(_) -> wisp.internal_server_error()
  }
}
```

## Tutorial: Understanding the Frontend

### Lustre Architecture

The frontend follows The Elm Architecture (TEA):

```gleam
// Model - Application state
type Model {
  Loading
  Loaded(/*...*/)
  LoadingFailed(Error)
}

// Message - Events that can occur
type Msg {
  ApiReturnedProjects(Result(List(Project), Error))
  ChangeView(View)
  // ...
}

// Update - State transitions
fn update(model: Model, msg: Msg) -> #(Model, Effect(Msg)) {
  // Handle state changes
}

// View - Render HTML
fn view(model: Model) -> Element(Msg) {
  // Render UI
}
```

### Application Entry Point

In `frontend/src/frontend.gleam`:

```gleam
pub fn main() {
  let app = lustre.application(init, update, view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)
}
```

### State Management

The application loads data on initialization:

```gleam
fn init(_flags) -> #(Model, Effect(Msg)) {
  #(
    Loading,
    effect.batch([
      fetch_dashboard_data(ApiReturnedDashboardData),
      fetch_projects(ApiReturnedProjects),
      fetch_tasks(ApiReturnedTasks),
      fetch_team_members(ApiReturnedTeamMembers),
      setup_drag_drop_effect(),
    ]),
  )
}
```

### HTTP Requests

API calls use the `rsvp` library:

```gleam
fn fetch_projects(
  on_response handle_response: fn(Result(List(Project), Error)) -> msg,
) -> Effect(msg) {
  let url = "http://localhost:3000/api/projects"
  let decoder = decode.list(project_decoder())
  let handler = rsvp.expect_json(decoder, handle_response)
  rsvp.get(url, handler)
}
```

## Tutorial: Database Design

### Schema Overview

The database consists of three main entities with clear relationships:

```sql
-- Core entity
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'planning',
  color VARCHAR(20) DEFAULT 'blue',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Child entity
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  assigned_to INTEGER REFERENCES team_members(id),
  hours_logged DECIMAL(8,2) DEFAULT 0.0
);

-- User entity
CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(100) DEFAULT 'developer'
);
```

### Key Design Decisions

1. **Referential Integrity**: Foreign keys with CASCADE deletes
2. **Constraints**: CHECK constraints for valid enum values
3. **Indexes**: Strategic indexes on foreign keys and status fields
4. **Triggers**: Automatic timestamp updates

### Status Workflows

**Projects**: `planning` → `active` → `completed`/`on_hold`/`cancelled`

**Tasks**: `pending` → `in_progress` → `testing` → `review` → `completed`/`blocked`

## API Reference

### Base URL
```
http://localhost:3000/api
```

### Authentication
Currently, no authentication is required. This is suitable for development and demo purposes.

### Endpoints

#### Dashboard
```http
GET /api/dashboard
```

**Response:**
```json
{
  "total_projects": 5,
  "active_projects": 3,
  "completed_tasks": 12,
  "pending_tasks": 8,
  "team_members": 4,
  "total_hours": 127.5,
  "recent_projects": [...],
  "recent_tasks": [...]
}
```

#### Projects

```http
GET /api/projects
```
List all projects

```http
POST /api/projects
Content-Type: application/json

{
  "name": "New Project",
  "description": "Project description",
  "deadline": "2024-12-31",
  "status": "planning",
  "color": "blue"
}
```
Create a new project

```http
POST /api/projects/:id
Content-Type: application/json

{
  "name": "Updated Project",
  "status": "active"
}
```
Update existing project

#### Tasks

```http
GET /api/tasks
```
List all tasks

```http
POST /api/tasks
Content-Type: application/json

{
  "project_id": 1,
  "title": "New Task",
  "description": "Task description",
  "status": "pending",
  "priority": "high",
  "assigned_to": 2,
  "due_date": "2024-01-15"
}
```
Create a new task

```http
POST /api/tasks/:id
```
Update existing task

#### Team

```http
GET /api/team
```
List all team members

### Error Responses

```json
{
  "error": "Resource not found",
  "status": 404
}
```

Common status codes:
- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

## Advanced Topics

### Adding CORS Support

CORS is handled in `router.gleam`:

```gleam
case req.method {
  Options -> {
    wisp.ok()
    |> wisp.set_header("access-control-allow-origin", "*")
    |> wisp.set_header("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS")
    |> wisp.set_header("access-control-allow-headers", "Content-Type")
  }
}
```

### Implementing Drag and Drop

The frontend uses JavaScript FFI for drag-and-drop:

```gleam
@external(javascript, "./app.ffi.mjs", "setupDragAndDropListener")
fn setup_drag_and_drop_listener(
  handler: fn(#(String, Int, String)) -> Nil,
) -> Nil
```

### Dark Mode Implementation

Theme switching is handled via JavaScript:

```javascript
function toggleTheme() {
  const current = document.documentElement.className;
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.className = newTheme;
  localStorage.setItem('theme', newTheme);
}
```

### Performance Optimization

1. **Database Indexing**: Strategic indexes on foreign keys
2. **Caching**: Client-side caching with cache invalidation
3. **Optimistic Updates**: UI updates before API confirmation
4. **Lazy Loading**: Components load data as needed

## Troubleshooting

### Common Issues

#### Database Connection Failed
```
Error: Failed to connect to database
```

**Solution:**
1. Ensure PostgreSQL is running: `pg_ctl status`
2. Check database exists: `psql -l | grep shlapper`
3. Verify connection settings in `db.gleam`

#### CORS Errors in Browser
```
Access to fetch blocked by CORS policy
```

**Solution:**
1. Ensure backend is running on port 3000
2. Check CORS headers in `router.gleam`
3. Use proper Content-Type headers in requests

#### Frontend Build Errors
```
Error: Module not found
```

**Solution:**
1. Run `gleam deps download` in frontend directory
2. Check `gleam.toml` for correct dependencies
3. Ensure Gleam version compatibility

#### Database Schema Issues
```
Error: relation "projects" does not exist
```

**Solution:**
1. Run schema file: `psql shlapper < backend/src/backend/schema.sql`
2. Check database connection
3. Verify table creation succeeded: `\dt` in psql

### Debug Mode

Enable debug output:

```bash
# Backend
cd backend
GLEAM_LOG=debug gleam run

# Frontend
cd frontend
gleam build --target javascript
```

### Performance Monitoring

Monitor API response times:

```bash
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/api/projects"
```

## Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/new-feature`
3. **Make** your changes
4. **Test** your changes: `gleam test`
5. **Commit** with clear messages
6. **Push** and create a Pull Request

### Code Style

- **Formatting**: Use `gleam format`
- **Type Annotations**: Add explicit types for public functions
- **Documentation**: Document complex logic
- **Testing**: Maintain test coverage

### Adding New Features

#### Backend Endpoint

1. **Add SQL query** in `backend/src/backend/sql/`
2. **Implement handler** in `api.gleam`
3. **Add route** in `router.gleam`
4. **Write tests** in `test/`

#### Frontend Component

1. **Define types** in `types.gleam`
2. **Add message types** for state changes
3. **Implement update logic**
4. **Create view component**
5. **Add to main application**

### Testing Strategy

```bash
# Run all tests
gleam test

# Test specific module
gleam test --module backend_test

# Watch mode for development
gleam test --watch
```

---

**Built with** [Gleam](https://gleam.run/) • **API Framework** [Wisp](https://hexdocs.pm/wisp/) • **UI Framework** [Lustre](https://hexdocs.pm/lustre/)

For questions or issues, please [open an issue](../../issues) on GitHub.