import backend/api_decoders
import backend/db
import backend/shared_types
import backend/sql
import gleam/dynamic
import gleam/int
import gleam/io
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/string
import gleam/string_tree
import gleam/time/calendar.{type Date}
import wisp.{type Request, type Response}

// Use shared types directly - no more duplication!
pub type Project = shared_types.Project
pub type Task = shared_types.Task  
pub type TeamMember = shared_types.TeamMember
pub type DashboardStats = shared_types.DashboardStats

// Simplified conversion functions from SQL types to shared types
fn sql_project_to_project(sql_project: sql.GetProjectsRow) -> Project {
  shared_types.Project(
    id: sql_project.id,
    name: sql_project.name,
    description: sql_project.description |> option.unwrap(""),
    deadline: case sql_project.deadline {
      Some(date) -> Some(date)
      None -> None
    },
    status: case sql_project.status |> option.unwrap("planning") |> shared_types.project_status_from_string {
      Ok(status) -> status
      Error(_) -> shared_types.ProjectPlanning // fallback
    },
    color: case sql_project.color |> option.unwrap("blue") |> shared_types.project_color_from_string {
      Ok(color) -> color
      Error(_) -> shared_types.ProjectBlue // fallback
    },
    created_at: sql_project.created_at,
  )
}

fn sql_task_to_task(sql_task: sql.GetTasksRow) -> Task {
  shared_types.Task(
    id: sql_task.id,
    project_id: sql_task.project_id,
    title: sql_task.title,
    description: sql_task.description |> option.unwrap(""),
    assigned_to: sql_task.assigned_to,
    status: case sql_task.status |> option.unwrap("pending") |> shared_types.task_status_from_string {
      Ok(status) -> status
      Error(_) -> shared_types.TaskPending // fallback
    },
    priority: case sql_task.priority |> option.unwrap("medium") |> shared_types.task_priority_from_string {
      Ok(priority) -> priority
      Error(_) -> shared_types.TaskMedium // fallback
    },
    due_date: sql_task.due_date,
    hours_logged: sql_task.hours_logged |> option.unwrap(0.0),
  )
}

fn sql_team_member_to_team_member(
  sql_member: sql.GetTeamMembersRow,
) -> TeamMember {
  let role = case sql_member.role {
    Some("developer") -> "Developer"
    Some("manager") -> "Project Manager"
    Some("admin") -> "Administrator"
    _ -> "Unknown"
  }
  shared_types.TeamMember(
    id: sql_member.id,
    name: sql_member.name,
    email: sql_member.email,
    role: sql_member.role |> option.unwrap(role),
  )
}

fn sql_dashboard_stats_to_dashboard_stats(
  sql_stats: sql.GetDashboardStatsRow,
) -> DashboardStats {
  shared_types.DashboardStats(
    total_projects: sql_stats.total_projects,
    active_projects: sql_stats.active_projects,
    completed_tasks: sql_stats.completed_tasks,
    pending_tasks: sql_stats.pending_tasks,
    team_members: sql_stats.team_members,
    total_hours: sql_stats.total_hours,
  )
}

fn date_to_string(date: Date) -> String {
  let calendar.Date(year, month, day) = date
  let month_num = case month {
    calendar.January -> 1
    calendar.February -> 2
    calendar.March -> 3
    calendar.April -> 4
    calendar.May -> 5
    calendar.June -> 6
    calendar.July -> 7
    calendar.August -> 8
    calendar.September -> 9
    calendar.October -> 10
    calendar.November -> 11
    calendar.December -> 12
  }
  let padded_month = case month_num < 10 {
    True -> "0" <> int.to_string(month_num)
    False -> int.to_string(month_num)
  }
  let padded_day = case day < 10 {
    True -> "0" <> int.to_string(day)
    False -> int.to_string(day)
  }
  int.to_string(year) <> "-" <> padded_month <> "-" <> padded_day
}

