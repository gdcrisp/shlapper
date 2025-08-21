import gleam/option.{type Option}
import shared_types

// Re-export the main types from shared_types
pub type DashboardStats = shared_types.DashboardStats
pub type Project = shared_types.Project
pub type Task = shared_types.Task
pub type TeamMember = shared_types.TeamMember
pub type ProjectStatus = shared_types.ProjectStatus
pub type TaskStatus = shared_types.TaskStatus
pub type TaskPriority = shared_types.TaskPriority
pub type ProjectColor = shared_types.ProjectColor

// Frontend-specific types
pub type CacheInfo {
  CacheInfo(is_loading: Bool, last_fetched: Int, is_valid: Bool)
}

pub type LoadingStates {
  LoadingStates(
    dashboard: CacheInfo,
    projects: CacheInfo,
    tasks: CacheInfo,
    team: CacheInfo,
  )
}

pub type View {
  DashboardView
  ProjectsView
  TasksView(project_id: Option(Int))
  TeamView
}

pub type ProjectForm {
  ProjectForm(
    name: String,
    description: String,
    deadline: String,
    status: ProjectStatus,
    color: ProjectColor,
  )
}

pub type TaskForm {
  TaskForm(
    project_id: Int,
    title: String,
    description: String,
    status: TaskStatus,
    priority: TaskPriority,
    assigned_to: Option(Int),
    due_date: Option(String),
    hours_logged: Float,
  )
}

pub type DragState {
  NoDrag
  DraggingTask(task_id: Int, placeholder_position: Option(Int))
  DraggingProject(project_id: Int, placeholder_position: Option(Int))
}

pub type FormState {
  NoForm
  ShowingProjectForm(ProjectForm)
  ShowingTaskForm(TaskForm)
  EditingProject(Int, ProjectForm)
  EditingTask(Int, TaskForm)
}
