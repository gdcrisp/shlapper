import backend/api
import backend/db
import backend/web
import gleam/http.{Options, Post, Put}
import gleam/int
import gleam/io
import wisp.{type Request, type Response}

// Helper to ensure all responses have CORS headers

pub fn handle_request(req: Request, conn: db.DatabaseConnection) -> Response {
  use req <- web.middleware(req)

  // Handle CORS preflight requests
  case req.method {
    Options -> {
      wisp.ok()
      |> wisp.set_header("access-control-allow-origin", "*")
      |> wisp.set_header(
        "access-control-allow-methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      )
      |> wisp.set_header("access-control-allow-headers", "Content-Type")
    }
    _ -> {
      // Route to JSON API endpoints only
      case wisp.path_segments(req) {
        // JSON API endpoints
        ["api", "dashboard"] ->
          case req.method {
            _ -> api.get_dashboard_json(conn)
          }
        ["api", "projects"] ->
          case req.method {
            Post -> api.add_project_json(conn, req)
            _ -> api.get_projects_json(conn)
          }
        ["api", "projects", project_id_str] ->
          case req.method {
            Post -> {
              case int.parse(project_id_str) {
                Ok(project_id) -> api.update_project_json(conn, req, project_id)
                Error(_) -> wisp.bad_request()
              }
            }
            _ -> wisp.method_not_allowed([Post])
          }
        ["api", "tasks"] ->
          case req.method {
            Post -> {
              io.println("🔍 Router: POST /api/tasks request received")
              api.add_task_json(conn, req)
            }
            _ -> api.get_tasks_json(conn, req)
          }
        ["api", "tasks", task_id_str] ->
          case req.method {
            Post -> {
              case int.parse(task_id_str) {
                Ok(task_id) -> api.update_task_json(conn, req, task_id)
                Error(_) -> wisp.bad_request()
              }
            }
            _ -> wisp.method_not_allowed([Post])
          }
        ["api", "team"] ->
          case req.method {
            _ -> api.get_team_json(conn)
          }

        _ -> wisp.not_found()
      }
    }
  }
}
