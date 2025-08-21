# Project Management System - Gleam Full Stack Example

## Project Structure

```
shlapper/
├── README.md                 # This file - project overview
├── LICENSE                   # MIT License
├── backend/                  # REST API server (Gleam)
│   ├── README.md            # Backend-specific documentation
│   ├── src/
│   │   ├── backend.gleam    # Main server entry point
│   │   └── backend/
│   │       ├── api.gleam    # HTTP API handlers & JSON processing
│   │       ├── db.gleam     # Database operations & connection pooling
│   │       ├── router.gleam # HTTP routing & CORS handling
│   │       ├── web.gleam    # Middleware & request processing
│   │       ├── schema.sql   # PostgreSQL database schema
│   │       ├── shared_types.gleam # Shared type definitions
│   │       └── sql/         # Type-safe SQL queries (Squirrel)
│   ├── test/                # Backend tests
│   └── gleam.toml          # Backend dependencies
└── frontend/                # Web application (Gleam → JavaScript)
    ├── README.md           # Frontend-specific documentation
    ├── src/
    │   ├── frontend.gleam  # Main application (Lustre/Elm architecture)
    │   ├── types.gleam     # Frontend-specific types
    │   ├── shared_types.gleam # Shared types with backend
    │   ├── colors.gleam    # Material Design color system
    │   ├── app.ffi.mjs     # JavaScript interop (drag/drop)
    │   └── pages/          # Page components (dashboard, projects, tasks, team)
    ├── test/               # Frontend tests
    ├── index.html          # HTML entry point
    └── gleam.toml         # Frontend dependencies
```
### Backend Architecture
- **Gleam** compiled to Erlang
- **Wisp + Mist** high-performance HTTP server framework
- **PostgreSQL** 
- **Squirrel Integration** for type-safe SQL queries and automatic type generation

### Frontend Architecture  
- **Gleam** compiled to JavaScript
- **Lustre Framework** implementing TEA
- **JavaScript FFI** for browser APIs and drag-and-drop functionality

## API Overview

The backend exposes a RESTful API with CRUD operations:

| Endpoint | Method | Description | Request Body |
|----------|---------|-------------|--------------|
| `/api/dashboard` | GET | Dashboard statistics with recent projects/tasks | None |
| `/api/projects` | GET | List all projects with full metadata | None |
| `/api/projects` | POST | Create new project | `CreateProjectRequest` |
| `/api/projects/{id}` | POST | Update specific project | `UpdateProjectRequest` |
| `/api/tasks` | GET | List tasks (supports `?project_id=X` filtering) | None |
| `/api/tasks` | POST | Create new task | `CreateTaskRequest` |
| `/api/tasks/{id}` | POST | Update specific task | `UpdateTaskRequest` |
| `/api/team` | GET | List all team members | None |

### API Features
- **Type-Safe JSON**: Comprehensive request/response validation
- **Error Handling**: Detailed error messages with field-level validation
- **CORS Support**: Full cross-origin request support for web applications
- **Query Parameters**: Flexible filtering and pagination support
- **Optimistic Locking**: Conflict resolution for concurrent updates

## Data Model

### **Projects** (Full Lifecycle Management)
- **Basic Information**: Name, description, creation timestamps
- **Status Workflow**: Planning → Active → On Hold → Completed → Cancelled
- **Visual Organization**: 16-color theming system

### **Tasks** (Advanced Task Management)
- **Priority System**: Low, Medium, High, Critical priority levels
- **Status Workflow**: Pending → In Progress → Review → Completed  
- **Project Relationship**: Mandatory project association with cascading deletes

### **Dashboard Analytics** (Business Intelligence)
- **Project Metrics**: Total projects, active project counts
- **Task Analytics**: Completed vs pending task ratios
- **Team Insights**: Team member counts and distribution
- **Time Tracking**: Aggregated hours across all projects and tasks


### **External Resources**
- **Gleam Language**: [gleam.run](https://gleam.run) - Official Gleam documentation and guides
- **Lustre Framework**: [hexdocs.pm/lustre](https://hexdocs.pm/lustre/) - Frontend framework documentation
- **Wisp HTTP Framework**: [hexdocs.pm/wisp](https://hexdocs.pm/wisp/) - Backend HTTP framework
- **Pog PostgreSQL**: [hexdocs.pm/pog](https://hexdocs.pm/pog/) - PostgreSQL driver documentation
- **Squirrel SQL**: [hexdocs.pm/squirrel](https://hexdocs.pm/squirrel/) - Type-safe SQL integration


This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---


This  project provides a basic example with features like drag-and-drop interfaces, color theming, real-time updates