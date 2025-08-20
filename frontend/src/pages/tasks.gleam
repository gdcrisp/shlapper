import colors
import gleam/float
import gleam/int
import gleam/list
import gleam/option.{type Option}
import gleam/result
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html
import lustre/event
import types.{
  type CacheInfo, type FormState, type Project, type Task, type TaskForm,
  type TeamMember,
}

pub fn view_tasks(
  tasks: List(Task),
  projects: List(Project),
  team_members: List(TeamMember),
  project_filter: Option(Int),
  cache_info: CacheInfo,
  on_clear_filter: msg,
  on_add_task: msg,
  on_edit_task: fn(Int) -> msg,
  form_state: FormState,
  on_close_form: msg,
  on_update_project_id: fn(Int) -> msg,
  on_update_title: fn(String) -> msg,
  on_update_description: fn(String) -> msg,
  on_update_status: fn(String) -> msg,
  on_update_priority: fn(String) -> msg,
  on_update_assigned_to: fn(Option(Int)) -> msg,
  on_update_due_date: fn(Option(String)) -> msg,
  on_update_hours_logged: fn(Float) -> msg,
  on_submit_form: msg,
  on_update_task_status: fn(Int, String) -> msg,
) -> Element(msg) {
  let filtered_tasks = case project_filter {
    option.Some(project_id) ->
      list.filter(tasks, fn(task) { task.project_id == project_id })
    option.None -> tasks
  }

  html.div([attribute.class("space-y-4")], [
    html.div([attribute.class("flex items-center justify-between")], [
      html.h2(
        [
          attribute.class(
            "text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300",
          ),
        ],
        [
          html.text("Tasks"),
        ],
      ),
      html.div([attribute.class("flex items-center space-x-4")], [
        case project_filter {
          option.Some(project_id) -> {
            let project_name =
              list.find(projects, fn(p) { p.id == project_id })
              |> result.map(fn(p) { p.name })
              |> result.unwrap("Unknown Project")
            html.div([attribute.class("flex items-center space-x-2")], [
              html.span([attribute.class("text-sm text-gray-600")], [
                html.text("Filtered by: " <> project_name),
              ]),
              html.button(
                [
                  attribute.class("text-cyan-600 hover:text-cyan-800 text-sm"),
                  event.on_click(on_clear_filter),
                ],
                [html.text("Show All")],
              ),
            ])
          }
          option.None -> html.div([], [])
        },
        html.button(
          [
            attribute.class(
              "bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105",
            ),
            event.on_click(on_add_task),
          ],
          [html.text("Add Task")],
        ),
      ]),
    ]),
    case cache_info.is_loading {
      True -> view_loading()
      False ->
        view_tasks_kanban(
          filtered_tasks,
          projects,
          team_members,
          on_edit_task,
          on_update_task_status,
        )
    },
    // Form modal
    case form_state {
      types.ShowingTaskForm(form) ->
        view_task_form(
          form,
          "Add New Task",
          "Create Task",
          projects,
          team_members,
          on_close_form,
          on_update_project_id,
          on_update_title,
          on_update_description,
          on_update_status,
          on_update_priority,
          on_update_assigned_to,
          on_update_due_date,
          on_update_hours_logged,
          on_submit_form,
        )
      types.EditingTask(_task_id, form) ->
        view_task_form(
          form,
          "Edit Task",
          "Update Task",
          projects,
          team_members,
          on_close_form,
          on_update_project_id,
          on_update_title,
          on_update_description,
          on_update_status,
          on_update_priority,
          on_update_assigned_to,
          on_update_due_date,
          on_update_hours_logged,
          on_submit_form,
        )
      _ -> html.div([], [])
    },
  ])
}

