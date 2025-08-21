import backend/api_decoders
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


