import backend/sql
import envoy
import gleam/erlang/process
import gleam/int
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/time/calendar.{type Date, Date, January}
import pog

pub type DatabaseConnection {
  DatabaseConnection(db: pog.Connection)
}

pub fn connect() -> Result(DatabaseConnection, String) {
  let pool_name = process.new_name(prefix: "ducky_db_pool")

  let config =
    pog.Config(
      pool_name: pool_name,
      host: envoy.get("DB_HOST") |> result.unwrap("localhost"),
      port: envoy.get("DB_PORT")
        |> result.unwrap("5432")
        |> int.parse
        |> result.unwrap(5432),
      user: envoy.get("DB_USER") |> result.unwrap("postgres"),
      password: Some(envoy.get("DB_PASSWORD") |> result.unwrap("postgres")),
      database: envoy.get("DB_NAME") |> result.unwrap("ducky_dev"),
      pool_size: 20,
      connection_parameters: [],
      idle_interval: 1000,
      ip_version: pog.Ipv4,
      queue_interval: 100,
      queue_target: 100,
      rows_as_map: False,
      ssl: pog.SslDisabled,
      trace: False,
    )

  case pog.start(config) {
    Ok(started) -> Ok(DatabaseConnection(started.data))
    Error(_) -> Error("Failed to connect to database")
  }
}

// Project functions
pub fn get_projects(
  conn: DatabaseConnection,
) -> Result(List(sql.GetProjectsRow), pog.QueryError) {
  case sql.get_projects(conn.db) {
    Ok(returned) -> Ok(returned.rows)
    Error(err) -> Error(err)
  }
}

pub fn add_project(
  conn: DatabaseConnection,
  name: String,
  description: String,
  deadline: Date,
  status: String,
  color: String,
) -> Result(List(sql.AddProjectRow), pog.QueryError) {
  case sql.add_project(conn.db, name, description, deadline, status, color) {
    Ok(returned) -> Ok(returned.rows)
    Error(err) -> Error(err)
  }
}

pub fn update_project(
  conn: DatabaseConnection,
  id: Int,
  name: String,
  description: String,
  deadline: Date,
  status: String,
  color: String,
) -> Result(List(sql.UpdateProjectRow), pog.QueryError) {
  case
    sql.update_project(conn.db, id, name, description, deadline, status, color)
  {
    Ok(returned) -> Ok(returned.rows)
    Error(err) -> Error(err)
  }
}

// Convert GetAllTasksRow to GetTasksRow for unified handling
fn all_tasks_row_to_tasks_row(row: sql.GetAllTasksRow) -> sql.GetTasksRow {
  sql.GetTasksRow(
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    description: row.description,
    assigned_to: row.assigned_to,
    status: row.status,
    priority: row.priority,
    due_date: row.due_date,
    hours_logged: row.hours_logged,
    project_name: row.project_name,
    assigned_name: row.assigned_name,
  )
}

// Task functions  
pub fn get_tasks(
  conn: DatabaseConnection,
  project_id: Option(Int),
) -> Result(List(sql.GetTasksRow), pog.QueryError) {
  case project_id {
    Some(id) ->
      case sql.get_tasks(conn.db, id) {
        Ok(returned) -> Ok(returned.rows)
        Error(err) -> Error(err)
      }
    None ->
      case sql.get_all_tasks(conn.db) {
        Ok(returned) -> Ok(list.map(returned.rows, all_tasks_row_to_tasks_row))
        Error(err) -> Error(err)
      }
  }
}

pub fn add_task(
  conn: DatabaseConnection,
  project_id: Int,
  title: String,
  description: String,
  assigned_to: Option(Int),
  status: String,
  priority: String,
  due_date: Option(Date),
  hours_logged: Float,
) -> Result(List(sql.AddTaskWithNullsRow), pog.QueryError) {
  let assigned_id = case assigned_to {
    Some(id) -> id
    None -> 0
    // Will be converted to NULL by NULLIF
  }
  let due = case due_date {
    Some(date) -> date
    None -> Date(1900, January, 1)
    // Will be converted to NULL by NULLIF
  }
  case
    sql.add_task_with_nulls(
      conn.db,
      project_id,
      title,
      description,
      assigned_id,
      status,
      priority,
      due,
      hours_logged,
    )
  {
    Ok(returned) -> Ok(returned.rows)
    Error(err) -> Error(err)
  }
}

pub fn update_task(
  conn: DatabaseConnection,
  id: Int,
  project_id: Int,
  title: String,
  description: String,
  assigned_to: Option(Int),
  status: String,
  priority: String,
  due_date: Option(Date),
  hours_logged: Float,
) -> Result(List(sql.UpdateTaskRow), pog.QueryError) {
  let assigned_id = case assigned_to {
    Some(id) -> id
    None -> 0
    // Will be converted to NULL by NULLIF
  }
  let due = case due_date {
    Some(date) -> date
    None -> Date(1900, January, 1)
    // Will be converted to NULL by NULLIF
  }
  case
    sql.update_task(
      conn.db,
      id,
      project_id,
      title,
      description,
      assigned_id,
      status,
      priority,
      due,
      hours_logged,
    )
  {
    Ok(returned) -> Ok(returned.rows)
    Error(err) -> Error(err)
  }
}

// Team member functions
pub fn get_team_members(
  conn: DatabaseConnection,
) -> Result(List(sql.GetTeamMembersRow), pog.QueryError) {
  case sql.get_team_members(conn.db) {
    Ok(returned) -> Ok(returned.rows)
    Error(err) -> Error(err)
  }
}

// Dashboard stats
pub fn get_dashboard_stats(
  conn: DatabaseConnection,
) -> Result(List(sql.GetDashboardStatsRow), pog.QueryError) {
  case sql.get_dashboard_stats(conn.db) {
    Ok(returned) -> Ok(returned.rows)
    Error(err) -> Error(err)
  }
}

// Dashboard data (stats + recent projects/tasks)
pub fn get_dashboard_data(
  conn: DatabaseConnection,
) -> Result(List(sql.GetDashboardDataRow), pog.QueryError) {
  case sql.get_dashboard_data(conn.db) {
    Ok(returned) -> Ok(returned.rows)
    Error(err) -> Error(err)
  }
}
