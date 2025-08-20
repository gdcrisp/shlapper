import colors
import gleam/int
import gleam/list
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html
import lustre/event
import types.{type CacheInfo, type FormState, type Project, type ProjectForm}

pub fn view_projects(
  projects: List(Project),
  cache_info: CacheInfo,
  on_filter_tasks: fn(Int) -> msg,
  on_add_project: msg,
  on_edit_project: fn(Int) -> msg,
  form_state: FormState,
  on_close_form: msg,
  on_update_name: fn(String) -> msg,
  on_update_description: fn(String) -> msg,
  on_update_deadline: fn(String) -> msg,
  on_update_status: fn(String) -> msg,
  on_update_color: fn(String) -> msg,
  on_submit_form: msg,
  on_update_project_status: fn(Int, String) -> msg,
) -> Element(msg) {
  html.div([attribute.class("space-y-4")], [
    html.div([attribute.class("flex items-center justify-between")], [
      html.h2(
        [
          attribute.class(
            "text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300",
          ),
        ],
        [
          html.text("Projects"),
        ],
      ),
      html.button(
        [
          attribute.class(
            "bg-cyan-600 dark:bg-cyan-700 hover:bg-cyan-700 dark:hover:bg-cyan-600 text-white px-4 py-2 rounded-md font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105",
          ),
          event.on_click(on_add_project),
        ],
        [html.text("Add Project")],
      ),
    ]),
    case cache_info.is_loading {
      True -> view_loading()
      False ->
        view_projects_kanban(
          projects,
          on_filter_tasks,
          on_edit_project,
          on_update_project_status,
        )
    },
    // Form modal
    case form_state {
      types.ShowingProjectForm(form) ->
        view_project_form(
          form,
          "Add New Project",
          "Create Project",
          on_close_form,
          on_update_name,
          on_update_description,
          on_update_deadline,
          on_update_status,
          on_update_color,
          on_submit_form,
        )
      types.EditingProject(_project_id, form) ->
        view_project_form(
          form,
          "Edit Project",
          "Update Project",
          on_close_form,
          on_update_name,
          on_update_description,
          on_update_deadline,
          on_update_status,
          on_update_color,
          on_submit_form,
        )
      _ -> html.div([], [])
    },
  ])
}

fn view_projects_kanban(
  projects: List(Project),
  on_filter_tasks: fn(Int) -> msg,
  on_edit_project: fn(Int) -> msg,
  on_update_project_status: fn(Int, String) -> msg,
) -> Element(msg) {
  let planning_projects =
    list.filter(projects, fn(p) { p.status == "planning" })
  let active_projects =
    list.filter(projects, fn(p) {
      p.status == "active" || p.status == "in_progress"
    })
  let completed_projects =
    list.filter(projects, fn(p) {
      p.status == "completed" || p.status == "done"
    })
  let on_hold_projects =
    list.filter(projects, fn(p) {
      p.status == "on_hold" || p.status == "review"
    })

  html.div(
    [attribute.class("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6")],
    [
      kanban_column(
        "Planning",
        "planning",
        planning_projects,
        on_filter_tasks,
        on_edit_project,
        on_update_project_status,
      ),
      kanban_column(
        "Active",
        "active",
        active_projects,
        on_filter_tasks,
        on_edit_project,
        on_update_project_status,
      ),
      kanban_column(
        "On Hold",
        "on_hold",
        on_hold_projects,
        on_filter_tasks,
        on_edit_project,
        on_update_project_status,
      ),
      kanban_column(
        "Completed",
        "completed",
        completed_projects,
        on_filter_tasks,
        on_edit_project,
        on_update_project_status,
      ),
    ],
  )
}

fn kanban_column(
  title: String,
  status: String,
  projects: List(Project),
  on_filter_tasks: fn(Int) -> msg,
  on_edit_project: fn(Int) -> msg,
  on_update_project_status: fn(Int, String) -> msg,
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
            attribute.class(
              "h-2 rounded-full bg-gray-200 dark:bg-gray-600 opacity-20",
            ),
          ],
          [],
        ),
      ]),
      html.div(
        [attribute.class("space-y-3 min-h-[200px]")],
        list.map(projects, fn(project) {
          project_card(
            project,
            on_filter_tasks,
            on_edit_project,
            on_update_project_status,
          )
        }),
      ),
    ],
  )
}

