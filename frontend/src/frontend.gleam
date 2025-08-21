import gleam/dynamic/decode
import gleam/int
import gleam/io
import gleam/json
import gleam/list
import gleam/option.{type Option}
import gleam/result
import lustre
import lustre/attribute
import lustre/effect.{type Effect}
import lustre/element.{type Element}
import lustre/element/html
import lustre/element/svg
import lustre/event
import pages/dashboard
import pages/projects
import pages/tasks
import pages/team
import rsvp
import shared_types
import types.{
  type CacheInfo, type DashboardStats, type FormState, type LoadingStates,
  type Project, type ProjectForm, type Task, type TaskForm, type TeamMember,
  type View, CacheInfo, DashboardView, EditingProject,
  EditingTask, LoadingStates, NoForm, ProjectForm, ProjectsView,
  ShowingProjectForm, ShowingTaskForm, TaskForm, TasksView,
  TeamView,
}

// MAIN ------------------------------------------------------------------------

@external(javascript, "./app.ffi.mjs", "getCurrentTimestamp")
fn get_current_timestamp() -> Int

fn setup_drag_drop_effect() -> Effect(Msg) {
  use dispatch <- effect.from
  let handler = fn(event_detail) {
    case event_detail {
      #("task", id, new_status) -> dispatch(UpdateTaskStatus(id, new_status))
      #("project", id, new_status) ->
        dispatch(UpdateProjectStatus(id, new_status))
      _ -> Nil
    }
  }
  setup_drag_and_drop_listener(handler)
}

