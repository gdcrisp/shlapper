import backend/api
import backend/db
import gleam/io
import gleam/option
import gleam/string
import gleam/time/calendar
import gleeunit

pub fn main() -> Nil {
  gleeunit.main()
}

pub fn database_connection_test() {
  case db.connect() {
    Ok(_conn) -> Nil
    Error(_) -> panic as "Failed to connect to database"
  }
}

pub fn get_existing_data_test() {
  case db.connect() {
    Ok(conn) -> {
      // Test if we can read projects (should have sample data)
      case db.get_projects(conn) {
        Ok(_projects) -> Nil
        Error(err) -> {
          io.println("Database read error: " <> string.inspect(err))
          panic as "Failed to read projects - database might not be initialized"
        }
      }
    }
    Error(_) -> panic as "Failed to connect to database"
  }
}

pub fn add_project_debug_test() {
  case db.connect() {
    Ok(conn) -> {
      let deadline = calendar.Date(2024, calendar.December, 31)
      case
        db.add_project(
          conn,
          "Test Project",
          "Test Description",
          deadline,
          "active",
          "blue",
        )
      {
        Ok(_projects) -> Nil
        Error(err) -> {
          io.println("Add project error: " <> string.inspect(err))
          panic as "Failed to add project - see error above"
        }
      }
    }
    Error(_) -> panic as "Failed to connect to database"
  }
}

// Test database task creation directly
pub fn add_task_db_test() {
  case db.connect() {
    Ok(conn) -> {
      // First ensure we have a project to assign tasks to
      let deadline = calendar.Date(2024, calendar.December, 31)
      case
        db.add_project(
          conn,
          "Test Project for Tasks",
          "Testing tasks",
          deadline,
          "active",
          "green",
        )
      {
        Ok([project]) -> {
          // Now test adding a task
          case
            db.add_task(
              conn,
              project.id,
              "Test Task",
              "Testing task creation",
              option.Some(10),
              // assuming team member 10 exists
              "pending",
              "medium",
              option.Some(calendar.Date(2024, calendar.March, 15)),
              5.5,
            )
          {
            Ok([task]) -> {
              io.println("✅ Task created successfully: " <> task.title)
              Nil
            }
            Ok(_) -> panic as "Unexpected task creation result"
            Error(err) -> {
              io.println("❌ Add task error: " <> string.inspect(err))
              panic as "Failed to add task - see error above"
            }
          }
        }
        Ok(_) -> panic as "Unexpected project creation result"
        Error(err) -> {
          io.println("❌ Add project error: " <> string.inspect(err))
          panic as "Failed to add project for task test"
        }
      }
    }
    Error(_) -> panic as "Failed to connect to database"
  }
}

// Test JSON parsing functions specifically  
pub fn json_parsing_test() {
  let test_json =
    "{\"project_id\": 71, \"title\": \"Test Task\", \"description\": \"Test\", \"status\": \"pending\", \"priority\": \"medium\", \"assigned_to\": 10, \"due_date\": \"2024-03-20\", \"hours_logged\": 0.0}"
  io.println("🧪 Testing JSON: " <> test_json)

  // Test int parsing
  case api.test_extract_json_int_field(test_json, "project_id") {
    Ok(project_id) -> {
      io.println("✅ Extracted project_id: " <> string.inspect(project_id))
    }
    Error(err) -> {
      io.println("❌ Project ID extraction failed: " <> err)
      panic as "JSON int parsing failed"
    }
  }

  // Test float parsing (this is where the issue occurs)
  case api.test_extract_json_float_field(test_json, "hours_logged") {
    Ok(hours) -> {
      io.println("✅ Extracted hours_logged: " <> string.inspect(hours))
      Nil
    }
    Error(err) -> {
      io.println("❌ Hours extraction failed: " <> err)
      panic as "JSON float parsing failed"
    }
  }
}