fn view_tasks_kanban(
  tasks: List(Task),
  projects: List(Project),
  team_members: List(TeamMember),
  on_edit_task: fn(Int) -> msg,
  on_update_task_status: fn(Int, String) -> msg,
) -> Element(msg) {
  let todo_tasks =
    list.filter(tasks, fn(t) {
      t.status == "pending" || t.status == "todo" || t.status == "open"
    })
  let in_progress_tasks =
    list.filter(tasks, fn(t) {
      t.status == "in_progress" || t.status == "active"
    })
  let review_tasks =
    list.filter(tasks, fn(t) { t.status == "testing" || t.status == "review" })
  let done_tasks =
    list.filter(tasks, fn(t) {
      t.status == "completed" || t.status == "done" || t.status == "closed"
    })

  html.div(
    [attribute.class("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6")],
    [
      task_kanban_column(
        "To Do",
        "pending",
        todo_tasks,
        "bg-gray-100 dark:bg-gray-700",
        projects,
        team_members,
        on_edit_task,
        on_update_task_status,
      ),
      task_kanban_column(
        "In Progress",
        "in_progress",
        in_progress_tasks,
        "bg-cyan-100 dark:bg-cyan-900",
        projects,
        team_members,
        on_edit_task,
        on_update_task_status,
      ),
      task_kanban_column(
        "Review",
        "testing",
        review_tasks,
        "bg-yellow-100 dark:bg-yellow-900",
        projects,
        team_members,
        on_edit_task,
        on_update_task_status,
      ),
      task_kanban_column(
        "Done",
        "completed",
        done_tasks,
        "bg-green-100 dark:bg-green-900",
        projects,
        team_members,
        on_edit_task,
        on_update_task_status,
      ),
    ],
  )
}

fn task_kanban_column(
  title: String,
  status: String,
  tasks: List(Task),
  color_class: String,
  projects: List(Project),
  team_members: List(TeamMember),
  on_edit_task: fn(Int) -> msg,
  on_update_task_status: fn(Int, String) -> msg,
) -> Element(msg) {
  html.div(
    [
      attribute.class(
        "kanban-column bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/20 p-4 border border-transparent dark:border-gray-700",
      ),
      attribute.attribute("data-status", status),
    ],
    [
      html.div([attribute.class("mb-4")], [
        html.h3(
          [
            attribute.class(
              "text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300 mb-2",
            ),
          ],
          [html.text(title)],
        ),
        html.div(
          [
            attribute.class("h-2 rounded-full " <> color_class <> " opacity-20"),
          ],
          [],
        ),
      ]),
      html.div(
        [attribute.class("space-y-3 min-h-[200px]")],
        list.map(tasks, fn(task) {
          task_card(
            task,
            projects,
            team_members,
            on_edit_task,
            on_update_task_status,
          )
        }),
      ),
    ],
  )
}