fn parse_date(date_str: String) -> Result(calendar.Date, String) {
  case string.split(date_str, "-") {
    [year_str, month_str, day_str] -> {
      case int.parse(year_str), int.parse(month_str), int.parse(day_str) {
        Ok(year), Ok(month_int), Ok(day) -> {
          let month = case month_int {
            1 -> calendar.January
            2 -> calendar.February
            3 -> calendar.March
            4 -> calendar.April
            5 -> calendar.May
            6 -> calendar.June
            7 -> calendar.July
            8 -> calendar.August
            9 -> calendar.September
            10 -> calendar.October
            11 -> calendar.November
            12 -> calendar.December
            _ -> calendar.January
          }
          Ok(calendar.Date(year, month, day))
        }
        _, _, _ -> Error("Invalid date format")
      }
    }
    _ -> Error("Invalid date format")
  }
}

// JSON API Handlers
pub fn get_dashboard_json(conn: db.DatabaseConnection) -> Response {
  case db.get_dashboard_stats(conn) {
    Ok(stats_list) ->
      case stats_list {
        [stats] -> {
          let dashboard_stats = sql_dashboard_stats_to_dashboard_stats(stats)

          // Also fetch recent projects and tasks
          let recent_projects = case db.get_projects(conn) {
            Ok(sql_projects) -> list.map(sql_projects, sql_project_to_project)
            Error(_) -> []
          }

          let recent_tasks = case db.get_tasks(conn, None) {
            Ok(sql_tasks) -> list.map(sql_tasks, sql_task_to_task)
            Error(_) -> []
          }

          let stats_json =
            json.object([
              #("total_projects", json.int(dashboard_stats.total_projects)),
              #("active_projects", json.int(dashboard_stats.active_projects)),
              #("completed_tasks", json.int(dashboard_stats.completed_tasks)),
              #("pending_tasks", json.int(dashboard_stats.pending_tasks)),
              #("team_members", json.int(dashboard_stats.team_members)),
              #("total_hours", json.float(dashboard_stats.total_hours)),
              #(
                "recent_projects",
                json.array(from: recent_projects, of: project_to_json),
              ),
              #(
                "recent_tasks",
                json.array(from: recent_tasks, of: task_to_json),
              ),
            ])

          wisp.json_response(
            string_tree.from_string(json.to_string(stats_json)),
            200,
          )
          |> wisp.set_header("access-control-allow-origin", "*")
          |> wisp.set_header(
            "access-control-allow-methods",
            "GET, POST, PUT, DELETE, OPTIONS",
          )
          |> wisp.set_header("access-control-allow-headers", "Content-Type")
        }
        _ -> {
          // Return empty stats if no data or unexpected data
          let empty_stats =
            json.object([
              #("total_projects", json.int(0)),
              #("active_projects", json.int(0)),
              #("completed_tasks", json.int(0)),
              #("pending_tasks", json.int(0)),
              #("team_members", json.int(0)),
              #("total_hours", json.float(0.0)),
              #("recent_projects", json.array(from: [], of: project_to_json)),
              #("recent_tasks", json.array(from: [], of: task_to_json)),
            ])
          wisp.json_response(
            string_tree.from_string(json.to_string(empty_stats)),
            200,
          )
          |> wisp.set_header("access-control-allow-origin", "*")
          |> wisp.set_header(
            "access-control-allow-methods",
            "GET, POST, PUT, DELETE, OPTIONS",
          )
          |> wisp.set_header("access-control-allow-headers", "Content-Type")
        }
      }
    Error(_) ->
      wisp.internal_server_error()
      |> wisp.set_header("access-control-allow-origin", "*")
  }
}

// Helper to ensure all responses have CORS headers
pub fn add_task_json(conn: db.DatabaseConnection, req: Request) -> Response {
  io.println("🔍 API: add_task_json called")
  use json_body <- wisp.require_json(req)
  handle_add_task_json(conn, json_body)
}

