import backend/db
import backend/sql
import gleam/float
import gleam/int
import gleam/io
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/string
import gleam/string_tree
import gleam/time/calendar.{type Date}
import wisp.{type Request, type Response}

// Legacy types for compatibility with frontend
pub type Project {
  Project(
    id: Int,
    name: String,
    description: String,
    deadline: String,
    status: String,
    color: String,
    created_at: String,
  )
}

pub type Task {
  Task(
    id: Int,
    project_id: Int,
    title: String,
    description: String,
    assigned_to: Option(Int),
    status: String,
    priority: String,
    due_date: Option(String),
    hours_logged: Float,
  )
}

pub type TeamMember {
  TeamMember(id: Int, name: String, email: String, role: String)
}

pub type DashboardStats {
  DashboardStats(
    total_projects: Int,
    active_projects: Int,
    completed_tasks: Int,
    pending_tasks: Int,
    team_members: Int,
    total_hours: Float,
  )
}

// Conversion functions from SQL types to API types
fn sql_project_to_project(sql_project: sql.GetProjectsRow) -> Project {
  Project(
    id: sql_project.id,
    name: sql_project.name,
    description: sql_project.description |> option.unwrap(""),
    deadline: case sql_project.deadline {
      Some(date) -> date_to_string(date)
      None -> ""
    },
    status: sql_project.status |> option.unwrap("planning"),
    color: sql_project.color |> option.unwrap("blue"),
    created_at: sql_project.created_at,
  )
}

