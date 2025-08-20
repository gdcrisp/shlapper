//// This module contains the code to run the sql queries defined in
//// `./src/backend/sql`.
//// > 🐿️ This module was generated automatically using v4.2.0 of
//// > the [squirrel package](https://github.com/giacomocavalieri/squirrel).
////

import gleam/dynamic/decode
import gleam/option.{type Option}
import gleam/time/calendar.{type Date}
import pog

/// Migration: Add color column to projects table
///
/// > 🐿️ This function was generated automatically using v4.2.0 of
/// > the [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub fn add_color_column(db) {
  let decoder = decode.map(decode.dynamic, fn(_) { Nil })

  "-- Migration: Add color column to projects table
ALTER TABLE projects 
ADD COLUMN color VARCHAR(20) DEFAULT 'blue' CHECK (color IN ('red', 'pink', 'purple', 'deep-purple', 'indigo', 'blue', 'light-blue', 'cyan', 'teal', 'green', 'light-green', 'lime', 'yellow', 'amber', 'orange', 'deep-orange'));"
  |> pog.query
  |> pog.returning(decoder)
  |> pog.execute(db)
}

/// A row you get from running the `add_project` query
/// defined in `./src/backend/sql/add_project.sql`.
///
/// > 🐿️ This type definition was generated automatically using v4.2.0 of the
/// > [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub type AddProjectRow {
  AddProjectRow(
    id: Int,
    name: String,
    description: Option(String),
    deadline: Option(Date),
    status: Option(String),
    color: Option(String),
    created_at: String,
  )
}

/// Insert a new project into the projects table
///
/// > 🐿️ This function was generated automatically using v4.2.0 of
/// > the [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub fn add_project(db, arg_1, arg_2, arg_3, arg_4, arg_5) {
  let decoder = {
    use id <- decode.field(0, decode.int)
    use name <- decode.field(1, decode.string)
    use description <- decode.field(2, decode.optional(decode.string))
    use deadline <- decode.field(
      3,
      decode.optional(pog.calendar_date_decoder()),
    )
    use status <- decode.field(4, decode.optional(decode.string))
    use color <- decode.field(5, decode.optional(decode.string))
    use created_at <- decode.field(6, decode.string)
    decode.success(AddProjectRow(
      id:,
      name:,
      description:,
      deadline:,
      status:,
      color:,
      created_at:,
    ))
  }

  "-- Insert a new project into the projects table
INSERT INTO projects (name, description, deadline, status, color)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, name, description, deadline, status, color,
         to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at;"
  |> pog.query
  |> pog.parameter(pog.text(arg_1))
  |> pog.parameter(pog.text(arg_2))
  |> pog.parameter(pog.calendar_date(arg_3))
  |> pog.parameter(pog.text(arg_4))
  |> pog.parameter(pog.text(arg_5))
  |> pog.returning(decoder)
  |> pog.execute(db)
}

/// A row you get from running the `add_task` query
/// defined in `./src/backend/sql/add_task.sql`.
///
/// > 🐿️ This type definition was generated automatically using v4.2.0 of the
/// > [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub type AddTaskRow {
  AddTaskRow(
    id: Int,
    project_id: Int,
    title: String,
    description: Option(String),
    assigned_to: Option(Int),
    status: Option(String),
    priority: Option(String),
    due_date: Option(Date),
    hours_logged: Option(Float),
  )
}

/// Insert a new task into the tasks table
///
/// > 🐿️ This function was generated automatically using v4.2.0 of
/// > the [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub fn add_task(db, arg_1, arg_2, arg_3, arg_4, arg_5, arg_6, arg_7, arg_8) {
  let decoder = {
    use id <- decode.field(0, decode.int)
    use project_id <- decode.field(1, decode.int)
    use title <- decode.field(2, decode.string)
    use description <- decode.field(3, decode.optional(decode.string))
    use assigned_to <- decode.field(4, decode.optional(decode.int))
    use status <- decode.field(5, decode.optional(decode.string))
    use priority <- decode.field(6, decode.optional(decode.string))
    use due_date <- decode.field(
      7,
      decode.optional(pog.calendar_date_decoder()),
    )
    use hours_logged <- decode.field(8, decode.optional(pog.numeric_decoder()))
    decode.success(AddTaskRow(
      id:,
      project_id:,
      title:,
      description:,
      assigned_to:,
      status:,
      priority:,
      due_date:,
      hours_logged:,
    ))
  }

  "-- Insert a new task into the tasks table