fn handle_add_task_json(
  conn: db.DatabaseConnection,
  json_body: dynamic.Dynamic,
) -> Response {
  case api_decoders.decode_create_task_request(json_body) {
    Ok(task_request) -> {
      io.println("🔍 DEBUG: All parsing successful, about to call db.add_task")
      io.println(
        "🔍 DEBUG: Parameters - project_id: "
        <> int.to_string(task_request.project_id)
        <> ", title: "
        <> task_request.title,
      )

      let due_date = case task_request.due_date {
        Some(date_str) ->
          case parse_date(date_str) {
            Ok(date) -> Some(date)
            Error(_) -> None
          }
        None -> None
      }

      case
        db.add_task(
          conn,
          task_request.project_id,
          task_request.title,
          task_request.description,
          task_request.assigned_to,
          task_request.status,
          task_request.priority,
          due_date,
          task_request.hours_logged,
        )
      {
        Ok([sql_task]) -> {
          io.println(
            "🔍 DEBUG: Task created successfully: " <> string.inspect(sql_task),
          )
          let task =
            shared_types.Task(
              id: sql_task.id,
              project_id: sql_task.project_id,
              title: sql_task.title,
              description: sql_task.description |> option.unwrap(""),
              assigned_to: sql_task.assigned_to,
              status: case sql_task.status |> option.unwrap("pending") |> shared_types.task_status_from_string {
                Ok(status) -> status
                Error(_) -> shared_types.TaskPending
              },
              priority: case sql_task.priority |> option.unwrap("medium") |> shared_types.task_priority_from_string {
                Ok(priority) -> priority
                Error(_) -> shared_types.TaskMedium
              },
              due_date: sql_task.due_date,
              hours_logged: sql_task.hours_logged |> option.unwrap(0.0),
            )
          let task_json = task_to_json(task)
          wisp.json_response(
            string_tree.from_string(json.to_string(task_json)),
            201,
          )
          |> wisp.set_header("access-control-allow-origin", "*")
          |> wisp.set_header(
            "access-control-allow-methods",
            "GET, POST, PUT, DELETE, OPTIONS",
          )
          |> wisp.set_header("access-control-allow-headers", "Content-Type")
        }
        Ok(_) -> {
          io.println("🔍 DEBUG: Database returned unexpected result format")
          let error_json =
            json.object([
              #("error", json.string("Unexpected database result format")),
            ])
          wisp.json_response(
            string_tree.from_string(json.to_string(error_json)),
            500,
          )
          |> wisp.set_header("access-control-allow-origin", "*")
          |> wisp.set_header(
            "access-control-allow-methods",
            "GET, POST, PUT, DELETE, OPTIONS",
          )
          |> wisp.set_header("access-control-allow-headers", "Content-Type")
        }
        Error(err) -> {
          io.println("🔍 DEBUG: Database error: " <> string.inspect(err))
          let error_json =
            json.object([
              #(
                "error",
                json.string(
                  "Database constraint error: " <> string.inspect(err),
                ),
              ),
            ])
          wisp.json_response(
            string_tree.from_string(json.to_string(error_json)),
            400,
          )
          |> wisp.set_header("access-control-allow-origin", "*")
          |> wisp.set_header(
            "access-control-allow-methods",
            "GET, POST, PUT, DELETE, OPTIONS",
          )
          |> wisp.set_header("access-control-allow-headers", "Content-Type")
        }
      }
    }
    Error(decode_errors) -> {
      let error_msg = string.inspect(decode_errors)
      let error_json =
        json.object([
          #("error", json.string("Invalid request format: " <> error_msg)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
  }
}


pub fn update_task_json(
  conn: db.DatabaseConnection,
  req: Request,
  task_id: Int,
) -> Response {
  use json_body <- wisp.require_json(req)
  handle_update_task_json(conn, json_body, task_id)
}

fn handle_update_task_json(
  conn: db.DatabaseConnection,
  json_body: dynamic.Dynamic,
  task_id: Int,
) -> Response {
  io.println(
    "🔍 API: update_task_json called for task " <> int.to_string(task_id),
  )

  case api_decoders.decode_update_task_request(json_body) {
    Ok(task_request) -> {
      let due_date = case task_request.due_date {
        Some(date_str) ->
          case parse_date(date_str) {
            Ok(date) -> Some(date)
            Error(_) -> None
          }
        None -> None
      }

      case
        db.update_task(
          conn,
          task_id,
          task_request.project_id,
          task_request.title,
          task_request.description,
          task_request.assigned_to,
          task_request.status,
          task_request.priority,
          due_date,
          task_request.hours_logged,
        )
      {
        Ok([sql_task]) -> {
          let task =
            shared_types.Task(
              id: sql_task.id,
              project_id: sql_task.project_id,
              title: sql_task.title,
              description: sql_task.description |> option.unwrap(""),
              assigned_to: sql_task.assigned_to,
              status: case sql_task.status |> option.unwrap("pending") |> shared_types.task_status_from_string {
                Ok(status) -> status
                Error(_) -> shared_types.TaskPending
              },
              priority: case sql_task.priority |> option.unwrap("medium") |> shared_types.task_priority_from_string {
                Ok(priority) -> priority
                Error(_) -> shared_types.TaskMedium
              },
              due_date: sql_task.due_date,
              hours_logged: sql_task.hours_logged |> option.unwrap(0.0),
            )
          let task_json = task_to_json(task)
          wisp.json_response(
            string_tree.from_string(json.to_string(task_json)),
            200,
          )
          |> wisp.set_header("access-control-allow-origin", "*")
          |> wisp.set_header(
            "access-control-allow-methods",
            "GET, POST, PUT, DELETE, OPTIONS",
          )
          |> wisp.set_header("access-control-allow-headers", "Content-Type")
        }
        Ok(_) -> {
          let error_json =
            json.object([
              #("error", json.string("Unexpected database result format")),
            ])
          wisp.json_response(
            string_tree.from_string(json.to_string(error_json)),
            500,
          )
          |> wisp.set_header("access-control-allow-origin", "*")
          |> wisp.set_header(
            "access-control-allow-methods",
            "GET, POST, PUT, DELETE, OPTIONS",
          )
          |> wisp.set_header("access-control-allow-headers", "Content-Type")
        }
        Error(err) -> {
          io.println(
            "🔍 DEBUG: Update task database error: " <> string.inspect(err),
          )
          let error_json =
            json.object([
              #("error", json.string("Database error: " <> string.inspect(err))),
            ])
          wisp.json_response(
            string_tree.from_string(json.to_string(error_json)),
            400,
          )
          |> wisp.set_header("access-control-allow-origin", "*")
          |> wisp.set_header(
            "access-control-allow-methods",
            "GET, POST, PUT, DELETE, OPTIONS",
          )
          |> wisp.set_header("access-control-allow-headers", "Content-Type")
        }
      }
    }
    Error(decode_errors) -> {
      let error_msg = string.inspect(decode_errors)
      let error_json =
        json.object([
          #("error", json.string("Invalid request format: " <> error_msg)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
  }
}

pub fn update_project_json(
  conn: db.DatabaseConnection,
  req: Request,
  project_id: Int,
) -> Response {
  use json_body <- wisp.require_json(req)

  case api_decoders.decode_update_project_request(json_body) {
    Ok(project_request) -> {
      case parse_date(project_request.deadline) {
        Ok(deadline_date) -> {
          case
            db.update_project(
              conn,
              project_id,
              project_request.name,
              project_request.description,
              deadline_date,
              project_request.status,
              project_request.color,
            )
          {
            Ok([sql_project]) -> {
              let project =
                shared_types.Project(
                  id: sql_project.id,
                  name: sql_project.name,
                  description: sql_project.description |> option.unwrap(""),
                  deadline: sql_project.deadline,
                  status: case sql_project.status |> option.unwrap(project_request.status) |> shared_types.project_status_from_string {
                    Ok(status) -> status
                    Error(_) -> shared_types.ProjectPlanning
                  },
                  color: case sql_project.color |> option.unwrap("blue") |> shared_types.project_color_from_string {
                    Ok(color) -> color
                    Error(_) -> shared_types.ProjectBlue
                  },
                  created_at: sql_project.created_at,
                )
              let project_json = project_to_json(project)
              wisp.json_response(
                string_tree.from_string(json.to_string(project_json)),
                200,
              )
              |> wisp.set_header("access-control-allow-origin", "*")
              |> wisp.set_header(
                "access-control-allow-methods",
                "GET, POST, PUT, DELETE, OPTIONS",
              )
              |> wisp.set_header("access-control-allow-headers", "Content-Type")
            }
            Ok(_) ->
              wisp.internal_server_error()
              |> wisp.set_header("access-control-allow-origin", "*")
            Error(err) -> {
              io.println(
                "🔍 DEBUG: Update project database error: "
                <> string.inspect(err),
              )
              let error_json =
                json.object([
                  #(
                    "error",
                    json.string("Database error: " <> string.inspect(err)),
                  ),
                ])
              wisp.json_response(
                string_tree.from_string(json.to_string(error_json)),
                400,
              )
              |> wisp.set_header("access-control-allow-origin", "*")
            }
          }
        }
        Error(_) -> {
          let error_json =
            json.object([
              #("error", json.string("Invalid date format: " <> project_request.deadline)),
            ])
          wisp.json_response(
            string_tree.from_string(json.to_string(error_json)),
            400,
          )
          |> wisp.set_header("access-control-allow-origin", "*")
        }
      }
    }
    Error(decode_errors) -> {
      let error_msg = string.inspect(decode_errors)
      let error_json =
        json.object([
          #("error", json.string("Invalid request format: " <> error_msg)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
  }
}





pub fn get_projects_json(conn: db.DatabaseConnection) -> Response {
  case db.get_projects(conn) {
    Ok(sql_projects) -> {
      let projects = list.map(sql_projects, sql_project_to_project)
      let projects_array = json.array(from: projects, of: project_to_json)

      wisp.json_response(
        string_tree.from_string(json.to_string(projects_array)),
        200,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
      |> wisp.set_header(
        "access-control-allow-methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      )
      |> wisp.set_header("access-control-allow-headers", "Content-Type")
    }
    Error(_) ->
      wisp.internal_server_error()
      |> wisp.set_header("access-control-allow-origin", "*")
  }
}

pub fn get_tasks_json(conn: db.DatabaseConnection, req: Request) -> Response {
  let project_id = case
    wisp.get_query(req) |> list.find(fn(param) { param.0 == "project_id" })
  {
    Ok(#(_, project_id_str)) ->
      case int.parse(project_id_str) {
        Ok(id) -> Some(id)
        Error(_) -> None
      }
    Error(_) -> None
  }

  case db.get_tasks(conn, project_id) {
    Ok(sql_tasks) -> {
      let tasks = list.map(sql_tasks, sql_task_to_task)
      let tasks_array = json.array(from: tasks, of: task_to_json)

      wisp.json_response(
        string_tree.from_string(json.to_string(tasks_array)),
        200,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
      |> wisp.set_header(
        "access-control-allow-methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      )
      |> wisp.set_header("access-control-allow-headers", "Content-Type")
    }
    Error(_err) -> {
      // Debug: Let's see what error we're getting
      let error_json = json.object([#("error", json.string("Database error"))])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        500,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
  }
}

pub fn get_team_json(conn: db.DatabaseConnection) -> Response {
  case db.get_team_members(conn) {
    Ok(sql_members) -> {
      let members = list.map(sql_members, sql_team_member_to_team_member)
      let members_array = json.array(from: members, of: team_member_to_json)

      wisp.json_response(
        string_tree.from_string(json.to_string(members_array)),
        200,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
      |> wisp.set_header(
        "access-control-allow-methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      )
      |> wisp.set_header("access-control-allow-headers", "Content-Type")
    }
    Error(_) ->
      wisp.internal_server_error()
      |> wisp.set_header("access-control-allow-origin", "*")
  }
}

// JSON converters for shared types
fn project_to_json(project: Project) -> json.Json {
  json.object([
    #("id", json.int(project.id)),
    #("name", json.string(project.name)),
    #("description", json.string(project.description)),
    #("deadline", case project.deadline {
      Some(date) -> json.string(date_to_string(date))
      None -> json.string("")
    }),
    #("status", json.string(shared_types.project_status_to_string(project.status))),
    #("color", json.string(shared_types.project_color_to_string(project.color))),
    #("created_at", json.string(project.created_at)),
  ])
}

fn task_to_json(task: Task) -> json.Json {
  json.object([
    #("id", json.int(task.id)),
    #("project_id", json.int(task.project_id)),
    #("title", json.string(task.title)),
    #("description", json.string(task.description)),
    #("assigned_to", case task.assigned_to {
      Some(id) -> json.int(id)
      None -> json.null()
    }),
    #("status", json.string(shared_types.task_status_to_string(task.status))),
    #("priority", json.string(shared_types.task_priority_to_string(task.priority))),
    #("due_date", case task.due_date {
      Some(date) -> json.string(date_to_string(date))
      None -> json.null()
    }),
    #("hours_logged", json.float(task.hours_logged)),
  ])
}

fn team_member_to_json(member: TeamMember) -> json.Json {
  json.object([
    #("id", json.int(member.id)),
    #("name", json.string(member.name)),
    #("email", json.string(member.email)),
    #("role", json.string(member.role)),
  ])
}


pub fn add_project_json(conn: db.DatabaseConnection, req: Request) -> Response {
  use json_body <- wisp.require_json(req)

  case api_decoders.decode_create_project_request(json_body) {
    Ok(project_request) -> {
      project_creation_logic(
        conn,
        project_request.name,
        project_request.description,
        project_request.deadline,
        project_request.status,
        project_request.color,
      )
    }
    Error(decode_errors) -> {
      let error_msg = string.inspect(decode_errors)
      let error_json =
        json.object([
          #("error", json.string("Invalid request format: " <> error_msg)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
  }
}

fn project_creation_logic(
  conn: db.DatabaseConnection,
  name: String,
  description: String,
  deadline_str: String,
  status: String,
  color: String,
) -> Response {
  case parse_date(deadline_str) {
    Ok(deadline_date) -> {
      case
        db.add_project(conn, name, description, deadline_date, status, color)
      {
        Ok([sql_project]) -> {
          let project =
            shared_types.Project(
              id: sql_project.id,
              name: sql_project.name,
              description: sql_project.description |> option.unwrap(""),
              deadline: sql_project.deadline,
              status: case sql_project.status |> option.unwrap("planning") |> shared_types.project_status_from_string {
                Ok(status) -> status
                Error(_) -> shared_types.ProjectPlanning
              },
              color: case sql_project.color |> option.unwrap("blue") |> shared_types.project_color_from_string {
                Ok(color) -> color
                Error(_) -> shared_types.ProjectBlue
              },
              created_at: sql_project.created_at,
            )
          let project_json = project_to_json(project)
          wisp.json_response(
            string_tree.from_string(json.to_string(project_json)),
            201,
          )
          |> wisp.set_header("access-control-allow-origin", "*")
          |> wisp.set_header(
            "access-control-allow-methods",
            "GET, POST, PUT, DELETE, OPTIONS",
          )
          |> wisp.set_header("access-control-allow-headers", "Content-Type")
        }
        Ok(_) ->
          wisp.internal_server_error()
          |> wisp.set_header("access-control-allow-origin", "*")
        Error(_) ->
          wisp.internal_server_error()
          |> wisp.set_header("access-control-allow-origin", "*")
      }
    }
    Error(_) -> {
      let error_json =
        json.object([
          #("error", json.string("Invalid date format: " <> deadline_str)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
  }
}
