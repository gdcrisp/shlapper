import backend/shared_types.{
  type CreateProjectRequest, type CreateTaskRequest,
  type UpdateProjectRequest, type UpdateTaskRequest,
  CreateProjectRequest, CreateTaskRequest,
  UpdateProjectRequest, UpdateTaskRequest,
}
import gleam/dynamic
import gleam/dynamic/decode
import gleam/int

// Helper decoder for hours_logged that accepts both int and float
fn decode_hours_logged() -> decode.Decoder(Float) {
  decode.one_of(decode.float, [decode.map(decode.int, int.to_float)])
}

// JSON Decoders for API requests - now decoding directly to enums!
pub fn decode_create_project_request(
  json_data: dynamic.Dynamic,
) -> Result(CreateProjectRequest, List(decode.DecodeError)) {
  case decode.run(json_data, {
    use name <- decode.field("name", decode.string)
    use description <- decode.field("description", decode.string)
    use deadline <- decode.field("deadline", decode.string)
    use status_str <- decode.field("status", decode.string)
    use color_str <- decode.field("color", decode.string)
    decode.success(#(name, description, deadline, status_str, color_str))
  }) {
    Error(errs) -> Error(errs)
    Ok(#(name, description, deadline, status_str, color_str)) -> {
      // Validate enums after successful decode - now returning enums!
      case shared_types.project_status_from_string(status_str) {
        Error(_msg) -> Error([decode.DecodeError(expected: "valid project status", found: status_str, path: ["status"])])
        Ok(status) -> case shared_types.project_color_from_string(color_str) {
          Error(_msg) -> Error([decode.DecodeError(expected: "valid project color", found: color_str, path: ["color"])])
          Ok(color) -> Ok(CreateProjectRequest(
            name: name,
            description: description,
            deadline: deadline,
            status: status,  // Now using actual enum!
            color: color,    // Now using actual enum!
          ))
        }
      }
    }
  }
}

pub fn decode_update_project_request(
  json_data: dynamic.Dynamic,
) -> Result(UpdateProjectRequest, List(decode.DecodeError)) {
  case decode.run(json_data, {
    use name <- decode.field("name", decode.string)
    use description <- decode.field("description", decode.string)
    use deadline <- decode.field("deadline", decode.string)
    use status_str <- decode.field("status", decode.string)
    use color_str <- decode.field("color", decode.string)
    decode.success(#(name, description, deadline, status_str, color_str))
  }) {
    Error(errs) -> Error(errs)
    Ok(#(name, description, deadline, status_str, color_str)) -> {
      // Validate enums after successful decode - now returning enums!
      case shared_types.project_status_from_string(status_str) {
        Error(_msg) -> Error([decode.DecodeError(expected: "valid project status", found: status_str, path: ["status"])])
        Ok(status) -> case shared_types.project_color_from_string(color_str) {
          Error(_msg) -> Error([decode.DecodeError(expected: "valid project color", found: color_str, path: ["color"])])
          Ok(color) -> Ok(UpdateProjectRequest(
            name: name,
            description: description,
            deadline: deadline,
            status: status,  // Now using actual enum!
            color: color,    // Now using actual enum!
          ))
        }
      }
    }
  }
}

pub fn decode_create_task_request(
  json_data: dynamic.Dynamic,
) -> Result(CreateTaskRequest, List(decode.DecodeError)) {
  case decode.run(json_data, {
    use project_id <- decode.field("project_id", decode.int)
    use title <- decode.field("title", decode.string)
    use description <- decode.field("description", decode.string)
    use assigned_to <- decode.field("assigned_to", decode.optional(decode.int))
    use status_str <- decode.field("status", decode.string)
    use priority_str <- decode.field("priority", decode.string)
    use due_date <- decode.field("due_date", decode.optional(decode.string))
    use hours_logged <- decode.field("hours_logged", decode_hours_logged())
    decode.success(#(project_id, title, description, assigned_to, status_str, priority_str, due_date, hours_logged))
  }) {
    Error(errs) -> Error(errs)
    Ok(#(project_id, title, description, assigned_to, status_str, priority_str, due_date, hours_logged)) -> {
      // Validate enums after successful decode - now returning enums!
      case shared_types.task_status_from_string(status_str) {
        Error(_msg) -> Error([decode.DecodeError(expected: "valid task status", found: status_str, path: ["status"])])
        Ok(status) -> case shared_types.task_priority_from_string(priority_str) {
          Error(_msg) -> Error([decode.DecodeError(expected: "valid task priority", found: priority_str, path: ["priority"])])
          Ok(priority) -> Ok(CreateTaskRequest(
            project_id: project_id,
            title: title,
            description: description,
            assigned_to: assigned_to,
            status: status,      // Now using actual enum!
            priority: priority,  // Now using actual enum!
            due_date: due_date,
            hours_logged: hours_logged,
          ))
        }
      }
    }
  }
}

pub fn decode_update_task_request(
  json_data: dynamic.Dynamic,
) -> Result(UpdateTaskRequest, List(decode.DecodeError)) {
  case decode.run(json_data, {
    use project_id <- decode.field("project_id", decode.int)
    use title <- decode.field("title", decode.string)
    use description <- decode.field("description", decode.string)
    use assigned_to <- decode.field("assigned_to", decode.optional(decode.int))
    use status_str <- decode.field("status", decode.string)
    use priority_str <- decode.field("priority", decode.string)
    use due_date <- decode.field("due_date", decode.optional(decode.string))
    use hours_logged <- decode.field("hours_logged", decode_hours_logged())
    decode.success(#(project_id, title, description, assigned_to, status_str, priority_str, due_date, hours_logged))
  }) {
    Error(errs) -> Error(errs)
    Ok(#(project_id, title, description, assigned_to, status_str, priority_str, due_date, hours_logged)) -> {
      // Validate enums after successful decode - now returning enums!
      case shared_types.task_status_from_string(status_str) {
        Error(_msg) -> Error([decode.DecodeError(expected: "valid task status", found: status_str, path: ["status"])])
        Ok(status) -> case shared_types.task_priority_from_string(priority_str) {
          Error(_msg) -> Error([decode.DecodeError(expected: "valid task priority", found: priority_str, path: ["priority"])])
          Ok(priority) -> Ok(UpdateTaskRequest(
            project_id: project_id,
            title: title,
            description: description,
            assigned_to: assigned_to,
            status: status,      // Now using actual enum!
            priority: priority,  // Now using actual enum!
            due_date: due_date,
            hours_logged: hours_logged,
          ))
        }
      }
    }
  }
}