INSERT INTO tasks (project_id, title, description, assigned_to, status, priority, due_date, hours_logged)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, project_id, title, description, assigned_to, status, priority,
         due_date, hours_logged;"
  |> pog.query
  |> pog.parameter(pog.int(arg_1))
  |> pog.parameter(pog.text(arg_2))
  |> pog.parameter(pog.text(arg_3))
  |> pog.parameter(pog.int(arg_4))
  |> pog.parameter(pog.text(arg_5))
  |> pog.parameter(pog.text(arg_6))
  |> pog.parameter(pog.calendar_date(arg_7))
  |> pog.parameter(pog.float(arg_8))
  |> pog.returning(decoder)
  |> pog.execute(db)
}

/// A row you get from running the `add_task_with_nulls` query
/// defined in `./src/backend/sql/add_task_with_nulls.sql`.
///
/// > 🐿️ This type definition was generated automatically using v4.2.0 of the
/// > [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub type AddTaskWithNullsRow {
  AddTaskWithNullsRow(
    id: Int,
    project_id: Int,
    title: String,
    description: Option(String),
    assigned_to: Option(Int),
    status: Option(String),
    priority: Option(String),
    due_date: Option(Date),
    hours_logged: Option(Float),
  )
}

/// Insert a new task into the tasks table with proper NULL handling
///
/// > 🐿️ This function was generated automatically using v4.2.0 of
/// > the [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub fn add_task_with_nulls(
  db,
  arg_1,
  arg_2,
  arg_3,
  arg_4,
  arg_5,
  arg_6,
  arg_7,
  arg_8,
) {
  let decoder = {
    use id <- decode.field(0, decode.int)
    use project_id <- decode.field(1, decode.int)
    use title <- decode.field(2, decode.string)
    use description <- decode.field(3, decode.optional(decode.string))
    use assigned_to <- decode.field(4, decode.optional(decode.int))
    use status <- decode.field(5, decode.optional(decode.string))
    use priority <- decode.field(6, decode.optional(decode.string))
    use due_date <- decode.field(
      7,
      decode.optional(pog.calendar_date_decoder()),
    )
    use hours_logged <- decode.field(8, decode.optional(pog.numeric_decoder()))
    decode.success(AddTaskWithNullsRow(
      id:,
      project_id:,
      title:,
      description:,
      assigned_to:,
      status:,
      priority:,
      due_date:,
      hours_logged:,
    ))
  }

  "-- Insert a new task into the tasks table with proper NULL handling
INSERT INTO tasks (project_id, title, description, assigned_to, status, priority, due_date, hours_logged)
VALUES ($1, $2, $3, NULLIF($4, 0), $5, $6, NULLIF($7, '1900-01-01'::DATE), $8)
RETURNING id, project_id, title, description, assigned_to, status, priority,
         due_date, hours_logged;"
  |> pog.query
  |> pog.parameter(pog.int(arg_1))
  |> pog.parameter(pog.text(arg_2))
  |> pog.parameter(pog.text(arg_3))
  |> pog.parameter(pog.int(arg_4))
  |> pog.parameter(pog.text(arg_5))
  |> pog.parameter(pog.text(arg_6))
  |> pog.parameter(pog.calendar_date(arg_7))
  |> pog.parameter(pog.float(arg_8))
  |> pog.returning(decoder)
  |> pog.execute(db)
}

/// A row you get from running the `get_all_tasks` query
/// defined in `./src/backend/sql/get_all_tasks.sql`.
///
/// > 🐿️ This type definition was generated automatically using v4.2.0 of the
/// > [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub type GetAllTasksRow {
  GetAllTasksRow(
    id: Int,
    project_id: Int,
    title: String,
    description: Option(String),
    assigned_to: Option(Int),
    status: Option(String),
    priority: Option(String),
    due_date: Option(Date),
    hours_logged: Option(Float),
    project_name: Option(String),
    assigned_name: Option(String),
  )
}