fn sql_task_to_task(sql_task: sql.GetTasksRow) -> Task {
  Task(
    id: sql_task.id,
    project_id: sql_task.project_id,
    title: sql_task.title,
    description: sql_task.description |> option.unwrap(""),
    assigned_to: sql_task.assigned_to,
    status: sql_task.status |> option.unwrap("pending"),
    priority: sql_task.priority |> option.unwrap("medium"),
    due_date: case sql_task.due_date {
      Some(date) -> Some(date_to_string(date))
      None -> None
    },
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
  TeamMember(
    id: sql_member.id,
    name: sql_member.name,
    email: sql_member.email,
    role: sql_member.role |> option.unwrap(role),
  )
}

fn sql_dashboard_stats_to_dashboard_stats(
  sql_stats: sql.GetDashboardStatsRow,
) -> DashboardStats {
  DashboardStats(
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
  use body_str <- wisp.require_string_body(req)
  io.println("🔍 API: Got body through require_string_body: " <> body_str)
  handle_add_task_json(conn, body_str)
}

fn handle_add_task_json(
  conn: db.DatabaseConnection,
  body_str: String,
) -> Response {
  // DEBUG: Log the actual request body
  io.println("🔍 DEBUG: Received request body: " <> body_str)

  let project_id_result = extract_json_int_field(body_str, "project_id")
  let title_result = extract_json_string_field(body_str, "title")
  let description_result = extract_json_string_field(body_str, "description")
  let assigned_to_result =
    extract_json_optional_int_field(body_str, "assigned_to")
  let status_result = extract_json_string_field(body_str, "status")
  let priority_result = extract_json_string_field(body_str, "priority")
  let due_date_result = extract_json_optional_string_field(body_str, "due_date")
  // hours_logged is optional - default to 0.0 for new tasks
  let hours_logged_result = case
    extract_json_float_field(body_str, "hours_logged")
  {
    Ok(hours) -> Ok(hours)
    Error(_) -> Ok(0.0)
    // Default to 0.0 if not provided
  }

  // DEBUG: Log parsing results
  io.println("🔍 DEBUG project_id: " <> string.inspect(project_id_result))
  io.println("🔍 DEBUG hours_logged: " <> string.inspect(hours_logged_result))

  case
    project_id_result,
    title_result,
    description_result,
    status_result,
    priority_result,
    hours_logged_result
  {
    Ok(project_id),
      Ok(title),
      Ok(description),
      Ok(status),
      Ok(priority),
      Ok(hours_logged)
    -> {
      io.println("🔍 DEBUG: All parsing successful, about to call db.add_task")
      io.println(
        "🔍 DEBUG: Parameters - project_id: "
        <> int.to_string(project_id)
        <> ", title: "
        <> title,
      )

      let assigned_to = case assigned_to_result {
        Ok(id) -> Some(id)
        Error(_) -> None
      }

      let due_date = case due_date_result {
        Ok(date_str) ->
          case parse_date(date_str) {
            Ok(date) -> Some(date)
            Error(_) -> None
          }
        Error(_) -> None
      }

      case
        db.add_task(
          conn,
          project_id,
          title,
          description,
          assigned_to,
          status,
          priority,
          due_date,
          hours_logged,
        )
      {
        Ok([sql_task]) -> {
          io.println(
            "🔍 DEBUG: Task created successfully: " <> string.inspect(sql_task),
          )
          let task =
            Task(
              id: sql_task.id,
              project_id: sql_task.project_id,
              title: sql_task.title,
              description: sql_task.description |> option.unwrap(""),
              assigned_to: sql_task.assigned_to,
              status: sql_task.status |> option.unwrap("pending"),
              priority: sql_task.priority |> option.unwrap("medium"),
              due_date: case sql_task.due_date {
                Some(date) -> Some(date_to_string(date))
                None -> None
              },
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
    Error(error_msg), _, _, _, _, _ -> {
      let error_json =
        json.object([
          #("error", json.string("Project ID error: " <> error_msg)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, Error(error_msg), _, _, _, _ -> {
      let error_json =
        json.object([
          #("error", json.string("Title error: " <> error_msg)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, _, _, _, _, Error(error_msg) -> {
      let error_json =
        json.object([
          #("error", json.string("Hours logged error: " <> error_msg)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, _, Error(error_msg), _, _, _ -> {
      let error_json =
        json.object([
          #("error", json.string("Description error: " <> error_msg)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, _, _, Error(error_msg), _, _ -> {
      let error_json =
        json.object([
          #("error", json.string("Status error: " <> error_msg)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, _, _, _, Error(error_msg), _ -> {
      let error_json =
        json.object([
          #("error", json.string("Priority error: " <> error_msg)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
  }
}

fn extract_json_int_field(
  body: String,
  field_name: String,
) -> Result(Int, String) {
  // Try with space: "field": 123
  case string.split(body, "\"" <> field_name <> "\": ") {
    [_before, after] ->
      case string.split(after, ",") {
        [value_str, ..] -> {
          case string.split(value_str, "}") {
            [clean_value, ..] ->
              case int.parse(clean_value) {
                Ok(value) -> Ok(value)
                Error(_) -> Error("Invalid integer for " <> field_name)
              }
            [] -> Error("Empty value for " <> field_name)
          }
        }
        [] -> Error("No value found for " <> field_name)
      }
    _ -> {
      // Try without space: "field":123
      case string.split(body, "\"" <> field_name <> "\":") {
        [_before, after] ->
          case string.split(after, ",") {
            [value_str, ..] -> {
              case string.split(value_str, "}") {
                [clean_value, ..] ->
                  case int.parse(clean_value) {
                    Ok(value) -> Ok(value)
                    Error(_) -> Error("Invalid integer for " <> field_name)
                  }
                [] -> Error("Empty value for " <> field_name)
              }
            }
            [] -> Error("No value found for " <> field_name)
          }
        _ -> Error("Field " <> field_name <> " not found")
      }
    }
  }
}

pub fn update_task_json(
  conn: db.DatabaseConnection,
  req: Request,
  task_id: Int,
) -> Response {
  use body_str <- wisp.require_string_body(req)
  handle_update_task_json(conn, body_str, task_id)
}

fn handle_update_task_json(
  conn: db.DatabaseConnection,
  body_str: String,
  task_id: Int,
) -> Response {
  io.println(
    "🔍 API: update_task_json called for task " <> int.to_string(task_id),
  )
  io.println("🔍 API: Got body: " <> body_str)

  let project_id_result = extract_json_int_field(body_str, "project_id")
  let title_result = extract_json_string_field(body_str, "title")
  let description_result = extract_json_string_field(body_str, "description")
  let assigned_to_result =
    extract_json_optional_int_field(body_str, "assigned_to")
  let status_result = extract_json_string_field(body_str, "status")
  let priority_result = extract_json_string_field(body_str, "priority")
  let due_date_result = extract_json_optional_string_field(body_str, "due_date")
  let hours_logged_result = case
    extract_json_float_field(body_str, "hours_logged")
  {
    Ok(hours) -> Ok(hours)
    Error(_) -> Ok(0.0)
  }

  case
    project_id_result,
    title_result,
    description_result,
    status_result,
    priority_result,
    hours_logged_result
  {
    Ok(project_id),
      Ok(title),
      Ok(description),
      Ok(status),
      Ok(priority),
      Ok(hours_logged)
    -> {
      let assigned_to = case assigned_to_result {
        Ok(id) -> Some(id)
        Error(_) -> None
      }

      let due_date = case due_date_result {
        Ok(date_str) ->
          case parse_date(date_str) {
            Ok(date) -> Some(date)
            Error(_) -> None
          }
        Error(_) -> None
      }

      case
        db.update_task(
          conn,
          task_id,
          project_id,
          title,
          description,
          assigned_to,
          status,
          priority,
          due_date,
          hours_logged,
        )
      {
        Ok([sql_task]) -> {
          let task =
            Task(
              id: sql_task.id,
              project_id: sql_task.project_id,
              title: sql_task.title,
              description: sql_task.description |> option.unwrap(""),
              assigned_to: sql_task.assigned_to,
              status: sql_task.status |> option.unwrap("pending"),
              priority: sql_task.priority |> option.unwrap("medium"),
              due_date: case sql_task.due_date {
                Some(date) -> Some(date_to_string(date))
                None -> None
              },
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
    Error(error_msg), _, _, _, _, _ -> {
      let error_json =
        json.object([
          #("error", json.string("Project ID error: " <> error_msg)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, Error(error_msg), _, _, _, _ -> {
      let error_json =
        json.object([
          #("error", json.string("Title error: " <> error_msg)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, _, Error(error_msg), _, _, _ -> {
      let error_json =
        json.object([
          #("error", json.string("Description error: " <> error_msg)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, _, _, Error(error_msg), _, _ -> {
      let error_json =
        json.object([
          #("error", json.string("Status error: " <> error_msg)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, _, _, _, Error(error_msg), _ -> {
      let error_json =
        json.object([
          #("error", json.string("Priority error: " <> error_msg)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, _, _, _, _, Error(error_msg) -> {
      let error_json =
        json.object([
          #("error", json.string("Hours logged error: " <> error_msg)),
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
  use body_str <- wisp.require_string_body(req)

  let name_result = extract_json_string_field(body_str, "name")
  let description_result = extract_json_string_field(body_str, "description")
  let deadline_result = extract_json_string_field(body_str, "deadline")
  let status_result = extract_json_string_field(body_str, "status")
  let color_result = extract_json_string_field(body_str, "color")

  case
    name_result,
    description_result,
    deadline_result,
    status_result,
    color_result
  {
    Error(name_error), _, _, _, _ -> {
      let error_json =
        json.object([
          #("error", json.string("Name parsing error: " <> name_error)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, Error(desc_error), _, _, _ -> {
      let error_json =
        json.object([
          #("error", json.string("Description parsing error: " <> desc_error)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, _, Error(deadline_error), _, _ -> {
      let error_json =
        json.object([
          #("error", json.string("Deadline parsing error: " <> deadline_error)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, _, _, Error(status_error), _ -> {
      let error_json =
        json.object([
          #("error", json.string("Status parsing error: " <> status_error)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, _, _, _, Error(color_error) -> {
      let error_json =
        json.object([
          #("error", json.string("Color parsing error: " <> color_error)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    Ok(name), Ok(description), Ok(deadline_str), Ok(status), Ok(color) -> {
      case parse_date(deadline_str) {
        Ok(deadline_date) -> {
          case
            db.update_project(
              conn,
              project_id,
              name,
              description,
              deadline_date,
              status,
              color,
            )
          {
            Ok([sql_project]) -> {
              let project =
                Project(
                  id: sql_project.id,
                  name: sql_project.name,
                  description: sql_project.description |> option.unwrap(""),
                  deadline: case sql_project.deadline {
                    Some(date) -> date_to_string(date)
                    None -> ""
                  },
                  status: sql_project.status |> option.unwrap(status),
                  color: sql_project.color |> option.unwrap(""),
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
  }
}

fn extract_json_float_field(
  body: String,
  field_name: String,
) -> Result(Float, String) {
  let pattern_with_space = "\"" <> field_name <> "\": "
  let pattern_without_space = "\"" <> field_name <> "\":"

  case string.split(body, pattern_with_space) {
    [_before, after] -> parse_float_value(after, field_name)
    _ ->
      case string.split(body, pattern_without_space) {
        [_before, after] -> parse_float_value(after, field_name)
        _ -> Error("Field " <> field_name <> " not found in JSON")
      }
  }
}

fn parse_float_value(
  after_field: String,
  field_name: String,
) -> Result(Float, String) {
  // Find the end of the value (comma, closing brace, or end of string)
  let parts_by_comma = string.split(after_field, ",")
  let first_part = case parts_by_comma {
    [first, ..] -> first
    [] -> after_field
  }

  let parts_by_brace = string.split(first_part, "}")
  let cleaned = case parts_by_brace {
    [value, ..] -> string.trim(value)
    [] -> string.trim(first_part)
  }

  case float.parse(cleaned) {
    Ok(value) -> Ok(value)
    Error(_) ->
      Error(
        "Cannot parse float value '" <> cleaned <> "' for field " <> field_name,
      )
  }
}

fn extract_json_optional_int_field(
  body: String,
  field_name: String,
) -> Result(Int, String) {
  case extract_json_int_field(body, field_name) {
    Ok(value) -> Ok(value)
    Error(_) -> Error("Optional field not found or invalid")
  }
}

fn extract_json_optional_string_field(
  body: String,
  field_name: String,
) -> Result(String, String) {
  case extract_json_string_field(body, field_name) {
    Ok(value) -> Ok(value)
    Error(_) -> Error("Optional field not found")
  }
}

// Test helper functions (only for unit testing)
pub fn test_extract_json_int_field(
  body: String,
  field_name: String,
) -> Result(Int, String) {
  extract_json_int_field(body, field_name)
}

pub fn test_extract_json_float_field(
  body: String,
  field_name: String,
) -> Result(Float, String) {
  extract_json_float_field(body, field_name)
}

pub fn test_extract_json_string_field(
  body: String,
  field_name: String,
) -> Result(String, String) {
  extract_json_string_field(body, field_name)
}

pub fn test_extract_json_optional_int_field(
  body: String,
  field_name: String,
) -> Result(Int, String) {
  extract_json_optional_int_field(body, field_name)
}

pub fn test_extract_json_optional_string_field(
  body: String,
  field_name: String,
) -> Result(String, String) {
  extract_json_optional_string_field(body, field_name)
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

// JSON converters
fn project_to_json(project: Project) -> json.Json {
  json.object([
    #("id", json.int(project.id)),
    #("name", json.string(project.name)),
    #("description", json.string(project.description)),
    #("deadline", json.string(project.deadline)),
    #("status", json.string(project.status)),
    #("color", json.string(project.color)),
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
    #("status", json.string(task.status)),
    #("priority", json.string(task.priority)),
    #("due_date", case task.due_date {
      Some(date) -> json.string(date)
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

// Helper function to extract JSON string field value (handles both spaced and compact JSON)
fn extract_json_string_field(
  body: String,
  field_name: String,
) -> Result(String, String) {
  // Try with space: "field": "value"
  case string.split(body, "\"" <> field_name <> "\": \"") {
    [_before, after] ->
      case string.split(after, "\"") {
        [value, ..] -> Ok(value)
        [] ->
          Error("Empty value after " <> field_name <> " field (spaced format)")
      }
    _ -> {
      // Try without space: "field":"value"
      case string.split(body, "\"" <> field_name <> "\":\"") {
        [_before, after] ->
          case string.split(after, "\"") {
            [value, ..] -> Ok(value)
            [] ->
              Error(
                "Empty value after " <> field_name <> " field (compact format)",
              )
          }
        _ -> Error("Could not find " <> field_name <> " field")
      }
    }
  }
}

// POST API Handlers with proper JSON parsing
pub fn add_project_json(conn: db.DatabaseConnection, req: Request) -> Response {
  use body_str <- wisp.require_string_body(req)

  let name_result = extract_json_string_field(body_str, "name")
  let description_result = extract_json_string_field(body_str, "description")
  let deadline_result = extract_json_string_field(body_str, "deadline")
  let status_result = extract_json_string_field(body_str, "status")
  let color_result = extract_json_string_field(body_str, "color")

  // Return error if parsing failed
  case
    name_result,
    description_result,
    deadline_result,
    status_result,
    color_result
  {
    Error(name_error), _, _, _, _ -> {
      let error_json =
        json.object([
          #("error", json.string("Name parsing error: " <> name_error)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, Error(desc_error), _, _, _ -> {
      let error_json =
        json.object([
          #("error", json.string("Description parsing error: " <> desc_error)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, _, Error(deadline_error), _, _ -> {
      let error_json =
        json.object([
          #("error", json.string("Deadline parsing error: " <> deadline_error)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, _, _, Error(status_error), _ -> {
      let error_json =
        json.object([
          #("error", json.string("Status parsing error: " <> status_error)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    _, _, _, _, Error(color_error) -> {
      let error_json =
        json.object([
          #("error", json.string("Color parsing error: " <> color_error)),
        ])
      wisp.json_response(
        string_tree.from_string(json.to_string(error_json)),
        400,
      )
      |> wisp.set_header("access-control-allow-origin", "*")
    }
    Ok(name), Ok(description), Ok(deadline_str), Ok(status), Ok(color) -> {
      // Continue with successful parsing
      project_creation_logic(
        conn,
        name,
        description,
        deadline_str,
        status,
        color,
      )
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
            Project(
              id: sql_project.id,
              name: sql_project.name,
              description: sql_project.description |> option.unwrap(""),
              deadline: case sql_project.deadline {
                Some(date) -> date_to_string(date)
                None -> ""
              },
              status: sql_project.status |> option.unwrap("planning"),
              color: sql_project.color |> option.unwrap("blue"),
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
