import gleam/list
import gleam/string
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html
import types.{type CacheInfo, type TeamMember}

pub fn view_team(
  team_members: List(TeamMember),
  cache_info: CacheInfo,
) -> Element(msg) {
  html.div([attribute.class("space-y-4")], [
    html.h2(
      [
        attribute.class(
          "text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300",
        ),
      ],
      [
        html.text("Team Members"),
      ],
    ),
    case cache_info.is_loading {
      True -> view_loading()
      False ->
        html.div(
          [attribute.class("grid gap-4 md:grid-cols-2 lg:grid-cols-3")],
          list.map(team_members, team_member_card),
        )
    },
  ])
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

fn team_member_card(member: TeamMember) -> Element(msg) {
  html.div(
    [
      attribute.class(
        "bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/20 hover:shadow-lg dark:hover:shadow-gray-700/40 p-6 transition-all duration-300 transform hover:scale-105 border border-transparent dark:border-gray-700",
      ),
    ],
    [
      html.div([attribute.class("text-center")], [
        html.div(
          [
            attribute.class(
              "w-16 h-16 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg",
            ),
          ],
          [
            html.span([attribute.class("text-white font-semibold text-xl")], [
              html.text(string.slice(member.name, 0, 1)),
            ]),
          ],
        ),
        html.h3(
          [
            attribute.class(
              "text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300",
            ),
          ],
          [
            html.text(member.name),
          ],
        ),
        html.p(
          [
            attribute.class(
              "text-gray-600 dark:text-gray-400 transition-colors duration-300",
            ),
          ],
          [
            html.text(case member.role {
              "manager" -> "Manager"
              "developer" -> "Developer"
              _ -> "Guest"
            }),
          ],
        ),
        html.p(
          [
            attribute.class(
              "text-sm text-gray-500 dark:text-gray-400 mt-2 transition-colors duration-300",
            ),
          ],
          [
            html.text(member.email),
          ],
        ),
      ]),
    ],
  )
}