@external(javascript, "./app.ffi.mjs", "setupDragAndDropListener")
fn setup_drag_and_drop_listener(
  handler: fn(#(String, Int, String)) -> Nil,
) -> Nil

@external(javascript, "./app.ffi.mjs", "clearDragUpdateState")
fn clear_drag_update_state(item_type: String, item_id: Int) -> Nil

fn create_fresh_cache() -> CacheInfo {
  CacheInfo(is_loading: False, last_fetched: 0, is_valid: False)
}

fn create_loaded_cache() -> CacheInfo {
  CacheInfo(
    is_loading: False,
    last_fetched: get_current_timestamp(),
    is_valid: True,
  )
}

pub fn main() {
  let app = lustre.application(init, update, view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)
  Nil
}

// MODEL -----------------------------------------------------------------------

type Model {
  Loading
  Loaded(
    dashboard: DashboardStats,
    projects: List(Project),
    tasks: List(Task),
    team_members: List(TeamMember),
    current_view: View,
    loading_states: LoadingStates,
    form_state: FormState,
  )
  LoadingFailed(rsvp.Error)
}

// Decoders
fn project_decoder() -> decode.Decoder(Project) {
  use id <- decode.field("id", decode.int)
  use name <- decode.field("name", decode.string)
  use description <- decode.field("description", decode.string)
  use deadline <- decode.field("deadline", decode.string)
  use status_str <- decode.field("status", decode.string)
  use color_str <- decode.field("color", decode.string)
  use created_at <- decode.field("created_at", decode.string)
  
  let status = shared_types.project_status_from_string(status_str) 
    |> result.unwrap(shared_types.ProjectPlanning)
  let color = shared_types.project_color_from_string(color_str)
    |> result.unwrap(shared_types.ProjectBlue)
  
  decode.success(shared_types.Project(
    id:,
    name:,
    description:,
    deadline:,
    status:,
    color:,
    created_at:,
  ))
}

fn task_decoder() -> decode.Decoder(Task) {
  use id <- decode.field("id", decode.int)
  use project_id <- decode.field("project_id", decode.int)
  use title <- decode.field("title", decode.string)
  use description <- decode.field("description", decode.string)
  use assigned_to <- decode.field("assigned_to", decode.optional(decode.int))
  use status_str <- decode.field("status", decode.string)
  use priority_str <- decode.field("priority", decode.string)
  use due_date <- decode.field("due_date", decode.optional(decode.string))
  use hours_logged <- decode.field("hours_logged", decode.float)
  
  let status = shared_types.task_status_from_string(status_str)
    |> result.unwrap(shared_types.TaskPending)
  let priority = shared_types.task_priority_from_string(priority_str)
    |> result.unwrap(shared_types.TaskMedium)
  
  decode.success(shared_types.Task(
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

fn team_member_decoder() -> decode.Decoder(TeamMember) {
  use id <- decode.field("id", decode.int)
  use name <- decode.field("name", decode.string)
  use email <- decode.field("email", decode.string)
  use role <- decode.field("role", decode.string)
  decode.success(shared_types.TeamMember(id:, name:, email:, role:))
}

// Decoder for enhanced dashboard data that includes recent projects/tasks
fn dashboard_data_decoder() -> decode.Decoder(
  #(DashboardStats, List(Project), List(Task)),
) {
  use total_projects <- decode.field("total_projects", decode.int)
  use active_projects <- decode.field("active_projects", decode.int)
  use completed_tasks <- decode.field("completed_tasks", decode.int)
  use pending_tasks <- decode.field("pending_tasks", decode.int)
  use team_members <- decode.field("team_members", decode.int)
  use total_hours <- decode.field("total_hours", decode.float)
  use recent_projects <- decode.field(
    "recent_projects",
    decode.list(project_decoder()),
  )
  use recent_tasks <- decode.field("recent_tasks", decode.list(task_decoder()))

  let stats =
    shared_types.DashboardStats(
      total_projects:,
      active_projects:,
      completed_tasks:,
      pending_tasks:,
      team_members:,
      total_hours:,
    )

  decode.success(#(stats, recent_projects, recent_tasks))
}

fn init(_flags) -> #(Model, Effect(Msg)) {
  let empty_dashboard = shared_types.DashboardStats(0, 0, 0, 0, 0, 0.0)
  let fresh_cache = create_fresh_cache()
  let loading_states =
    LoadingStates(fresh_cache, fresh_cache, fresh_cache, fresh_cache)

  #(
    Loaded(empty_dashboard, [], [], [], DashboardView, loading_states, NoForm),
    effect.batch([
      fetch_dashboard_data(ApiReturnedDashboardData),
      fetch_projects(ApiReturnedProjects),
      fetch_tasks(ApiReturnedTasks),
      fetch_team_members(ApiReturnedTeamMembers),
      setup_drag_drop_effect(),
    ]),
  )
}

// UPDATE ----------------------------------------------------------------------

type Msg {
  ApiReturnedDashboard(Result(DashboardStats, rsvp.Error))
  ApiReturnedDashboardData(
    Result(#(DashboardStats, List(Project), List(Task)), rsvp.Error),
  )
  ApiReturnedProjects(Result(List(Project), rsvp.Error))
  ApiReturnedTasks(Result(List(Task), rsvp.Error))
  ApiReturnedTeamMembers(Result(List(TeamMember), rsvp.Error))
  ChangeView(View)
  FilterTasksByProject(Int)
  RefreshData
  ShowAddProjectForm
  ShowEditProjectForm(Int)
  ShowAddTaskForm
  ShowEditTaskForm(Int)
  CloseForm
  UpdateProjectFormName(String)
  UpdateProjectFormDescription(String)
  UpdateProjectFormDeadline(String)
  UpdateProjectFormStatus(String)
  UpdateProjectFormColor(String)
  SubmitProjectForm
  UpdateTaskFormProjectId(Int)
  UpdateTaskFormTitle(String)
  UpdateTaskFormDescription(String)
  UpdateTaskFormStatus(String)
  UpdateTaskFormPriority(String)
  UpdateTaskFormAssignedTo(Option(Int))
  UpdateTaskFormDueDate(Option(String))
  UpdateTaskFormHoursLogged(Float)
  SubmitTaskForm
  ApiProjectAdded(Result(Project, rsvp.Error))
  ApiTaskAdded(Result(Task, rsvp.Error))
  UpdateTaskStatus(Int, String)
  UpdateProjectStatus(Int, String)
  UpdateTaskHours(Int, Float)
  ApiTaskStatusUpdated(Result(Task, rsvp.Error))
  ApiProjectStatusUpdated(Result(Project, rsvp.Error))
  ApiTaskHoursUpdated(Result(Task, rsvp.Error))
}

// API functions

// New function to fetch enhanced dashboard data
fn fetch_dashboard_data(
  on_response handle_response: fn(
    Result(#(DashboardStats, List(Project), List(Task)), rsvp.Error),
  ) ->
    msg,
) -> Effect(msg) {
  let url = "http://localhost:3000/api/dashboard"
  let decoder = dashboard_data_decoder()
  let handler = rsvp.expect_json(decoder, handle_response)
  rsvp.get(url, handler)
}

fn fetch_projects(
  on_response handle_response: fn(Result(List(Project), rsvp.Error)) -> msg,
) -> Effect(msg) {
  let url = "http://localhost:3000/api/projects"
  let decoder = decode.list(project_decoder())
  let handler = rsvp.expect_json(decoder, handle_response)
  rsvp.get(url, handler)
}

fn fetch_tasks(
  on_response handle_response: fn(Result(List(Task), rsvp.Error)) -> msg,
) -> Effect(msg) {
  let url = "http://localhost:3000/api/tasks"
  let decoder = decode.list(task_decoder())
  let handler = rsvp.expect_json(decoder, handle_response)
  rsvp.get(url, handler)
}

fn fetch_team_members(
  on_response handle_response: fn(Result(List(TeamMember), rsvp.Error)) -> msg,
) -> Effect(msg) {
  let url = "http://localhost:3000/api/team"
  let decoder = decode.list(team_member_decoder())
  let handler = rsvp.expect_json(decoder, handle_response)
  rsvp.get(url, handler)
}

fn create_project(
  form: ProjectForm,
  on_response handle_response: fn(Result(Project, rsvp.Error)) -> msg,
) -> Effect(msg) {
  let url = "http://localhost:3000/api/projects"
  let decoder = project_decoder()
  let handler = rsvp.expect_json(decoder, handle_response)
  let body =
    json.object([
      #("name", json.string(form.name)),
      #("description", json.string(form.description)),
      #("deadline", json.string(form.deadline)),
      #("status", json.string(shared_types.project_status_to_string(form.status))),
      #("color", json.string(shared_types.project_color_to_string(form.color))),
    ])
  rsvp.post(url, body, handler)
}

fn update_project(
  project_id: Int,
  form: ProjectForm,
  on_response handle_response: fn(Result(Project, rsvp.Error)) -> msg,
) -> Effect(msg) {
  io.print("🔍 Frontend: update_project called for project ID: " <> int.to_string(project_id))
  io.print("🔍 Frontend: project form name: " <> form.name)
  let url = "http://localhost:3000/api/projects/" <> int.to_string(project_id)
  io.print("🔍 Frontend: making POST request to: " <> url)
  let decoder = project_decoder()
  let handler = rsvp.expect_json(decoder, handle_response)
  let body =
    json.object([
      #("name", json.string(form.name)),
      #("description", json.string(form.description)),
      #("deadline", json.string(form.deadline)),
      #("status", json.string(shared_types.project_status_to_string(form.status))),
      #("color", json.string(shared_types.project_color_to_string(form.color))),
    ])
  rsvp.post(url, body, handler)
}

fn create_task(
  form: TaskForm,
  on_response handle_response: fn(Result(Task, rsvp.Error)) -> msg,
) -> Effect(msg) {
  let url = "http://localhost:3000/api/tasks"
  let decoder = task_decoder()
  let handler = rsvp.expect_json(decoder, handle_response)
  let body =
    json.object([
      #("project_id", json.int(form.project_id)),
      #("title", json.string(form.title)),
      #("description", json.string(form.description)),
      #("status", json.string(shared_types.task_status_to_string(form.status))),
      #("priority", json.string(shared_types.task_priority_to_string(form.priority))),
      #("assigned_to", case form.assigned_to {
        option.Some(id) -> json.int(id)
        option.None -> json.null()
      }),
      #("due_date", case form.due_date {
        option.Some(date) -> json.string(date)
        option.None -> json.null()
      }),
      #("hours_logged", json.float(0.0)),
      // Default to 0.0 hours for new tasks
    ])
  rsvp.post(url, body, handler)
}

fn update_task(
  task_id: Int,
  form: TaskForm,
  on_response handle_response: fn(Result(Task, rsvp.Error)) -> msg,
) -> Effect(msg) {
  io.print("🔍 Frontend: update_task called for task ID: " <> int.to_string(task_id))
  io.print("🔍 Frontend: task form title: " <> form.title)
  let url = "http://localhost:3000/api/tasks/" <> int.to_string(task_id)
  io.print("🔍 Frontend: making POST request to: " <> url)
  let decoder = task_decoder()
  let handler = rsvp.expect_json(decoder, handle_response)
  let body =
    json.object([
      #("project_id", json.int(form.project_id)),
      #("title", json.string(form.title)),
      #("description", json.string(form.description)),
      #("status", json.string(shared_types.task_status_to_string(form.status))),
      #("priority", json.string(shared_types.task_priority_to_string(form.priority))),
      #("assigned_to", case form.assigned_to {
        option.Some(id) -> json.int(id)
        option.None -> json.null()
      }),
      #("due_date", case form.due_date {
        option.Some(date) -> json.string(date)
        option.None -> json.null()
      }),
      #("hours_logged", json.float(form.hours_logged)),
    ])
  rsvp.post(url, body, handler)
}