/// Get all tasks without filtering
///
/// > 🐿️ This function was generated automatically using v4.2.0 of
/// > the [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub fn get_all_tasks(db) {
  let decoder = {
    use id <- decode.field(0, decode.int)
    use project_id <- decode.field(1, decode.int)
    use title <- decode.field(2, decode.string)
    use description <- decode.field(3, decode.optional(decode.string))
    use assigned_to <- decode.field(4, decode.optional(decode.int))
    use status <- decode.field(5, decode.optional(decode.string))
    use priority <- decode.field(6, decode.optional(decode.string))
    use due_date <- decode.field(
      7,
      decode.optional(pog.calendar_date_decoder()),
    )
    use hours_logged <- decode.field(8, decode.optional(pog.numeric_decoder()))
    use project_name <- decode.field(9, decode.optional(decode.string))
    use assigned_name <- decode.field(10, decode.optional(decode.string))
    decode.success(GetAllTasksRow(
      id:,
      project_id:,
      title:,
      description:,
      assigned_to:,
      status:,
      priority:,
      due_date:,
      hours_logged:,
      project_name:,
      assigned_name:,
    ))
  }

  "-- Get all tasks without filtering
SELECT t.id, t.project_id, t.title, t.description, t.assigned_to, 
       t.status, t.priority, t.due_date, t.hours_logged,
       p.name as project_name,
       tm.name as assigned_name
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN team_members tm ON t.assigned_to = tm.id
ORDER BY t.created_at DESC;"
  |> pog.query
  |> pog.returning(decoder)
  |> pog.execute(db)
}

/// A row you get from running the `get_dashboard_data` query
/// defined in `./src/backend/sql/get_dashboard_data.sql`.
///
/// > 🐿️ This type definition was generated automatically using v4.2.0 of the
/// > [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub type GetDashboardDataRow {
  GetDashboardDataRow(
    total_projects: Int,
    active_projects: Int,
    completed_tasks: Int,
    pending_tasks: Int,
    team_members: Int,
    total_hours: Float,
    recent_projects: String,
    recent_tasks: String,
  )
}

/// Get dashboard data with recent projects and tasks in a single query
///
/// > 🐿️ This function was generated automatically using v4.2.0 of
/// > the [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub fn get_dashboard_data(db) {
  let decoder = {
    use total_projects <- decode.field(0, decode.int)
    use active_projects <- decode.field(1, decode.int)
    use completed_tasks <- decode.field(2, decode.int)
    use pending_tasks <- decode.field(3, decode.int)
    use team_members <- decode.field(4, decode.int)
    use total_hours <- decode.field(5, pog.numeric_decoder())
    use recent_projects <- decode.field(6, decode.string)
    use recent_tasks <- decode.field(7, decode.string)
    decode.success(GetDashboardDataRow(
      total_projects:,
      active_projects:,
      completed_tasks:,
      pending_tasks:,
      team_members:,
      total_hours:,
      recent_projects:,
      recent_tasks:,
    ))
  }

  "-- Get dashboard data with recent projects and tasks in a single query
