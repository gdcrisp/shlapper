import gleam/option.{type Option}
import gleam/time/calendar.{type Date}

// Enums for type safety
pub type ProjectStatus {
  ProjectPlanning
  ProjectInProgress
  ProjectOnHold
  ProjectCompleted
  ProjectCancelled
}

pub type TaskStatus {
  TaskPending
  TaskInProgress
  TaskInReview
  TaskCompleted
  TaskBlocked
}

pub type TaskPriority {
  TaskLow
  TaskMedium
  TaskHigh
  TaskCritical
}

pub type ProjectColor {
  ProjectBlue
  ProjectLightBlue
  ProjectSky
  ProjectDeepPurple
  ProjectIndigo
  ProjectGreen
  ProjectLime
  ProjectLightGreen
  ProjectRed
  ProjectYellow
  ProjectPurple
  ProjectAmber
  ProjectDeepOrange
  ProjectOrange
  ProjectPink
  ProjectTeal
  ProjectCyan
}

// Core domain types
pub type Project {
  Project(
    id: Int,
    name: String,
    description: String,
    deadline: Option(Date),
    status: ProjectStatus,
    color: ProjectColor,
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
    status: TaskStatus,
    priority: TaskPriority,
    due_date: Option(Date),
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

// API Request types - now using enums for type safety!
pub type CreateProjectRequest {
  CreateProjectRequest(
    name: String,
    description: String,
    deadline: String,
    // Will be parsed to Date
    status: ProjectStatus,
    // Now using enum directly!
    color: ProjectColor,
    // Now using enum directly!
  )
}

pub type UpdateProjectRequest {
  UpdateProjectRequest(
    name: String,
    description: String,
    deadline: String,
    // Will be parsed to Date
    status: ProjectStatus,
    // Now using enum directly!
    color: ProjectColor,
    // Now using enum directly!
  )
}

pub type CreateTaskRequest {
  CreateTaskRequest(
    project_id: Int,
    title: String,
    description: String,
    assigned_to: Option(Int),
    status: TaskStatus,
    // Now using enum directly!
    priority: TaskPriority,
    // Now using enum directly!
    due_date: Option(String),
    // Will be parsed to Date
    hours_logged: Float,
  )
}

pub type UpdateTaskRequest {
  UpdateTaskRequest(
    project_id: Int,
    title: String,
    description: String,
    assigned_to: Option(Int),
    status: TaskStatus,
    // Now using enum directly!
    priority: TaskPriority,
    // Now using enum directly!
    due_date: Option(String),
    // Will be parsed to Date
    hours_logged: Float,
  )
}

// Conversion functions from string to enums
pub fn project_status_from_string(str: String) -> Result(ProjectStatus, String) {
  case str {
    "planning" -> Ok(ProjectPlanning)
    "active" -> Ok(ProjectInProgress)
    "on_hold" -> Ok(ProjectOnHold)
    "completed" -> Ok(ProjectCompleted)
    "cancelled" -> Ok(ProjectCancelled)
    _ -> Error("Invalid project status: " <> str)
  }
}

pub fn project_status_to_string(status: ProjectStatus) -> String {
  case status {
    ProjectPlanning -> "planning"
    ProjectInProgress -> "active"
    ProjectOnHold -> "on_hold"
    ProjectCompleted -> "completed"
    ProjectCancelled -> "cancelled"
  }
}

pub fn task_status_from_string(str: String) -> Result(TaskStatus, String) {
  case str {
    "pending" -> Ok(TaskPending)
    "in_progress" -> Ok(TaskInProgress)
    "review" -> Ok(TaskInReview)
    "completed" -> Ok(TaskCompleted)
    "blocked" -> Ok(TaskBlocked)
    _ -> Error("Invalid task status: " <> str)
  }
}

pub fn task_status_to_string(status: TaskStatus) -> String {
  case status {
    TaskPending -> "pending"
    TaskInProgress -> "in_progress"
    TaskInReview -> "review"
    TaskCompleted -> "completed"
    TaskBlocked -> "blocked"
  }
}

pub fn task_priority_from_string(str: String) -> Result(TaskPriority, String) {
  case str {
    "low" -> Ok(TaskLow)
    "medium" -> Ok(TaskMedium)
    "high" -> Ok(TaskHigh)
    "critical" -> Ok(TaskCritical)
    _ -> Error("Invalid task priority: " <> str)
  }
}

pub fn task_priority_to_string(priority: TaskPriority) -> String {
  case priority {
    TaskLow -> "low"
    TaskMedium -> "medium"
    TaskHigh -> "high"
    TaskCritical -> "critical"
  }
}

pub fn project_color_to_string(color: ProjectColor) -> String {
  case color {
    ProjectBlue -> "blue"
    ProjectGreen -> "green"
    ProjectRed -> "red"
    ProjectYellow -> "yellow"
    ProjectPurple -> "purple"
    ProjectOrange -> "orange"
    ProjectPink -> "pink"
    ProjectTeal -> "teal"
    ProjectLightBlue -> "light-blue"
    ProjectDeepPurple -> "deep-purple"
    ProjectIndigo -> "indigo"
    ProjectSky -> "sky"
    ProjectLime -> "lime"
    ProjectLightGreen -> "light-green"
    ProjectAmber -> "amber"
    ProjectDeepOrange -> "deep-orange"
    ProjectCyan -> "cyan"
  }
}

pub fn project_color_from_string(str: String) -> Result(ProjectColor, String) {
  case str {
    "blue" -> Ok(ProjectBlue)
    "green" -> Ok(ProjectGreen)
    "red" -> Ok(ProjectRed)
    "yellow" -> Ok(ProjectYellow)
    "purple" -> Ok(ProjectPurple)
    "orange" -> Ok(ProjectOrange)
    "pink" -> Ok(ProjectPink)
    "teal" -> Ok(ProjectTeal)
    "light-blue" -> Ok(ProjectLightBlue)
    "deep-purple" -> Ok(ProjectDeepPurple)
    "indigo" -> Ok(ProjectIndigo)
    "sky" -> Ok(ProjectSky)
    "lime" -> Ok(ProjectLime)
    "light-green" -> Ok(ProjectLightGreen)
    "amber" -> Ok(ProjectAmber)
    "deep-orange" -> Ok(ProjectDeepOrange)
    "cyan" -> Ok(ProjectCyan)
    _ -> Error("Invalid project color: " <> str)
  }
}