fn update_task_status(
  task: Task,
  new_status: String,
  on_response handle_response: fn(Result(Task, rsvp.Error)) -> msg,
) -> Effect(msg) {
  let url = "http://localhost:3000/api/tasks/" <> int.to_string(task.id)
  let decoder = task_decoder()
  let handler = rsvp.expect_json(decoder, handle_response)

  // Send the complete task object with updated status - this matches what the API expects
  let body =
    json.object([
      #("project_id", json.int(task.project_id)),
      #("title", json.string(task.title)),
      #("description", json.string(task.description)),
      #("status", json.string(new_status)),
      #("priority", json.string(shared_types.task_priority_to_string(task.priority))),
      #("assigned_to", case task.assigned_to {
        option.Some(id) -> json.int(id)
        option.None -> json.null()
      }),
      #("due_date", case task.due_date {
        option.Some(date) -> json.string(date)
        option.None -> json.null()
      }),
      #("hours_logged", json.float(task.hours_logged)),
    ])

  rsvp.post(url, body, handler)
}

fn update_project_status(
  project: Project,
  new_status: String,
  on_response handle_response: fn(Result(Project, rsvp.Error)) -> msg,
) -> Effect(msg) {
  let url = "http://localhost:3000/api/projects/" <> int.to_string(project.id)
  let decoder = project_decoder()
  let handler = rsvp.expect_json(decoder, handle_response)

  // Send the complete project object with updated status - this matches what the API expects
  let body =
    json.object([
      #("name", json.string(project.name)),
      #("description", json.string(project.description)),
      #("deadline", json.string(project.deadline)),
      #("status", json.string(new_status)),
      #("color", json.string(shared_types.project_color_to_string(project.color))),
    ])

  rsvp.post(url, body, handler)
}

fn update_task_hours(
  task: Task,
  new_hours: Float,
  on_response handle_response: fn(Result(Task, rsvp.Error)) -> msg,
) -> Effect(msg) {
  let url = "http://localhost:3000/api/tasks/" <> int.to_string(task.id)
  let decoder = task_decoder()
  let handler = rsvp.expect_json(decoder, handle_response)

  // Send the complete task object with updated hours - this matches what the API expects
  let body =
    json.object([
      #("project_id", json.int(task.project_id)),
      #("title", json.string(task.title)),
      #("description", json.string(task.description)),
      #("status", json.string(shared_types.task_status_to_string(task.status))),
      #("priority", json.string(shared_types.task_priority_to_string(task.priority))),
      #("assigned_to", case task.assigned_to {
        option.Some(id) -> json.int(id)
        option.None -> json.null()
      }),
      #("due_date", case task.due_date {
        option.Some(date) -> json.string(date)
        option.None -> json.null()
      }),
      #("hours_logged", json.float(new_hours)),
    ])

  rsvp.post(url, body, handler)
}

// UPDATE ----------------------------------------------------------------------

type LoadingData {
  LoadingData(
    dashboard: Option(DashboardStats),
    projects: Option(List(Project)),
    tasks: Option(List(Task)),
    team_members: Option(List(TeamMember)),
  )
}

fn update(model: Model, msg: Msg) -> #(Model, Effect(Msg)) {
  case model {
    Loading -> handle_loading_state(msg)
    Loaded(
      dashboard,
      projects,
      tasks,
      team_members,
      current_view,
      loading_states,
      form_state,
    ) ->
      handle_loaded_state(
        dashboard,
        projects,
        tasks,
        team_members,
        current_view,
        loading_states,
        form_state,
        msg,
      )
    LoadingFailed(_) -> #(model, effect.none())
  }
}

