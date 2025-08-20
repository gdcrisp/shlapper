import backend/db
import gleam/io
import gleam/option.{None}
import gleam/string
import gleam/time/calendar
import gleeunit

pub fn main() -> Nil {
  gleeunit.main()
}

// Test with single shared connection like the real API
pub fn api_simulation_test() {
  // Create a single database connection like the API does on startup
  case db.connect() {
    Ok(conn) -> {
      io.println("✅ Single connection pool created (like API startup)")

      // Simulate multiple API requests using the same connection
      api_request_simulation(conn, 1)
      api_request_simulation(conn, 2)
      api_request_simulation(conn, 3)

      io.println("✅ All simulated API requests completed successfully")
      Nil
    }
    Error(err) -> {
      io.println("❌ Failed to create connection pool: " <> string.inspect(err))
      panic as "Connection pool creation failed"
    }
  }
}

// Simulate a single API request (like POST /api/tasks)
fn api_request_simulation(conn: db.DatabaseConnection, request_num: Int) {
  io.println("🔄 Simulating API request #" <> string.inspect(request_num))

  // First ensure we have a project (like the API would check)
  case db.get_projects(conn) {
    Ok(projects) -> {
      case projects {
        [first_project, ..] -> {
          // Simulate task creation with exact same parameters as API
          case
            db.add_task(
              conn,
              first_project.id,
              // Use existing project
              "API Test Task " <> string.inspect(request_num),
              "Simulating API request",
              None,
              // assigned_to = NULL
              "pending",
              // status
              "medium",
              // priority  
              None,
              // due_date = NULL
              0.0,
              // hours_logged = 0.0
            )
          {
            Ok([task]) -> {
              io.println(
                "  ✅ Request #"
                <> string.inspect(request_num)
                <> " - Task created: ID "
                <> string.inspect(task.id),
              )
            }
            Ok(_) -> {
              io.println(
                "  ❌ Request #"
                <> string.inspect(request_num)
                <> " - Unexpected result format",
              )
            }
            Error(err) -> {
              io.println(
                "  ❌ Request #"
                <> string.inspect(request_num)
                <> " - Task creation failed: "
                <> string.inspect(err),
              )
              io.println("      This is the exact error the API encounters!")
            }
          }
        }
        [] -> {
          io.println(
            "  ❌ No projects available for request #"
            <> string.inspect(request_num),
          )
        }
      }
    }
    Error(err) -> {
      io.println(
        "  ❌ Request #"
        <> string.inspect(request_num)
        <> " - Failed to get projects: "
        <> string.inspect(err),
      )
    }
  }
}

// Test with the exact project ID that was failing (81)
pub fn specific_project_test() {
  case db.connect() {
    Ok(conn) -> {
      io.println("🔍 Testing with specific project ID 81 (from API logs)")

      case
        db.add_task(
          conn,
          81,
          // The exact project_id from API logs
          "Project 81 Test",
          // title
          "Testing project ID 81",
          // description
          None,
          // assigned_to = NULL
          "pending",
          // status  
          "medium",
          // priority
          None,
          // due_date = NULL
          0.0,
          // hours_logged = 0.0
        )
      {
        Ok([task]) -> {
          io.println("✅ SUCCESS! Task created with project ID 81")
          io.println("  Task ID: " <> string.inspect(task.id))
          io.println("  This means the API should work now!")
        }
        Ok(_) -> {
          io.println("❌ Unexpected result format")
        }
        Error(err) -> {
          io.println("❌ FAILED with project ID 81")
          io.println("  Error: " <> string.inspect(err))
          io.println("  This is the exact API error!")
        }
      }
    }
    Error(err) -> {
      io.println("❌ Connection failed: " <> string.inspect(err))
      panic as "Connection failed"
    }
  }
}
