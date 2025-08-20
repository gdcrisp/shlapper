import colors
import gleam/float
import gleam/int
import gleam/list
import gleam/option
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html
import lustre/event
import types.{type DashboardStats, type LoadingStates, type Project, type Task}

pub fn view_dashboard(
  dashboard: DashboardStats,
  projects: List(Project),
  tasks: List(Task),
  loading_states: LoadingStates,
  on_refresh: msg,
  on_navigate_to_projects: msg,
  on_navigate_to_tasks: msg,
  _on_navigate_to_team: msg,
) -> Element(msg) {
  let is_loading =
    loading_states.dashboard.is_loading
    || loading_states.projects.is_loading
    || loading_states.tasks.is_loading
  html.div([attribute.class("space-y-6")], [
    // Header with refresh button
    html.div([attribute.class("flex items-center justify-between")], [
      html.h2(
        [
          attribute.class(
            "text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300",
          ),
        ],
        [
          html.text("Dashboard"),
        ],
      ),
      html.button(
        [
          attribute.class(
            "bg-gray-600 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
            <> case is_loading {
              True -> " opacity-50 cursor-not-allowed"
              False -> ""
            },
          ),
          event.on_click(on_refresh),
          case is_loading {
            True -> attribute.disabled(True)
            False -> attribute.disabled(False)
          },
        ],
        [
          html.text(case is_loading {
            True -> "Loading..."
            False -> "Refresh Data"
          }),
        ],
      ),
    ]),

    // Loading indicator
    case is_loading {
      True ->
        html.div(
          [
            attribute.class(
              "bg-cyan-50 dark:bg-cyan-900 border border-cyan-200 dark:border-cyan-700 rounded-lg p-4 transition-colors duration-300",
            ),
          ],
          [
            html.div([attribute.class("flex items-center")], [
              html.div(
                [
                  attribute.class(
                    "animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-600 dark:border-cyan-400 mr-3",
                  ),
                ],
                [],
              ),
              html.p([attribute.class("text-cyan-800 dark:text-cyan-200")], [
                html.text("Refreshing dashboard data..."),
              ]),
            ]),
          ],
        )
      False -> html.div([], [])
    },

    html.div(
      [attribute.class("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6")],
      [
        stat_card(
          "Total Projects",
          int.to_string(dashboard.total_projects),
          "bg-cyan-500",
        ),
        stat_card(
          "Active Projects",
          int.to_string(dashboard.active_projects),
          "bg-green-500",
        ),
        stat_card(
          "Completed Tasks",
          int.to_string(dashboard.completed_tasks),
          "bg-purple-500",
        ),
        stat_card(
          "Pending Tasks",
          int.to_string(dashboard.pending_tasks),
          "bg-orange-500",
        ),
        stat_card(
          "Team Members",
          int.to_string(dashboard.team_members),
          "bg-indigo-500",
        ),
        stat_card(
          "Total Hours",
          float.to_string(dashboard.total_hours),
          "bg-pink-500",
        ),
      ],
    ),

    html.div([attribute.class("grid grid-cols-1 lg:grid-cols-2 gap-6")], [
      view_recent_projects(projects, on_navigate_to_projects),
      view_recent_tasks(tasks, on_navigate_to_tasks),
    ]),
  ])
}

fn stat_card(title: String, value: String, color_class: String) -> Element(msg) {
  html.div(
    [
      attribute.class(
        "bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/20 hover:shadow-md dark:hover:shadow-gray-700/40 p-6 transition-all duration-300 transform hover:scale-105",
      ),
    ],
    [
      html.div([attribute.class("flex items-center")], [
        html.div([attribute.class("flex-shrink-0")], [
          html.div(
            [
              attribute.class(
                "w-8 h-8 " <> color_class <> " rounded-full animate-pulse",
              ),
            ],
            [],
          ),
        ]),
        html.div([attribute.class("ml-4")], [
          html.p(
            [
              attribute.class(
                "text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors duration-300",
              ),
            ],
            [
              html.text(title),
            ],
          ),
          html.p(
            [
              attribute.class(
                "text-2xl font-semibold text-gray-900 dark:text-white transition-colors duration-300",
              ),
            ],
            [
              html.text(value),
            ],
          ),
        ]),
      ]),
    ],
  )
}