WITH recent_projects AS (
    SELECT id, name, description, deadline, status,
           to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
    FROM projects
    ORDER BY created_at DESC
    LIMIT 5
),
recent_tasks AS (
    SELECT t.id, t.project_id, t.title, t.description, t.assigned_to, 
           t.status, t.priority, t.due_date, t.hours_logged,
           p.name as project_name,
           tm.name as assigned_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN team_members tm ON t.assigned_to = tm.id
    ORDER BY t.created_at DESC
    LIMIT 5
)
SELECT 
    -- Dashboard stats
    (SELECT COUNT(*) FROM projects) as total_projects,
    (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
    (SELECT COUNT(*) FROM tasks WHERE status = 'completed') as completed_tasks,
    (SELECT COUNT(*) FROM tasks WHERE status != 'completed') as pending_tasks,
    (SELECT COUNT(*) FROM team_members) as team_members,
    (SELECT COALESCE(SUM(hours_logged), 0) FROM tasks) as total_hours,
    -- Recent projects (as JSON array)
    (SELECT COALESCE(json_agg(
        json_build_object(
            'id', id,
            'name', name,
            'description', COALESCE(description, ''),
            'deadline', COALESCE(to_char(deadline, 'YYYY-MM-DD'), ''),
            'status', COALESCE(status, 'active'),
            'created_at', created_at
        )
    ), '[]'::json) FROM recent_projects) as recent_projects,
    -- Recent tasks (as JSON array)
    (SELECT COALESCE(json_agg(
        json_build_object(
            'id', id,
            'project_id', project_id,
            'title', title,
            'description', COALESCE(description, ''),
            'assigned_to', assigned_to,
            'status', COALESCE(status, 'pending'),
            'priority', COALESCE(priority, 'medium'),
            'due_date', CASE WHEN due_date IS NOT NULL THEN to_char(due_date, 'YYYY-MM-DD') ELSE NULL END,
            'hours_logged', COALESCE(hours_logged, 0.0)
        )
    ), '[]'::json) FROM recent_tasks) as recent_tasks;"
  |> pog.query
  |> pog.returning(decoder)
  |> pog.execute(db)
}

/// A row you get from running the `get_dashboard_stats` query
/// defined in `./src/backend/sql/get_dashboard_stats.sql`.
///
/// > 🐿️ This type definition was generated automatically using v4.2.0 of the
/// > [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub type GetDashboardStatsRow {
  GetDashboardStatsRow(
    total_projects: Int,
    active_projects: Int,
    completed_tasks: Int,
    pending_tasks: Int,
    team_members: Int,
    total_hours: Float,
  )
}

/// Get dashboard statistics
///
/// > 🐿️ This function was generated automatically using v4.2.0 of
/// > the [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub fn get_dashboard_stats(db) {
  let decoder = {
    use total_projects <- decode.field(0, decode.int)
    use active_projects <- decode.field(1, decode.int)
    use completed_tasks <- decode.field(2, decode.int)
    use pending_tasks <- decode.field(3, decode.int)
    use team_members <- decode.field(4, decode.int)
    use total_hours <- decode.field(5, pog.numeric_decoder())
    decode.success(GetDashboardStatsRow(
      total_projects:,
      active_projects:,
      completed_tasks:,
      pending_tasks:,
      team_members:,
      total_hours:,
    ))
  }

  "-- Get dashboard statistics
SELECT 
  (SELECT COUNT(*) FROM projects) as total_projects,
  (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
  (SELECT COUNT(*) FROM tasks WHERE status = 'completed') as completed_tasks,
  (SELECT COUNT(*) FROM tasks WHERE status != 'completed') as pending_tasks,
  (SELECT COUNT(*) FROM team_members) as team_members,
  (SELECT COALESCE(SUM(hours_logged), 0) FROM tasks) as total_hours;"
  |> pog.query
  |> pog.returning(decoder)
  |> pog.execute(db)
}

/// A row you get from running the `get_projects` query
/// defined in `./src/backend/sql/get_projects.sql`.
///
/// > 🐿️ This type definition was generated automatically using v4.2.0 of the
/// > [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub type GetProjectsRow {
  GetProjectsRow(
    id: Int,
    name: String,
    description: Option(String),
    deadline: Option(Date),
    status: Option(String),
    color: Option(String),
    created_at: String,
  )
}

/// Get all projects with optional filtering
///
/// > 🐿️ This function was generated automatically using v4.2.0 of
/// > the [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub fn get_projects(db) {
  let decoder = {
    use id <- decode.field(0, decode.int)
    use name <- decode.field(1, decode.string)
    use description <- decode.field(2, decode.optional(decode.string))
    use deadline <- decode.field(
      3,
      decode.optional(pog.calendar_date_decoder()),
    )
    use status <- decode.field(4, decode.optional(decode.string))
    use color <- decode.field(5, decode.optional(decode.string))
    use created_at <- decode.field(6, decode.string)
    decode.success(GetProjectsRow(
      id:,
      name:,
      description:,
      deadline:,
      status:,
      color:,
      created_at:,
    ))
  }

  "-- Get all projects with optional filtering