fn view_task_form(
  form: TaskForm,
  title: String,
  submit_text: String,
  projects: List(Project),
  team_members: List(TeamMember),
  on_close: msg,
  on_update_project_id: fn(Int) -> msg,
  on_update_title: fn(String) -> msg,
  on_update_description: fn(String) -> msg,
  on_update_status: fn(String) -> msg,
  on_update_priority: fn(String) -> msg,
  on_update_assigned_to: fn(Option(Int)) -> msg,
  on_update_due_date: fn(Option(String)) -> msg,
  on_update_hours_logged: fn(Float) -> msg,
  on_submit: msg,
) -> Element(msg) {
  html.div(
    [
      attribute.class(
        "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50",
      ),
    ],
    [
      html.div(
        [
          attribute.class(
            "bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto",
          ),
        ],
        [
          html.div([attribute.class("flex items-center justify-between mb-4")], [
            html.h3(
              [
                attribute.class(
                  "text-lg font-semibold text-gray-900 dark:text-white",
                ),
              ],
              [html.text(title)],
            ),
            html.button(
              [
                attribute.class(
                  "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                ),
                event.on_click(on_close),
              ],
              [html.text("✕")],
            ),
          ]),
          html.div(
            [
              attribute.class("space-y-4"),
            ],
            [
              html.div([], [
                html.label(
                  [
                    attribute.class(
                      "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
                    ),
                  ],
                  [html.text("Project")],
                ),
                html.select(
                  [
                    attribute.class(
                      "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white",
                    ),
                    event.on_input(fn(value) {
                      case int.parse(value) {
                        Ok(id) -> on_update_project_id(id)
                        Error(_) -> on_update_project_id(1)
                      }
                    }),
                  ],
                  list.map(projects, fn(project) {
                    html.option(
                      [
                        attribute.value(int.to_string(project.id)),
                        attribute.selected(project.id == form.project_id),
                      ],
                      project.name,
                    )
                  }),
                ),
              ]),
              html.div([], [
                html.label(
                  [
                    attribute.class(
                      "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
                    ),
                  ],
                  [html.text("Task Title")],
                ),
                html.input([
                  attribute.type_("text"),
                  attribute.class(
                    "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white",
                  ),
                  attribute.value(form.title),
                  event.on_input(on_update_title),
                  attribute.placeholder("Enter task title"),
                ]),
              ]),
              html.div([], [
                html.label(
                  [
                    attribute.class(
                      "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
                    ),
                  ],
                  [html.text("Description")],
                ),
                html.textarea(
                  [
                    attribute.class(
                      "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white",
                    ),
                    attribute.attribute("rows", "3"),
                    event.on_input(on_update_description),
                    attribute.placeholder("Enter task description"),
                  ],
                  form.description,
                ),
              ]),
              html.div([attribute.class("grid grid-cols-2 gap-4")], [
                html.div([], [
                  html.label(
                    [
                      attribute.class(
                        "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
                      ),
                    ],
                    [html.text("Status")],
                  ),
                  html.select(
                    [
                      attribute.class(
                        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white",
                      ),
                      event.on_input(on_update_status),
                    ],
                    [
                      html.option(
                        [
                          attribute.value("pending"),
                          attribute.selected(form.status == "pending"),
                        ],
                        "To Do",
                      ),
                      html.option(
                        [
                          attribute.value("in_progress"),
                          attribute.selected(form.status == "in_progress"),
                        ],
                        "In Progress",
                      ),
                      html.option(
                        [
                          attribute.value("testing"),
                          attribute.selected(form.status == "testing"),
                        ],
                        "Review",
                      ),
                      html.option(
                        [
                          attribute.value("completed"),
                          attribute.selected(form.status == "completed"),
                        ],
                        "Done",
                      ),
                    ],
                  ),
                ]),
                html.div([], [
                  html.label(
                    [
                      attribute.class(
                        "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
                      ),
                    ],
                    [html.text("Priority")],
                  ),
                  html.select(
                    [
                      attribute.class(
                        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white",
                      ),
                      event.on_input(on_update_priority),
                    ],
                    [
                      html.option(
                        [
                          attribute.value("low"),
                          attribute.selected(form.priority == "low"),
                        ],
                        "Low",
                      ),
                      html.option(
                        [
                          attribute.value("medium"),
                          attribute.selected(form.priority == "medium"),
                        ],
                        "Medium",
                      ),
                      html.option(
                        [
                          attribute.value("high"),
                          attribute.selected(form.priority == "high"),
                        ],
                        "High",
                      ),
                      html.option(
                        [
                          attribute.value("urgent"),
                          attribute.selected(form.priority == "urgent"),
                        ],
                        "Urgent",
                      ),
                    ],
                  ),
                ]),
              ]),
              html.div([], [
                html.label(
                  [
                    attribute.class(
                      "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
                    ),
                  ],
                  [html.text("Assigned To")],
                ),
                html.select(
                  [
                    attribute.class(
                      "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white",
                    ),
                    event.on_input(fn(value) {
                      case value {
                        "" -> on_update_assigned_to(option.None)
                        _ ->
                          case int.parse(value) {
                            Ok(id) -> on_update_assigned_to(option.Some(id))
                            Error(_) -> on_update_assigned_to(option.None)
                          }
                      }
                    }),
                  ],
                  [
                    html.option(
                      [
                        attribute.value(""),
                        attribute.selected(option.is_none(form.assigned_to)),
                      ],
                      "Unassigned",
                    ),
                    ..list.map(team_members, fn(member) {
                      html.option(
                        [
                          attribute.value(int.to_string(member.id)),
                          attribute.selected(case form.assigned_to {
                            option.Some(id) -> id == member.id
                            option.None -> False
                          }),
                        ],
                        member.name,
                      )
                    })
                  ],
                ),
              ]),
              html.div([], [
                html.label(
                  [
                    attribute.class(
                      "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
                    ),
                  ],
                  [html.text("Due Date")],
                ),
                html.input([
                  attribute.type_("date"),
                  attribute.class(
                    "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white",
                  ),
                  attribute.value(case form.due_date {
                    option.Some(date) -> date
                    option.None -> ""
                  }),
                  event.on_input(fn(value) {
                    case value {
                      "" -> on_update_due_date(option.None)
                      date -> on_update_due_date(option.Some(date))
                    }
                  }),
                ]),
              ]),
              html.div([], [
                html.label(
                  [
                    attribute.class(
                      "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
                    ),
                  ],
                  [html.text("Hours Logged")],
                ),
                html.div([attribute.class("space-y-3")], [
                  html.input([
                    attribute.type_("range"),
                    attribute.class(
                      "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider",
                    ),
                    attribute.attribute("min", "0"),
                    attribute.attribute("max", "40"),
                    attribute.attribute("step", "0.5"),
                    attribute.value(float.to_string(form.hours_logged)),
                    attribute.id("hours-logged-slider"),
                    event.on_input(fn(value) {
                      case float.parse(value) {
                        Ok(hours) -> on_update_hours_logged(hours)
                        Error(_) -> on_update_hours_logged(0.0)
                      }
                    }),
                  ]),
                  html.div(
                    [
                      attribute.class(
                        "flex items-center justify-between text-sm text-gray-600 dark:text-gray-400",
                      ),
                    ],
                    [
                      html.span([], [html.text("0h")]),
                      html.span(
                        [
                          attribute.class(
                            "text-cyan-600 dark:text-cyan-400 font-semibold",
                          ),
                        ],
                        [html.text(float.to_string(form.hours_logged) <> "h")],
                      ),
                      html.span([], [html.text("40h")]),
                    ],
                  ),
                ]),
              ]),
              html.div([attribute.class("flex justify-end space-x-3 pt-4")], [
                html.button(
                  [
                    attribute.type_("button"),
                    attribute.class(
                      "px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors",
                    ),
                    event.on_click(on_close),
                  ],
                  [html.text("Cancel")],
                ),
                html.button(
                  [
                    attribute.type_("button"),
                    attribute.class(
                      "px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors",
                    ),
                    event.on_click(on_submit),
                  ],
                  [html.text(submit_text)],
                ),
              ]),
            ],
          ),
        ],
      ),
    ],
  )
}

pub fn view_loading() -> Element(msg) {
  html.div([attribute.class("flex items-center justify-center py-12")], [
    html.div([attribute.class("text-center")], [
      html.div(
        [
          attribute.class(
            "animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 dark:border-cyan-400 mx-auto mb-4",
          ),
        ],
        [],
      ),
      html.p(
        [
          attribute.class(
            "text-gray-600 dark:text-gray-400 transition-colors duration-300",
          ),
        ],
        [
          html.text("Loading project data..."),
        ],
      ),
    ]),
  ])
}

fn task_card(
  task: Task,
  projects: List(Project),
  team_members: List(TeamMember),
  on_edit_task: fn(Int) -> msg,
  _on_update_task_status: fn(Int, String) -> msg,
) -> Element(msg) {
  let project =
    list.find(projects, fn(p) { p.id == task.project_id })
    |> result.unwrap(types.Project(0, "Unknown Project", "", "", "", "blue", ""))

  let assigned_member = case task.assigned_to {
    option.Some(member_id) ->
      list.find(team_members, fn(m) { m.id == member_id })
      |> result.map(fn(m) { m.name })
      |> result.unwrap("Unknown Member")
    option.None -> "Unassigned"
  }

  html.div(
    [
      attribute.class(
        "task-card relative group bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/20 hover:shadow-lg dark:hover:shadow-gray-700/40 p-6 cursor-pointer transition-all duration-300 ease-out transform hover:-translate-y-1 hover:scale-105 border border-transparent dark:border-gray-700",
      ),
      attribute.attribute("draggable", "true"),
      attribute.attribute("style", "user-select: none;"),
      attribute.attribute("data-id", int.to_string(task.id)),
      attribute.attribute("data-type", "task"),
      attribute.attribute("data-status", task.status),
      attribute.title("Click to edit task"),
      event.on_click(on_edit_task(task.id)),
    ],
    [
      html.div([attribute.class("flex items-start justify-between")], [
        html.div([attribute.class("flex-1")], [
          html.h3(
            [
              attribute.class(
                "text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300",
              ),
            ],
            [
              html.text(task.title),
            ],
          ),
          html.p(
            [
              attribute.class(
                "text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300",
              ),
            ],
            [
              html.text(task.description),
            ],
          ),
          html.div([attribute.class("flex items-center mt-4 space-x-4")], [
            html.span(
              [
                attribute.class(colors.get_project_badge_classes(project.color)),
              ],
              [
                html.text(project.name),
              ],
            ),
            html.span(
              [
                attribute.class(
                  "text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300",
                ),
              ],
              [
                html.text("Assigned to: " <> assigned_member),
              ],
            ),
          ]),
          html.div([attribute.class("flex items-center mt-2 space-x-4")], [
            html.span(
              [
                attribute.class(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium "
                  <> status_color(task.status),
                ),
              ],
              [task.status |> status_label() |> html.text()],
            ),
            html.span(
              [
                attribute.class(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium "
                  <> task.priority |> priority_color(),
                ),
              ],
              [task.priority |> html.text()],
            ),
            html.span(
              [
                attribute.class(
                  "text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300",
                ),
              ],
              [
                html.text(float.to_string(task.hours_logged) <> "h logged"),
              ],
            ),
          ]),
          // Hours progress bar
          html.div(
            [
              attribute.class("mt-4"),
            ],
            [
              html.div(
                [attribute.class("flex items-center justify-between mb-1")],
                [
                  html.span(
                    [
                      attribute.class(
                        "text-xs font-medium text-gray-700 dark:text-gray-300",
                      ),
                    ],
                    [html.text("Hours Progress")],
                  ),
                  html.span(
                    [
                      attribute.class(
                        "text-xs text-gray-600 dark:text-gray-400",
                      ),
                    ],
                    [html.text(float.to_string(task.hours_logged) <> " / 40h")],
                  ),
                ],
              ),
              html.div(
                [
                  attribute.class(
                    "w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2",
                  ),
                ],
                [
                  html.div(
                    [
                      attribute.class(
                        "bg-cyan-500 dark:bg-cyan-400 h-2 rounded-full transition-all duration-300",
                      ),
                      attribute.attribute(
                        "style",
                        "width: "
                          <> {
                          let percentage = case task.hours_logged >. 40.0 {
                            True -> 100.0
                            False -> task.hours_logged /. 40.0 *. 100.0
                          }
                          float.to_string(percentage) <> "%"
                        },
                      ),
                    ],
                    [],
                  ),
                ],
              ),
            ],
          ),
        ]),
      ]),
    ],
  )
}

fn status_color(status: String) -> String {
  case status {
    "completed" | "done" ->
      "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700"
    "in_progress" | "pending" | "active" ->
      "bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-700"
    "planning" | "todo" | "open" ->
      "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600"
    "on_hold" | "review" | "testing" ->
      "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700"
    _ ->
      "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600"
  }
}

fn status_label(status: String) -> String {
  case status {
    "completed" -> "Completed"
    "done" -> "Done"
    "in_progress" -> "In Progress"
    "planning" -> "Planning"
    "todo" -> "Todo"
    "open" -> "Open"
    "pending" -> "Pending"
    "on_hold" -> "On Hold"
    "review" -> "Review"
    "testing" -> "Testing"
    _ -> "No Status"
  }
}

fn priority_color(priority: String) -> String {
  case priority {
    "urgent" ->
      "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700"
    "high" ->
      "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-700"
    "medium" ->
      "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700"
    "low" ->
      "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700"
    _ ->
      "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600"
  }
}
