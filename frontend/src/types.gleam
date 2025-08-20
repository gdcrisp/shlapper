import gleam/option.{type Option}

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
    status: String,
    color: String,
  )
}

pub type TaskForm {
  TaskForm(
    project_id: Int,
    title: String,
    description: String,
    status: String,
    priority: String,
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