fn handle_loading_state(msg: Msg) -> #(Model, Effect(Msg)) {
  let initial_loading_data =
    LoadingData(
      dashboard: option.None,
      projects: option.None,
      tasks: option.None,
      team_members: option.None,
    )
  let loading_data = case msg {
    ApiReturnedDashboard(Ok(dashboard)) ->
      LoadingData(
        dashboard: option.Some(dashboard),
        projects: option.None,
        tasks: option.None,
        team_members: option.None,
      )
    ApiReturnedProjects(Ok(projects)) ->
      LoadingData(
        dashboard: option.None,
        projects: option.Some(projects),
        tasks: option.None,
        team_members: option.None,
      )
    ApiReturnedTasks(Ok(tasks)) ->
      LoadingData(
        dashboard: option.None,
        projects: option.None,
        tasks: option.Some(tasks),
        team_members: option.None,
      )
    ApiReturnedTeamMembers(Ok(team_members)) ->
      LoadingData(
        dashboard: option.None,
        projects: option.None,
        tasks: option.None,
        team_members: option.Some(team_members),
      )
    _ -> initial_loading_data
  }

  // For simplicity, let's transition to loaded state once we have any data
  case loading_data {
    LoadingData(
      dashboard: option.Some(dashboard),
      projects: option.Some(projects),
      tasks: option.Some(tasks),
      team_members: option.Some(team_members),
    ) -> {
      let loading_states =
        LoadingStates(
          create_loaded_cache(),
          create_loaded_cache(),
          create_loaded_cache(),
          create_loaded_cache(),
        )
      #(
        Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          DashboardView,
          loading_states,
          NoForm,
        ),
        effect.none(),
      )
    }
    _ -> #(Loading, effect.none())
  }
}

