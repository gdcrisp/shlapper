import gleam/list
import gleam/result

pub type MaterialColor {
  MaterialColor(
    name: String,
    bg_class: String,
    text_class: String,
    border_class: String,
    hover_class: String,
  )
}

pub fn get_material_colors() -> List(MaterialColor) {
  [
    MaterialColor(
      "red",
      "bg-rose-500",
      "text-white",
      "border-rose-600",
      "hover:bg-rose-600",
    ),
    MaterialColor(
      "pink",
      "bg-fuchsia-300",
      "text-black",
      "border-fuchsia-400",
      "hover:bg-fuchsia-400",
    ),
    MaterialColor(
      "purple",
      "bg-purple-500",
      "text-white",
      "border-purple-600",
      "hover:bg-purple-600",
    ),
    MaterialColor(
      "deep-purple",
      "bg-violet-600",
      "text-white",
      "border-violet-700",
      "hover:bg-violet-700",
    ),
    MaterialColor(
      "indigo",
      "bg-indigo-500",
      "text-white",
      "border-indigo-600",
      "hover:bg-indigo-600",
    ),
    MaterialColor(
      "blue",
      "bg-blue-500",
      "text-white",
      "border-blue-600",
      "hover:bg-blue-600",
    ),
    MaterialColor(
      "light-blue",
      "bg-sky-400",
      "text-white",
      "border-sky-500",
      "hover:bg-sky-500",
    ),
    MaterialColor(
      "cyan",
      "bg-cyan-500",
      "text-white",
      "border-cyan-600",
      "hover:bg-cyan-600",
    ),
    MaterialColor(
      "teal",
      "bg-teal-500",
      "text-white",
      "border-teal-600",
      "hover:bg-teal-600",
    ),
    MaterialColor(
      "green",
      "bg-green-500",
      "text-white",
      "border-green-600",
      "hover:bg-green-600",
    ),
    MaterialColor(
      "light-green",
      "bg-lime-500",
      "text-white",
      "border-lime-600",
      "hover:bg-lime-600",
    ),
    MaterialColor(
      "lime",
      "bg-lime-400",
      "text-black",
      "border-lime-500",
      "hover:bg-lime-500",
    ),
    MaterialColor(
      "yellow",
      "bg-yellow-400",
      "text-black",
      "border-yellow-500",
      "hover:bg-yellow-500",
    ),
    MaterialColor(
      "amber",
      "bg-amber-500",
      "text-black",
      "border-amber-600",
      "hover:bg-amber-600",
    ),
    MaterialColor(
      "orange",
      "bg-orange-500",
      "text-white",
      "border-orange-600",
      "hover:bg-orange-600",
    ),
    MaterialColor(
      "deep-orange",
      "bg-orange-600",
      "text-white",
      "border-orange-700",
      "hover:bg-orange-700",
    ),
  ]
}

pub fn get_color_by_name(color_name: String) -> MaterialColor {
  get_material_colors()
  |> list.find(fn(color) { color.name == color_name })
  |> result.unwrap(MaterialColor(
    "blue",
    "bg-blue-500",
    "text-white",
    "border-blue-600",
    "hover:bg-blue-600",
  ))
}

pub fn get_project_color_classes(color_name: String) -> String {
  let color = get_color_by_name(color_name)
  color.bg_class <> " " <> color.text_class <> " " <> color.border_class
}

pub fn get_project_badge_classes(color_name: String) -> String {
  let color = get_color_by_name(color_name)
  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium "
  <> color.bg_class
  <> " "
  <> color.text_class
}

pub fn get_kanban_accent_classes(color_name: String) -> String {
  let color = get_color_by_name(color_name)
  color.bg_class <> " opacity-30"
}