SELECT id, name, description, deadline, status, color,
       to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM projects
ORDER BY created_at DESC;"
  |> pog.query
  |> pog.returning(decoder)
  |> pog.execute(db)
}

/// A row you get from running the `get_tasks` query
/// defined in `./src/backend/sql/get_tasks.sql`.
///
/// > 🐿️ This type definition was generated automatically using v4.2.0 of the
/// > [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub type GetTasksRow {
  GetTasksRow(
    id: Int,
    project_id: Int,
    title: String,
    description: Option(String),
    assigned_to: Option(Int),
    status: Option(String),
    priority: Option(String),
    due_date: Option(Date),
    hours_logged: Option(Float),
    project_name: Option(String),
    assigned_name: Option(String),
  )
}

/// Get all tasks with optional project filtering
///
/// > 🐿️ This function was generated automatically using v4.2.0 of
/// > the [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub fn get_tasks(db, arg_1) {
  let decoder = {
    use id <- decode.field(0, decode.int)
    use project_id <- decode.field(1, decode.int)
    use title <- decode.field(2, decode.string)
    use description <- decode.field(3, decode.optional(decode.string))
    use assigned_to <- decode.field(4, decode.optional(decode.int))
    use status <- decode.field(5, decode.optional(decode.string))
    use priority <- decode.field(6, decode.optional(decode.string))
    use due_date <- decode.field(
      7,
      decode.optional(pog.calendar_date_decoder()),
    )
    use hours_logged <- decode.field(8, decode.optional(pog.numeric_decoder()))
    use project_name <- decode.field(9, decode.optional(decode.string))
    use assigned_name <- decode.field(10, decode.optional(decode.string))
    decode.success(GetTasksRow(
      id:,
      project_id:,
      title:,
      description:,
      assigned_to:,
      status:,
      priority:,
      due_date:,
      hours_logged:,
      project_name:,
      assigned_name:,
    ))
  }

  "-- Get all tasks with optional project filtering
SELECT t.id, t.project_id, t.title, t.description, t.assigned_to, 
       t.status, t.priority, t.due_date, t.hours_logged,
       p.name as project_name,
       tm.name as assigned_name
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN team_members tm ON t.assigned_to = tm.id
WHERE ($1 = 0 OR t.project_id = $1)
ORDER BY t.created_at DESC;"
  |> pog.query
  |> pog.parameter(pog.int(arg_1))
  |> pog.returning(decoder)
  |> pog.execute(db)
}

/// A row you get from running the `get_team_members` query
/// defined in `./src/backend/sql/get_team_members.sql`.
///
/// > 🐿️ This type definition was generated automatically using v4.2.0 of the
/// > [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub type GetTeamMembersRow {
  GetTeamMembersRow(id: Int, name: String, email: String, role: Option(String))
}

/// Get all team members
///
/// > 🐿️ This function was generated automatically using v4.2.0 of
/// > the [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub fn get_team_members(db) {
  let decoder = {
    use id <- decode.field(0, decode.int)
    use name <- decode.field(1, decode.string)
    use email <- decode.field(2, decode.string)
    use role <- decode.field(3, decode.optional(decode.string))
    decode.success(GetTeamMembersRow(id:, name:, email:, role:))
  }

  "-- Get all team members
SELECT id, name, email, role
FROM team_members
ORDER BY name;"
  |> pog.query
  |> pog.returning(decoder)
  |> pog.execute(db)
}

/// A row you get from running the `update_project` query
/// defined in `./src/backend/sql/update_project.sql`.
///
/// > 🐿️ This type definition was generated automatically using v4.2.0 of the
/// > [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub type UpdateProjectRow {
  UpdateProjectRow(
    id: Int,
    name: String,
    description: Option(String),
    deadline: Option(Date),
    status: Option(String),
    color: Option(String),
    created_at: String,
    updated_at: String,
  )
}