// Test full API task creation pipeline with frontend JSON format
pub fn api_task_creation_test() {
  case db.connect() {
    Ok(conn) -> {
      // Test the raw JSON that should be sent by the frontend
      let frontend_json =
        "{\"project_id\":71,\"title\":\"Frontend Test\",\"description\":\"Testing frontend format\",\"status\":\"pending\",\"priority\":\"medium\",\"assigned_to\":null,\"due_date\":null,\"hours_logged\":0.0}"
      io.println("🔍 Testing frontend-style JSON: " <> frontend_json)

      // Test parsing each field as the API would
      case api.test_extract_json_int_field(frontend_json, "project_id") {
        Ok(_) -> io.println("✅ project_id parsed")
        Error(e) -> io.println("❌ project_id failed: " <> e)
      }

      case api.test_extract_json_float_field(frontend_json, "hours_logged") {
        Ok(_) -> io.println("✅ hours_logged parsed")
        Error(e) -> io.println("❌ hours_logged failed: " <> e)
      }

      // Test null handling for optional fields
      case
        api.test_extract_json_optional_int_field(frontend_json, "assigned_to")
      {
        Ok(_) -> io.println("✅ assigned_to parsed (null)")
        Error(e) -> io.println("❌ assigned_to failed: " <> e)
      }

      case
        api.test_extract_json_optional_string_field(frontend_json, "due_date")
      {
        Ok(_) -> io.println("✅ due_date parsed (null)")
        Error(e) -> io.println("❌ due_date failed: " <> e)
      }

      Nil
    }
    Error(_) -> panic as "Failed to connect to database"
  }
}

// Test the exact frontend JSON structure comprehensively
pub fn frontend_backend_parity_test() {
  // Test the exact JSON structure that the frontend sends
  let frontend_json =
    "{\"project_id\":71,\"title\":\"Test Task\",\"description\":\"Test description\",\"status\":\"todo\",\"priority\":\"medium\",\"assigned_to\":null,\"due_date\":null,\"hours_logged\":0.0}"

  io.println("🔍 Testing frontend JSON parsing...")
  io.println("Frontend JSON: " <> frontend_json)

  // Test each field extraction  
  let project_id_result =
    api.test_extract_json_int_field(frontend_json, "project_id")
  let title_result = api.test_extract_json_string_field(frontend_json, "title")
  let description_result =
    api.test_extract_json_string_field(frontend_json, "description")
  let status_result =
    api.test_extract_json_string_field(frontend_json, "status")
  let priority_result =
    api.test_extract_json_string_field(frontend_json, "priority")
  let hours_logged_result =
    api.test_extract_json_float_field(frontend_json, "hours_logged")

  io.println("📊 Parsing results:")
  io.println("  project_id: " <> string.inspect(project_id_result))
  io.println("  title: " <> string.inspect(title_result))
  io.println("  description: " <> string.inspect(description_result))
  io.println("  status: " <> string.inspect(status_result))
  io.println("  priority: " <> string.inspect(priority_result))
  io.println("  hours_logged: " <> string.inspect(hours_logged_result))

  // Test null handling for optional fields
  let assigned_to_result =
    api.test_extract_json_optional_int_field(frontend_json, "assigned_to")
  let due_date_result =
    api.test_extract_json_optional_string_field(frontend_json, "due_date")

  io.println("  assigned_to (null): " <> string.inspect(assigned_to_result))
  io.println("  due_date (null): " <> string.inspect(due_date_result))

  // Verify all required fields parse correctly
  case
    project_id_result,
    title_result,
    description_result,
    status_result,
    priority_result,
    hours_logged_result
  {
    Ok(_), Ok(_), Ok(_), Ok(_), Ok(_), Ok(_) -> {
      io.println("✅ All required fields parse successfully")
    }
    _, _, _, _, _, _ -> {
      io.println("❌ Some required fields failed to parse")
    }
  }
}
