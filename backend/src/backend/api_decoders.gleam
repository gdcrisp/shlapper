import backend/shared_types.{
  type CreateProjectRequest, type CreateTaskRequest,
  type UpdateProjectRequest, type UpdateTaskRequest,
  CreateProjectRequest, CreateTaskRequest,
  UpdateProjectRequest, UpdateTaskRequest,
}
import gleam/dynamic
import gleam/dynamic/decode

// JSON Decoders for API requests - keeping strings for now
pub fn decode_create_project_request(
  json_data: dynamic.Dynamic,
) -> Result(CreateProjectRequest, List(decode.DecodeError)) {
  decode.run(json_data, {
    use name <- decode.field("name", decode.string)
    use description <- decode.field("description", decode.string)
    use deadline <- decode.field("deadline", decode.string)
    use status <- decode.field("status", decode.string)
    use color <- decode.field("color", decode.string)
    decode.success(CreateProjectRequest(
      name: name,
      description: description,
      deadline: deadline,
      status: status,
      color: color,
    ))
  })
}

pub fn decode_update_project_request(
  json_data: dynamic.Dynamic,
) -> Result(UpdateProjectRequest, List(decode.DecodeError)) {
  decode.run(json_data, {
    use name <- decode.field("name", decode.string)
    use description <- decode.field("description", decode.string)
    use deadline <- decode.field("deadline", decode.string)
    use status <- decode.field("status", decode.string)
    use color <- decode.field("color", decode.string)
    decode.success(UpdateProjectRequest(
      name: name,
      description: description,
      deadline: deadline,
      status: status,
      color: color,
    ))
  })
}

pub fn decode_create_task_request(
  json_data: dynamic.Dynamic,
) -> Result(CreateTaskRequest, List(decode.DecodeError)) {
  decode.run(json_data, {
    use project_id <- decode.field("project_id", decode.int)
    use title <- decode.field("title", decode.string)
    use description <- decode.field("description", decode.string)
    use assigned_to <- decode.field("assigned_to", decode.optional(decode.int))
    use status <- decode.field("status", decode.string)
    use priority <- decode.field("priority", decode.string)
    use due_date <- decode.field("due_date", decode.optional(decode.string))
    use hours_logged <- decode.field("hours_logged", decode.float)
    decode.success(CreateTaskRequest(
      project_id: project_id,
      title: title,
      description: description,
      assigned_to: assigned_to,
      status: status,
      priority: priority,
      due_date: due_date,
      hours_logged: hours_logged,
    ))
  })
}

pub fn decode_update_task_request(
  json_data: dynamic.Dynamic,
) -> Result(UpdateTaskRequest, List(decode.DecodeError)) {
  decode.run(json_data, {
    use project_id <- decode.field("project_id", decode.int)
    use title <- decode.field("title", decode.string)
    use description <- decode.field("description", decode.string)
    use assigned_to <- decode.field("assigned_to", decode.optional(decode.int))
    use status <- decode.field("status", decode.string)
    use priority <- decode.field("priority", decode.string)
    use due_date <- decode.field("due_date", decode.optional(decode.string))
    use hours_logged <- decode.field("hours_logged", decode.float)
    decode.success(UpdateTaskRequest(
      project_id: project_id,
      title: title,
      description: description,
      assigned_to: assigned_to,
      status: status,
      priority: priority,
      due_date: due_date,
      hours_logged: hours_logged,
    ))
  })
}