fn handle_loaded_state(
  dashboard: DashboardStats,
  projects: List(Project),
  tasks: List(Task),
  team_members: List(TeamMember),
  current_view: View,
  loading_states: LoadingStates,
  form_state: FormState,
  msg: Msg,
) -> #(Model, Effect(Msg)) {
  case msg {
    ApiReturnedDashboard(Ok(dashboard)) -> {
      let updated_loading_states =
        LoadingStates(..loading_states, dashboard: create_loaded_cache())
      #(
        Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          updated_loading_states,
          form_state,
        ),
        effect.none(),
      )
    }

    ApiReturnedDashboardData(Ok(#(dashboard, recent_projects, recent_tasks))) -> {
      let updated_loading_states =
        LoadingStates(..loading_states, dashboard: create_loaded_cache())
      #(
        Loaded(
          dashboard,
          recent_projects,
          recent_tasks,
          team_members,
          current_view,
          updated_loading_states,
          form_state,
        ),
        effect.none(),
      )
    }

    ApiReturnedProjects(Ok(projects)) -> {
      let updated_loading_states =
        LoadingStates(..loading_states, projects: create_loaded_cache())
      #(
        Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          updated_loading_states,
          form_state,
        ),
        effect.none(),
      )
    }

    ApiReturnedTasks(Ok(tasks)) -> {
      let updated_loading_states =
        LoadingStates(..loading_states, tasks: create_loaded_cache())
      #(
        Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          updated_loading_states,
          form_state,
        ),
        effect.none(),
      )
    }

    ApiReturnedTeamMembers(Ok(team_members)) -> {
      let updated_loading_states =
        LoadingStates(..loading_states, team: create_loaded_cache())
      #(
        Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          updated_loading_states,
          form_state,
        ),
        effect.none(),
      )
    }

    ChangeView(new_view) -> #(
      Loaded(
        dashboard,
        projects,
        tasks,
        team_members,
        new_view,
        loading_states,
        form_state,
      ),
      effect.none(),
    )

    FilterTasksByProject(project_id) -> #(
      Loaded(
        dashboard,
        projects,
        tasks,
        team_members,
        TasksView(option.Some(project_id)),
        loading_states,
        form_state,
      ),
      effect.none(),
    )

    RefreshData -> #(
      Loaded(
        dashboard,
        projects,
        tasks,
        team_members,
        current_view,
        loading_states,
        form_state,
      ),
      effect.batch([
        fetch_dashboard_data(ApiReturnedDashboardData),
        fetch_projects(ApiReturnedProjects),
        fetch_tasks(ApiReturnedTasks),
        fetch_team_members(ApiReturnedTeamMembers),
      ]),
    )

    ShowAddProjectForm -> #(
      Loaded(
        dashboard,
        projects,
        tasks,
        team_members,
        current_view,
        loading_states,
        ShowingProjectForm(ProjectForm(
          name: "",
          description: "",
          deadline: "",
          status: shared_types.ProjectPlanning,
          color: shared_types.ProjectBlue,
        )),
      ),
      effect.none(),
    )

    ShowEditProjectForm(project_id) -> {
      case list.find(projects, fn(p) { p.id == project_id }) {
        Ok(project) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            EditingProject(
              project.id,
              ProjectForm(
                name: project.name,
                description: project.description,
                deadline: project.deadline,
                status: project.status,
                color: project.color,
              ),
            ),
          ),
          effect.none(),
        )
        Error(_) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }
    }

    ShowAddTaskForm -> #(
      Loaded(
        dashboard,
        projects,
        tasks,
        team_members,
        current_view,
        loading_states,
        ShowingTaskForm(TaskForm(
          project_id: case projects {
            [first, ..] -> first.id
            [] -> 1
          },
          title: "",
          description: "",
          status: shared_types.TaskPending,
          priority: shared_types.TaskMedium,
          assigned_to: option.None,
          due_date: option.None,
          hours_logged: 0.0,
        )),
      ),
      effect.none(),
    )

    ShowEditTaskForm(task_id) -> {
      case list.find(tasks, fn(t) { t.id == task_id }) {
        Ok(task) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            EditingTask(
              task.id,
              TaskForm(
                project_id: task.project_id,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                assigned_to: task.assigned_to,
                due_date: task.due_date,
                hours_logged: task.hours_logged,
              ),
            ),
          ),
          effect.none(),
        )
        Error(_) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }
    }

    CloseForm -> #(
      Loaded(
        dashboard,
        projects,
        tasks,
        team_members,
        current_view,
        loading_states,
        NoForm,
      ),
      effect.none(),
    )

    UpdateProjectFormName(name) ->
      case form_state {
        ShowingProjectForm(form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            ShowingProjectForm(ProjectForm(
              name:,
              description: form.description,
              deadline: form.deadline,
              status: form.status,
              color: form.color,
            )),
          ),
          effect.none(),
        )
        EditingProject(project_id, form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            EditingProject(
              project_id,
              ProjectForm(
                name:,
                description: form.description,
                deadline: form.deadline,
                status: form.status,
                color: form.color,
              ),
            ),
          ),
          effect.none(),
        )
        _ -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }

    UpdateProjectFormDescription(description) ->
      case form_state {
        ShowingProjectForm(form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            ShowingProjectForm(ProjectForm(
              name: form.name,
              description:,
              deadline: form.deadline,
              status: form.status,
              color: form.color,
            )),
          ),
          effect.none(),
        )
        EditingProject(project_id, form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            EditingProject(
              project_id,
              ProjectForm(
                name: form.name,
                description:,
                deadline: form.deadline,
                status: form.status,
                color: form.color,
              ),
            ),
          ),
          effect.none(),
        )
        _ -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }

    UpdateProjectFormDeadline(deadline) ->
      case form_state {
        ShowingProjectForm(form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            ShowingProjectForm(ProjectForm(
              name: form.name,
              description: form.description,
              deadline:,
              status: form.status,
              color: form.color,
            )),
          ),
          effect.none(),
        )
        EditingProject(project_id, form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            EditingProject(
              project_id,
              ProjectForm(
                name: form.name,
                description: form.description,
                deadline:,
                status: form.status,
                color: form.color,
              ),
            ),
          ),
          effect.none(),
        )
        _ -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }

    UpdateProjectFormStatus(status) ->
      case form_state {
        ShowingProjectForm(form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            ShowingProjectForm(ProjectForm(
              name: form.name,
              description: form.description,
              deadline: form.deadline,
              status: shared_types.project_status_from_string(status) 
                |> result.unwrap(shared_types.ProjectPlanning),
              color: form.color,
            )),
          ),
          effect.none(),
        )
        EditingProject(project_id, form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            EditingProject(
              project_id,
              ProjectForm(
                name: form.name,
                description: form.description,
                deadline: form.deadline,
                status: shared_types.project_status_from_string(status)
                  |> result.unwrap(shared_types.ProjectPlanning),
                color: form.color,
              ),
            ),
          ),
          effect.none(),
        )
        _ -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }

    UpdateProjectFormColor(color) ->
      case form_state {
        ShowingProjectForm(form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            ShowingProjectForm(ProjectForm(
              name: form.name,
              description: form.description,
              deadline: form.deadline,
              status: form.status,
              color: shared_types.project_color_from_string(color)
                |> result.unwrap(shared_types.ProjectBlue),
            )),
          ),
          effect.none(),
        )
        EditingProject(project_id, form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            EditingProject(
              project_id,
              ProjectForm(
                name: form.name,
                description: form.description,
                deadline: form.deadline,
                status: form.status,
                color: shared_types.project_color_from_string(color)
                  |> result.unwrap(shared_types.ProjectBlue),
              ),
            ),
          ),
          effect.none(),
        )
        _ -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }

    SubmitProjectForm -> {
      io.print("🔍 Frontend: SubmitProjectForm message received")
      case form_state {
        ShowingProjectForm(form) -> {
          io.print("🔍 Frontend: Creating new project")
          #(
            Loaded(
              dashboard,
              projects,
              tasks,
              team_members,
              current_view,
              loading_states,
              NoForm,
            ),
            create_project(form, ApiProjectAdded),
          )
        }
        EditingProject(project_id, form) -> {
          io.print("🔍 Frontend: Editing existing project with ID: " <> int.to_string(project_id))
          #(
            Loaded(
              dashboard,
              projects,
              tasks,
              team_members,
              current_view,
              loading_states,
              NoForm,
            ),
            update_project(project_id, form, ApiProjectStatusUpdated),
          )
        }
        _ -> {
          io.print("🔍 Frontend: SubmitProjectForm called but form_state is not ShowingProjectForm or EditingProject")
          #(
            Loaded(
              dashboard,
              projects,
              tasks,
              team_members,
              current_view,
              loading_states,
              form_state,
            ),
            effect.none(),
          )
        }
      }
    }

    UpdateTaskFormProjectId(project_id) ->
      case form_state {
        ShowingTaskForm(form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            ShowingTaskForm(TaskForm(
              project_id:,
              title: form.title,
              description: form.description,
              status: form.status,
              priority: form.priority,
              assigned_to: form.assigned_to,
              due_date: form.due_date,
              hours_logged: form.hours_logged,
            )),
          ),
          effect.none(),
        )
        EditingTask(task_id, form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            EditingTask(
              task_id,
              TaskForm(
                project_id:,
                title: form.title,
                description: form.description,
                status: form.status,
                priority: form.priority,
                assigned_to: form.assigned_to,
                due_date: form.due_date,
                hours_logged: form.hours_logged,
              ),
            ),
          ),
          effect.none(),
        )
        _ -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }

    UpdateTaskFormTitle(title) ->
      case form_state {
        ShowingTaskForm(form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            ShowingTaskForm(TaskForm(
              project_id: form.project_id,
              title:,
              description: form.description,
              status: form.status,
              priority: form.priority,
              assigned_to: form.assigned_to,
              due_date: form.due_date,
              hours_logged: form.hours_logged,
            )),
          ),
          effect.none(),
        )
        EditingTask(task_id, form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            EditingTask(
              task_id,
              TaskForm(
                project_id: form.project_id,
                title:,
                description: form.description,
                status: form.status,
                priority: form.priority,
                assigned_to: form.assigned_to,
                due_date: form.due_date,
                hours_logged: form.hours_logged,
              ),
            ),
          ),
          effect.none(),
        )
        _ -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }

    UpdateTaskFormDescription(description) ->
      case form_state {
        ShowingTaskForm(form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            ShowingTaskForm(TaskForm(
              project_id: form.project_id,
              title: form.title,
              description:,
              status: form.status,
              priority: form.priority,
              assigned_to: form.assigned_to,
              due_date: form.due_date,
              hours_logged: form.hours_logged,
            )),
          ),
          effect.none(),
        )
        EditingTask(task_id, form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            EditingTask(
              task_id,
              TaskForm(
                project_id: form.project_id,
                title: form.title,
                description:,
                status: form.status,
                priority: form.priority,
                assigned_to: form.assigned_to,
                due_date: form.due_date,
                hours_logged: form.hours_logged,
              ),
            ),
          ),
          effect.none(),
        )
        _ -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }

    UpdateTaskFormStatus(status) ->
      case form_state {
        ShowingTaskForm(form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            ShowingTaskForm(TaskForm(
              project_id: form.project_id,
              title: form.title,
              description: form.description,
              status: shared_types.task_status_from_string(status)
                |> result.unwrap(shared_types.TaskPending),
              priority: form.priority,
              assigned_to: form.assigned_to,
              due_date: form.due_date,
              hours_logged: form.hours_logged,
            )),
          ),
          effect.none(),
        )
        EditingTask(task_id, form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            EditingTask(
              task_id,
              TaskForm(
                project_id: form.project_id,
                title: form.title,
                description: form.description,
                status: shared_types.task_status_from_string(status)
                  |> result.unwrap(shared_types.TaskPending),
                priority: form.priority,
                assigned_to: form.assigned_to,
                due_date: form.due_date,
                hours_logged: form.hours_logged,
              ),
            ),
          ),
          effect.none(),
        )
        _ -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }

    UpdateTaskFormPriority(priority) ->
      case form_state {
        ShowingTaskForm(form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            ShowingTaskForm(TaskForm(
              project_id: form.project_id,
              title: form.title,
              description: form.description,
              status: form.status,
              priority: shared_types.task_priority_from_string(priority)
                |> result.unwrap(shared_types.TaskMedium),
              assigned_to: form.assigned_to,
              due_date: form.due_date,
              hours_logged: form.hours_logged,
            )),
          ),
          effect.none(),
        )
        EditingTask(task_id, form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            EditingTask(
              task_id,
              TaskForm(
                project_id: form.project_id,
                title: form.title,
                description: form.description,
                status: form.status,
                priority: shared_types.task_priority_from_string(priority)
                  |> result.unwrap(shared_types.TaskMedium),
                assigned_to: form.assigned_to,
                due_date: form.due_date,
                hours_logged: form.hours_logged,
              ),
            ),
          ),
          effect.none(),
        )
        _ -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }

    UpdateTaskFormAssignedTo(assigned_to) ->
      case form_state {
        ShowingTaskForm(form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            ShowingTaskForm(TaskForm(
              project_id: form.project_id,
              title: form.title,
              description: form.description,
              status: form.status,
              priority: form.priority,
              assigned_to:,
              due_date: form.due_date,
              hours_logged: form.hours_logged,
            )),
          ),
          effect.none(),
        )
        EditingTask(task_id, form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            EditingTask(
              task_id,
              TaskForm(
                project_id: form.project_id,
                title: form.title,
                description: form.description,
                status: form.status,
                priority: form.priority,
                assigned_to:,
                due_date: form.due_date,
                hours_logged: form.hours_logged,
              ),
            ),
          ),
          effect.none(),
        )
        _ -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }

    UpdateTaskFormDueDate(due_date) ->
      case form_state {
        ShowingTaskForm(form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            ShowingTaskForm(TaskForm(
              project_id: form.project_id,
              title: form.title,
              description: form.description,
              status: form.status,
              priority: form.priority,
              assigned_to: form.assigned_to,
              due_date:,
              hours_logged: form.hours_logged,
            )),
          ),
          effect.none(),
        )
        EditingTask(task_id, form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            EditingTask(
              task_id,
              TaskForm(
                project_id: form.project_id,
                title: form.title,
                description: form.description,
                status: form.status,
                priority: form.priority,
                assigned_to: form.assigned_to,
                due_date:,
                hours_logged: form.hours_logged,
              ),
            ),
          ),
          effect.none(),
        )
        _ -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }

    UpdateTaskFormHoursLogged(hours_logged) ->
      case form_state {
        ShowingTaskForm(form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            ShowingTaskForm(TaskForm(
              project_id: form.project_id,
              title: form.title,
              description: form.description,
              status: form.status,
              priority: form.priority,
              assigned_to: form.assigned_to,
              due_date: form.due_date,
              hours_logged:,
            )),
          ),
          effect.none(),
        )
        EditingTask(task_id, form) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            EditingTask(
              task_id,
              TaskForm(
                project_id: form.project_id,
                title: form.title,
                description: form.description,
                status: form.status,
                priority: form.priority,
                assigned_to: form.assigned_to,
                due_date: form.due_date,
                hours_logged:,
              ),
            ),
          ),
          effect.none(),
        )
        _ -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }

    SubmitTaskForm -> {
      io.print("🔍 Frontend: SubmitTaskForm message received")
      case form_state {
        ShowingTaskForm(form) -> {
          io.print("🔍 Frontend: Creating new task")
          #(
            Loaded(
              dashboard,
              projects,
              tasks,
              team_members,
              current_view,
              loading_states,
              NoForm,
            ),
            create_task(form, ApiTaskAdded),
          )
        }
        EditingTask(task_id, form) -> {
          io.print("🔍 Frontend: Editing existing task with ID: " <> int.to_string(task_id))
          #(
            Loaded(
              dashboard,
              projects,
              tasks,
              team_members,
              current_view,
              loading_states,
              NoForm,
            ),
            update_task(task_id, form, ApiTaskStatusUpdated),
          )
        }
        _ -> {
          io.print("🔍 Frontend: SubmitTaskForm called but form_state is not ShowingTaskForm or EditingTask")
          #(
            Loaded(
              dashboard,
              projects,
              tasks,
              team_members,
              current_view,
              loading_states,
              form_state,
            ),
            effect.none(),
          )
        }
      }
    }

    ApiProjectAdded(Ok(new_project)) -> #(
      Loaded(
        dashboard,
        [new_project, ..projects],
        tasks,
        team_members,
        current_view,
        loading_states,
        NoForm,
      ),
      effect.none(),
    )

    ApiTaskAdded(Ok(new_task)) -> #(
      Loaded(
        dashboard,
        projects,
        [new_task, ..tasks],
        team_members,
        current_view,
        loading_states,
        NoForm,
      ),
      effect.none(),
    )

    UpdateTaskStatus(task_id, new_status) -> {
      // Find the task object by ID
      case list.find(tasks, fn(t) { t.id == task_id }) {
        Ok(task) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          update_task_status(task, new_status, ApiTaskStatusUpdated),
        )
        Error(_) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }
    }

    UpdateTaskHours(task_id, new_hours) -> {
      // Find the task object by ID
      case list.find(tasks, fn(t) { t.id == task_id }) {
        Ok(task) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          update_task_hours(task, new_hours, ApiTaskHoursUpdated),
        )
        Error(_) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }
    }

    UpdateProjectStatus(project_id, new_status) -> {
      // Find the project object by ID
      case list.find(projects, fn(p) { p.id == project_id }) {
        Ok(project) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          update_project_status(project, new_status, ApiProjectStatusUpdated),
        )
        Error(_) -> #(
          Loaded(
            dashboard,
            projects,
            tasks,
            team_members,
            current_view,
            loading_states,
            form_state,
          ),
          effect.none(),
        )
      }
    }

    ApiTaskStatusUpdated(Ok(updated_task)) -> {
      let updated_tasks =
        list.map(tasks, fn(task) {
          case task.id == updated_task.id {
            True -> updated_task
            False -> task
          }
        })
      // Clear the drag update state since the API call completed successfully
      clear_drag_update_state("task", updated_task.id)
      #(
        Loaded(
          dashboard,
          projects,
          updated_tasks,
          team_members,
          current_view,
          loading_states,
          form_state,
        ),
        effect.none(),
      )
    }

    ApiTaskHoursUpdated(Ok(updated_task)) -> {
      let updated_tasks =
        list.map(tasks, fn(task) {
          case task.id == updated_task.id {
            True -> updated_task
            False -> task
          }
        })
      #(
        Loaded(
          dashboard,
          projects,
          updated_tasks,
          team_members,
          current_view,
          loading_states,
          form_state,
        ),
        effect.none(),
      )
    }

    ApiProjectStatusUpdated(Ok(updated_project)) -> {
      let updated_projects =
        list.map(projects, fn(project) {
          case project.id == updated_project.id {
            True -> updated_project
            False -> project
          }
        })
      // Clear the drag update state since the API call completed successfully
      clear_drag_update_state("project", updated_project.id)
      #(
        Loaded(
          dashboard,
          updated_projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state,
        ),
        effect.none(),
      )
    }

    ApiReturnedDashboard(Error(_))
    | ApiReturnedDashboardData(Error(_))
    | ApiReturnedProjects(Error(_))
    | ApiReturnedTasks(Error(_))
    | ApiReturnedTeamMembers(Error(_))
    | ApiProjectAdded(Error(_))
    | ApiTaskAdded(Error(_))
    | ApiTaskHoursUpdated(Error(_)) -> #(
      Loaded(
        dashboard,
        projects,
        tasks,
        team_members,
        current_view,
        loading_states,
        form_state,
      ),
      effect.none(),
    )

    ApiTaskStatusUpdated(Error(_)) -> {
      // TODO: Could add logic here to revert the visual drag change on error
      // For now, just clear the updating state - Lustre will re-render with original data
      // We don't know which task failed, but clearing all updating states is acceptable
      #(
        Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state,
        ),
        effect.none(),
      )
    }

    ApiProjectStatusUpdated(Error(_)) -> {
      // TODO: Could add logic here to revert the visual drag change on error
      // For now, just clear the updating state - Lustre will re-render with original data
      #(
        Loaded(
          dashboard,
          projects,
          tasks,
          team_members,
          current_view,
          loading_states,
          form_state,
        ),
        effect.none(),
      )
    }
  }
}