/// Update an existing project in the projects table
///
/// > 🐿️ This function was generated automatically using v4.2.0 of
/// > the [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub fn update_project(db, arg_1, arg_2, arg_3, arg_4, arg_5, arg_6) {
  let decoder = {
    use id <- decode.field(0, decode.int)
    use name <- decode.field(1, decode.string)
    use description <- decode.field(2, decode.optional(decode.string))
    use deadline <- decode.field(
      3,
      decode.optional(pog.calendar_date_decoder()),
    )
    use status <- decode.field(4, decode.optional(decode.string))
    use color <- decode.field(5, decode.optional(decode.string))
    use created_at <- decode.field(6, decode.string)
    use updated_at <- decode.field(7, decode.string)
    decode.success(UpdateProjectRow(
      id:,
      name:,
      description:,
      deadline:,
      status:,
      color:,
      created_at:,
      updated_at:,
    ))
  }

  "-- Update an existing project in the projects table
UPDATE projects 
SET name = $2,
    description = $3,
    deadline = $4,
    status = $5,
    color = $6,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING id, name, description, deadline, status, color,
         to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
         to_char(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at;"
  |> pog.query
  |> pog.parameter(pog.int(arg_1))
  |> pog.parameter(pog.text(arg_2))
  |> pog.parameter(pog.text(arg_3))
  |> pog.parameter(pog.calendar_date(arg_4))
  |> pog.parameter(pog.text(arg_5))
  |> pog.parameter(pog.text(arg_6))
  |> pog.returning(decoder)
  |> pog.execute(db)
}

/// A row you get from running the `update_task` query
/// defined in `./src/backend/sql/update_task.sql`.
///
/// > 🐿️ This type definition was generated automatically using v4.2.0 of the
/// > [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub type UpdateTaskRow {
  UpdateTaskRow(
    id: Int,
    project_id: Int,
    title: String,
    description: Option(String),
    assigned_to: Option(Int),
    status: Option(String),
    priority: Option(String),
    due_date: Option(Date),
    hours_logged: Option(Float),
  )
}

/// Update an existing task in the tasks table with proper NULL handling
///
/// > 🐿️ This function was generated automatically using v4.2.0 of
/// > the [squirrel package](https://github.com/giacomocavalieri/squirrel).
///
pub fn update_task(
  db,
  arg_1,
  arg_2,
  arg_3,
  arg_4,
  arg_5,
  arg_6,
  arg_7,
  arg_8,
  arg_9,
) {
  let decoder = {
    use id <- decode.field(0, decode.int)
    use project_id <- decode.field(1, decode.int)
    use title <- decode.field(2, decode.string)
    use description <- decode.field(3, decode.optional(decode.string))
    use assigned_to <- decode.field(4, decode.optional(decode.int))
    use status <- decode.field(5, decode.optional(decode.string))
    use priority <- decode.field(6, decode.optional(decode.string))
    use due_date <- decode.field(
      7,
      decode.optional(pog.calendar_date_decoder()),
    )
    use hours_logged <- decode.field(8, decode.optional(pog.numeric_decoder()))
    decode.success(UpdateTaskRow(
      id:,
      project_id:,
      title:,
      description:,
      assigned_to:,
      status:,
      priority:,
      due_date:,
      hours_logged:,
    ))
  }

  "-- Update an existing task in the tasks table with proper NULL handling
UPDATE tasks 
SET project_id = $2,
    title = $3, 
    description = $4,
    assigned_to = NULLIF($5, 0),
    status = $6,
    priority = $7,
    due_date = NULLIF($8, '1900-01-01'::DATE),
    hours_logged = $9,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING id, project_id, title, description, assigned_to, status, priority,
         due_date, hours_logged;"
  |> pog.query
  |> pog.parameter(pog.int(arg_1))
  |> pog.parameter(pog.int(arg_2))
  |> pog.parameter(pog.text(arg_3))
  |> pog.parameter(pog.text(arg_4))
  |> pog.parameter(pog.int(arg_5))
  |> pog.parameter(pog.text(arg_6))
  |> pog.parameter(pog.text(arg_7))
  |> pog.parameter(pog.calendar_date(arg_8))
  |> pog.parameter(pog.float(arg_9))
  |> pog.returning(decoder)
  |> pog.execute(db)
}