fn view_project_form(
  form: ProjectForm,
  title: String,
  submit_text: String,
  on_close: msg,
  on_update_name: fn(String) -> msg,
  on_update_description: fn(String) -> msg,
  on_update_deadline: fn(String) -> msg,
  on_update_status: fn(String) -> msg,
  on_update_color: fn(String) -> msg,
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
            "bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6",
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
                  [html.text("Project Name")],
                ),
                html.input([
                  attribute.type_("text"),
                  attribute.class(
                    "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white",
                  ),
                  attribute.value(form.name),
                  event.on_input(on_update_name),
                  attribute.placeholder("Enter project name"),
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
                    attribute.placeholder("Enter project description"),
                  ],
                  form.description,
                ),
              ]),
              html.div([], [
                html.label(
                  [
                    attribute.class(
                      "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
                    ),
                  ],
                  [html.text("Deadline")],
                ),
                html.input([
                  attribute.type_("date"),
                  attribute.class(
                    "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-gray-700 dark:text-white",
                  ),
                  attribute.value(form.deadline),
                  event.on_input(on_update_deadline),
                ]),
              ]),
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
                        attribute.value("planning"),
                        attribute.selected(form.status == "planning"),
                      ],
                      "Planning",
                    ),
                    html.option(
                      [
                        attribute.value("active"),
                        attribute.selected(form.status == "active"),
                      ],
                      "Active",
                    ),
                    html.option(
                      [
                        attribute.value("on_hold"),
                        attribute.selected(form.status == "on_hold"),
                      ],
                      "On Hold",
                    ),
                    html.option(
                      [
                        attribute.value("completed"),
                        attribute.selected(form.status == "completed"),
                      ],
                      "Completed",
                    ),
                  ],
                ),
              ]),
              html.div([], [
                html.label(
                  [
                    attribute.class(
                      "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",
                    ),
                  ],
                  [html.text("Project Color")],
                ),
                html.div(
                  [attribute.class("grid grid-cols-8 gap-2")],
                  list.map(colors.get_material_colors(), fn(color) {
                    let is_selected = color.name == form.color
                    let border_class = case is_selected {
                      True ->
                        "ring-2 ring-gray-900 dark:ring-white ring-offset-2"
                      False -> "ring-1 ring-gray-300 hover:ring-gray-400"
                    }

                    html.button(
                      [
                        attribute.type_("button"),
                        attribute.class(
                        "w-8 h-8 rounded-full transition-all duration-200 shadow-sm hover:scale-110 "
                          <> color.bg_class
                          <> " "
                          <> border_class,
                        ),
                        attribute.title(color.name),
                        event.on_click(on_update_color(color.name)),
                      ],
                      [],
                    )
                  }),
                ),
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
                      "px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-md transition-colors",
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
          html.text("Loading projects..."),
        ],
      ),
    ]),
  ])
}

fn project_card(
  project: Project,
  on_filter_tasks: fn(Int) -> msg,
  on_edit_project: fn(Int) -> msg,
  _on_update_project_status: fn(Int, String) -> msg,
) -> Element(msg) {
  let color_classes = colors.get_project_color_classes(project.color)

  html.div(
    [
      attribute.class(
        "project-card relative group rounded-lg shadow-sm dark:shadow-gray-700/20 hover:shadow-lg dark:hover:shadow-gray-700/40 p-6 cursor-pointer transition-all duration-300 ease-out transform hover:-translate-y-1 hover:scale-105 border-2 "
        <> color_classes,
      ),
      attribute.attribute("draggable", "true"),
      attribute.attribute("style", "user-select: none;"),
      attribute.attribute("data-id", int.to_string(project.id)),
      attribute.attribute("data-type", "project"),
      attribute.attribute("data-status", project.status),
      attribute.title("Click to edit project"),
      event.on_click(on_edit_project(project.id)),
    ],
    [
      html.div([attribute.class("flex items-start justify-between")], [
        html.div([attribute.class("flex-1")], [
          html.h3(
            [
              attribute.class(
                "text-lg font-semibold transition-colors duration-300",
              ),
            ],
            [
              html.text(project.name),
            ],
          ),
          html.p(
            [
              attribute.class("mt-1 transition-colors duration-300 opacity-90"),
            ],
            [
              html.text(project.description),
            ],
          ),
          html.div([attribute.class("flex items-center mt-4 space-x-4")], [
            html.span(
              [
                attribute.class(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 backdrop-blur-sm",
                ),
              ],
              [html.text(project.status)],
            ),
            html.span(
              [
                attribute.class(
                  "text-sm opacity-90 transition-colors duration-300",
                ),
              ],
              [
                html.text("Due: " <> project.deadline),
              ],
            ),
          ]),
        ]),
        html.button(
          [
            attribute.class(
              "bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded-md font-medium transition-all duration-300 backdrop-blur-sm",
            ),
            attribute.attribute("onclick", "event.stopPropagation();"),
            event.on_click(on_filter_tasks(project.id)),
          ],
          [html.text("View Tasks")],
        ),
      ]),
    ],
  )
}