// VIEW ------------------------------------------------------------------------

fn view(model: Model) -> Element(Msg) {
  case model {
    Loading -> html.div([attribute.class("loading")], [html.text("Loading...")])
    LoadingFailed(_) ->
      html.div([attribute.class("error")], [html.text("Loading failed")])
    Loaded(
      dashboard,
      projects,
      tasks,
      team_members,
      current_view,
      loading_states,
      form_state,
    ) ->
      html.div(
        [attribute.class("min-h-screen bg-gray-50 dark:bg-gray-900 p-6")],
        [
          html.div([attribute.class("flex items-center justify-center mb-8")], [
            view_navigation(current_view),
            view_refresh_button(),
          ]),
          view_content(
            current_view,
            dashboard,
            projects,
            tasks,
            team_members,
            loading_states,
            form_state,
          ),
        ],
      )
  }
}

fn view_navigation(current_view: View) -> Element(Msg) {
  html.nav(
    [
      attribute.class(
        "bg-white dark:bg-gray-800 shadow-lg rounded-lg p-1 mb-6 inline-flex space-x-1",
      ),
    ],
    [
      html.button(
        [
          attribute.class(case current_view {
            DashboardView ->
              "flex items-center px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 bg-cyan-500 text-white shadow-md hover:bg-cyan-600 dark:bg-cyan-400 dark:text-gray-900 dark:hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            _ ->
              "flex items-center px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 dark:text-gray-300 dark:hover:text-cyan-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          }),
          event.on_click(ChangeView(DashboardView)),
        ],
        [
          html.svg(
            [
              attribute.class("w-4 h-4 mr-2"),
              attribute.attribute("fill", "none"),
              attribute.attribute("stroke", "currentColor"),
              attribute.attribute("viewBox", "0 0 24 24"),
            ],
            [
              svg.path([
                attribute.attribute("stroke-linecap", "round"),
                attribute.attribute("stroke-linejoin", "round"),
                attribute.attribute("stroke-width", "2"),
                attribute.attribute(
                  "d",
                  "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z",
                ),
              ]),
              svg.path([
                attribute.attribute("stroke-linecap", "round"),
                attribute.attribute("stroke-linejoin", "round"),
                attribute.attribute("stroke-width", "2"),
                attribute.attribute("d", "M8 1v6m8-6v6"),
              ]),
            ],
          ),
          html.text("Dashboard"),
        ],
      ),
      html.button(
        [
          attribute.class(case current_view {
            ProjectsView ->
              "flex items-center px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 bg-cyan-500 text-white shadow-md hover:bg-cyan-600 dark:bg-cyan-400 dark:text-gray-900 dark:hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            _ ->
              "flex items-center px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 dark:text-gray-300 dark:hover:text-cyan-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          }),
          event.on_click(ChangeView(ProjectsView)),
        ],
        [
          html.svg(
            [
              attribute.class("w-4 h-4 mr-2"),
              attribute.attribute("fill", "none"),
              attribute.attribute("stroke", "currentColor"),
              attribute.attribute("viewBox", "0 0 24 24"),
            ],
            [
              svg.path([
                attribute.attribute("stroke-linecap", "round"),
                attribute.attribute("stroke-linejoin", "round"),
                attribute.attribute("stroke-width", "2"),
                attribute.attribute(
                  "d",
                  "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
                ),
              ]),
            ],
          ),
          html.text("Projects"),
        ],
      ),
      html.button(
        [
          attribute.class(case current_view {
            TasksView(_) ->
              "flex items-center px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 bg-cyan-500 text-white shadow-md hover:bg-cyan-600 dark:bg-cyan-400 dark:text-gray-900 dark:hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            _ ->
              "flex items-center px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 dark:text-gray-300 dark:hover:text-cyan-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          }),
          event.on_click(ChangeView(TasksView(option.None))),
        ],
        [
          html.svg(
            [
              attribute.class("w-4 h-4 mr-2"),
              attribute.attribute("fill", "none"),
              attribute.attribute("stroke", "currentColor"),
              attribute.attribute("viewBox", "0 0 24 24"),
            ],
            [
              svg.path([
                attribute.attribute("stroke-linecap", "round"),
                attribute.attribute("stroke-linejoin", "round"),
                attribute.attribute("stroke-width", "2"),
                attribute.attribute(
                  "d",
                  "M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
                ),
              ]),
            ],
          ),
          html.text("Tasks"),
        ],
      ),
      html.button(
        [
          attribute.class(case current_view {
            TeamView ->
              "flex items-center px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 bg-cyan-500 text-white shadow-md hover:bg-cyan-600 dark:bg-cyan-400 dark:text-gray-900 dark:hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            _ ->
              "flex items-center px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 dark:text-gray-300 dark:hover:text-cyan-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          }),
          event.on_click(ChangeView(TeamView)),
        ],
        [
          html.svg(
            [
              attribute.class("w-4 h-4 mr-2"),
              attribute.attribute("fill", "none"),
              attribute.attribute("stroke", "currentColor"),
              attribute.attribute("viewBox", "0 0 24 24"),
            ],
            [
              svg.path([
                attribute.attribute("stroke-linecap", "round"),
                attribute.attribute("stroke-linejoin", "round"),
                attribute.attribute("stroke-width", "2"),
                attribute.attribute(
                  "d",
                  "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-1.85a4 4 0 11-5.7-5.7 4 4 0 015.7 5.7z",
                ),
              ]),
            ],
          ),
          html.text("Team"),
        ],
      ),
    ],
  )
}

fn view_refresh_button() -> Element(Msg) {
  html.button(
    [
      attribute.class(
        "flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 bg-green-600 text-white shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ml-4",
      ),
      event.on_click(RefreshData),
    ],
    [
      html.svg(
        [
          attribute.class("w-4 h-4 mr-2"),
          attribute.attribute("fill", "none"),
          attribute.attribute("stroke", "currentColor"),
          attribute.attribute("viewBox", "0 0 24 24"),
        ],
        [
          svg.path([
            attribute.attribute("stroke-linecap", "round"),
            attribute.attribute("stroke-linejoin", "round"),
            attribute.attribute("stroke-width", "2"),
            attribute.attribute(
              "d",
              "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
            ),
          ]),
        ],
      ),
      html.text("Refresh"),
    ],
  )
}

fn view_content(
  current_view: View,
  dashboard: DashboardStats,
  projects: List(Project),
  tasks: List(Task),
  team_members: List(TeamMember),
  loading_states: LoadingStates,
  form_state: FormState,
) -> Element(Msg) {
  case current_view {
    DashboardView ->
      dashboard.view_dashboard(
        dashboard,
        projects,
        tasks,
        loading_states,
        RefreshData,
        ChangeView(ProjectsView),
        ChangeView(TasksView(option.None)),
        ChangeView(TeamView),
      )
    ProjectsView ->
      projects.view_projects(
        projects,
        loading_states.projects,
        FilterTasksByProject,
        ShowAddProjectForm,
        ShowEditProjectForm,
        form_state,
        CloseForm,
        UpdateProjectFormName,
        UpdateProjectFormDescription,
        UpdateProjectFormDeadline,
        UpdateProjectFormStatus,
        UpdateProjectFormColor,
        SubmitProjectForm,
        UpdateProjectStatus,
      )
    TasksView(filter_project_id) ->
      tasks.view_tasks(
        tasks,
        projects,
        team_members,
        filter_project_id,
        loading_states.tasks,
        ChangeView(TasksView(option.None)),
        ShowAddTaskForm,
        ShowEditTaskForm,
        form_state,
        CloseForm,
        UpdateTaskFormProjectId,
        UpdateTaskFormTitle,
        UpdateTaskFormDescription,
        UpdateTaskFormStatus,
        UpdateTaskFormPriority,
        UpdateTaskFormAssignedTo,
        UpdateTaskFormDueDate,
        UpdateTaskFormHoursLogged,
        SubmitTaskForm,
        UpdateTaskStatus,
      )
    TeamView -> team.view_team(team_members, loading_states.team)
  }
}
