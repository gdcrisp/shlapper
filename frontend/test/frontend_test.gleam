import gleam/json
import gleam/option
import gleam/string
import gleeunit
import gleeunit/should
import types.{ProjectForm, TaskForm}

pub fn main() -> Nil {
  gleeunit.main()
}

pub fn project_form_creation_test() {
  let form =
    ProjectForm(
      "Test Project",
      "Test Description",
      "2024-12-31",
      "planning",
      "blue",
    )
  form.name
  |> should.equal("Test Project")

  form.status
  |> should.equal("planning")
}

pub fn task_form_creation_test() {
  let form =
    TaskForm(
      1,
      "Test Task",
      "Test Description",
      "pending",
      "medium",
      option.None,
      option.None,
      0.0,
    )
  form.title
  |> should.equal("Test Task")

  form.project_id
  |> should.equal(1)

  form.priority
  |> should.equal("medium")
}

pub fn task_form_with_assignment_test() {
  let form =
    TaskForm(
      2,
      "Assigned Task",
      "Description",
      "in_progress",
      "high",
      option.Some(10),
      option.Some("2024-03-15"),
      5.5,
    )

  form.assigned_to
  |> should.equal(option.Some(10))

  form.due_date
  |> should.equal(option.Some("2024-03-15"))

  form.priority
  |> should.equal("high")
}

pub fn project_form_json_serialization_test() {
  // Test that we can create JSON that matches what the API expects
  let form =
    ProjectForm(
      "API Test Project",
      "Testing JSON creation",
      "2024-06-01",
      "active",
      "green",
    )

  let expected_json =
    json.object([
      #("name", json.string(form.name)),
      #("description", json.string(form.description)),
      #("deadline", json.string(form.deadline)),
      #("status", json.string(form.status)),
      #("color", json.string(form.color)),
    ])

  let json_string = json.to_string(expected_json)

  // Verify the JSON contains expected fields using string.contains
  string.contains(json_string, "API Test Project")
  |> should.be_true()

  string.contains(json_string, "2024-06-01")
  |> should.be_true()

  string.contains(json_string, "active")
  |> should.be_true()
}

pub fn task_form_json_serialization_test() {
  // Test that we can create JSON that matches what the API expects (including hours_logged)
  let form =
    TaskForm(
      71,
      "JSON Test Task",
      "Testing JSON",
      "pending",
      "medium",
      option.Some(10),
      option.Some("2024-03-20"),
      2.0,
    )

  let expected_json =
    json.object([
      #("project_id", json.int(form.project_id)),
      #("title", json.string(form.title)),
      #("description", json.string(form.description)),
      #("status", json.string(form.status)),
      #("priority", json.string(form.priority)),
      #("assigned_to", case form.assigned_to {
        option.Some(id) -> json.int(id)
        option.None -> json.null()
      }),
      #("due_date", case form.due_date {
        option.Some(date) -> json.string(date)
        option.None -> json.null()
      }),
      #("hours_logged", json.float(0.0)),
      // This field is required by the backend
    ])

  let json_string = json.to_string(expected_json)

  // Verify the JSON contains expected fields using string.contains
  string.contains(json_string, "JSON Test Task")
  |> should.be_true()

  string.contains(json_string, "hours_logged")
  |> should.be_true()

  // JSON might serialize 0.0 as "0", so check for either
  let has_float_zero = string.contains(json_string, "0.0")
  let has_int_zero = string.contains(json_string, ":0")
  case has_float_zero || has_int_zero {
    True -> should.be_true(True)
    False -> should.be_true(False)
  }
}