fn view_recent_projects(
  projects: List(Project),
  on_navigate: msg,
) -> Element(msg) {
  html.div(
    [
      attribute.class(
        "bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/20 hover:shadow-md dark:hover:shadow-gray-700/40 p-6 transition-all duration-300 border border-transparent dark:border-gray-700",
      ),
    ],
    [
      html.div([attribute.class("flex items-center justify-between mb-4")], [
        html.h3(
          [
            attribute.class(
              "text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300",
            ),
          ],
          [
            html.text("Recent Projects"),
          ],
        ),
        html.button(
          [
            attribute.class(
              "text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 font-medium transition-colors duration-300 text-sm",
            ),
            event.on_click(on_navigate),
          ],
          [html.text("View All →")],
        ),
      ]),
      html.div(
        [attribute.class("space-y-3")],
        list.take(projects, 5)
          |> list.map(fn(project) {
            let color_classes = colors.get_project_color_classes(project.color)
            let color_info = colors.get_color_by_name(project.color)
            html.div(
              [
                attribute.class(
                  "flex items-center justify-between p-3 rounded-lg hover:opacity-90 transition-all duration-300 border-2 "
                  <> color_classes,
                ),
              ],
              [
                html.div([], [
                  html.p(
                    [
                      attribute.class(
                        "font-medium transition-colors duration-300 " <> color_info.text_class,
                      ),
                    ],
                    [
                      html.text(project.name),
                    ],
                  ),
                  html.p(
                    [
                      attribute.class(
                        "text-sm transition-colors duration-300 " <> color_info.text_class <> " opacity-80",
                      ),
                    ],
                    [
                      html.text(project.status),
                    ],
                  ),
                ]),
                html.span(
                  [
                    attribute.class(
                      "text-xs transition-colors duration-300 " <> color_info.text_class <> " opacity-70",
                    ),
                  ],
                  [
                    html.text(project.deadline),
                  ],
                ),
              ],
            )
          }),
      ),
    ],
  )
}

fn view_recent_tasks(tasks: List(Task), on_navigate: msg) -> Element(msg) {
  html.div(
    [
      attribute.class(
        "bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/20 hover:shadow-md dark:hover:shadow-gray-700/40 p-6 transition-all duration-300 border border-transparent dark:border-gray-700",
      ),
    ],
    [
      html.div([attribute.class("flex items-center justify-between mb-4")], [
        html.h3(
          [
            attribute.class(
              "text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300",
            ),
          ],
          [
            html.text("Recent Tasks"),
          ],
        ),
        html.button(
          [
            attribute.class(
              "text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 font-medium transition-colors duration-300 text-sm",
            ),
            event.on_click(on_navigate),
          ],
          [html.text("View All →")],
        ),
      ]),
      html.div(
        [attribute.class("space-y-3")],
        list.take(tasks, 5)
          |> list.map(fn(task) {
            html.div(
              [
                attribute.class(
                  "flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-300 border border-gray-100 dark:border-gray-600",
                ),
              ],
              [
                html.div([], [
                  html.p(
                    [
                      attribute.class(
                        "font-medium text-gray-900 dark:text-white transition-colors duration-300",
                      ),
                    ],
                    [
                      html.text(task.title),
                    ],
                  ),
                  html.p(
                    [
                      attribute.class(
                        "text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300",
                      ),
                    ],
                    [
                      html.text(task.priority <> " · " <> task.status),
                    ],
                  ),
                ]),
                html.span(
                  [
                    attribute.class(
                      "text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300",
                    ),
                  ],
                  [
                    html.text(case task.due_date {
                      option.Some(date) -> date
                      option.None -> "No due date"
                    }),
                  ],
                ),
              ],
            )
          }),
      ),
    ],
  )
}
