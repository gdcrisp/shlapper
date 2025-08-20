import backend/db
import backend/sql
import gleam/io
import gleam/list
import gleam/option.{None, Some}
import gleam/string
import gleam/time/calendar
import gleeunit

pub fn main() -> Nil {
  gleeunit.main()
}

// Simple test to identify the exact database issue
pub fn debug_task_creation_test() {
  case db.connect() {
    Ok(conn) -> {
      io.println("🔍 Starting debug task creation test")

      // Check if we have any existing projects
      case db.get_projects(conn) {
        Ok(projects) -> {
          case projects {
            [first_project, ..] -> {
              io.println(
                "✅ Found existing project: "
                <> first_project.name
                <> " (ID: "
                <> string.inspect(first_project.id)
                <> ")",
              )

              // Try to create a simple task
              io.println("🔄 Attempting task creation...")
              case
                db.add_task(
                  conn,
                  first_project.id,
                  "Debug Test Task",
                  "Simple debug test",
                  None,
                  // assigned_to = NULL
                  "pending",
                  // status
                  "medium",
                  // priority  
                  None,
                  // due_date = NULL
                  0.0,
                  // hours_logged
                )
              {
                Ok([task]) -> {
                  io.println(
                    "✅ SUCCESS! Task created with ID: "
                    <> string.inspect(task.id),
                  )
                  Nil
                }
                Ok(_) -> {
                  io.println("❌ Unexpected result format from task creation")
                  panic as "Unexpected task creation result"
                }
                Error(err) -> {
                  io.println("❌ TASK CREATION FAILED!")
                  io.println("Error type: " <> string.inspect(err))

                  // This is the actual error that the API is encountering!
                  panic as "Task creation failed - this is our root issue"
                }
              }
            }
            [] -> {
              io.println("❌ No projects found in database")
              panic as "No projects to test with"
            }
          }
        }
        Error(err) -> {
          io.println("❌ Failed to get projects: " <> string.inspect(err))
          panic as "Cannot test task creation without projects"
        }
      }
    }
    Error(err) -> {
      io.println("❌ Database connection failed: " <> string.inspect(err))
      panic as "Database connection failed"
    }
  }
}

// Test creating a simple project first to ensure basic operations work
pub fn debug_project_creation_test() {
  case db.connect() {
    Ok(conn) -> {
      io.println("🔍 Testing project creation")
      let deadline = calendar.Date(2025, calendar.June, 30)

      case
        db.add_project(
          conn,
          "Debug Test Project",
          "For debugging",
          deadline,
          "active",
          "blue",
        )
      {
        Ok([project]) -> {
          io.println(
            "✅ Project created successfully: "
            <> project.name
            <> " (ID: "
            <> string.inspect(project.id)
            <> ")",
          )
          Nil
        }
        Ok(_) -> {
          io.println("❌ Unexpected project creation result format")
          panic as "Unexpected project result format"
        }
        Error(err) -> {
          io.println("❌ Project creation failed: " <> string.inspect(err))
          panic as "Project creation failed"
        }
      }
    }
    Error(err) -> {
      io.println("❌ Database connection failed: " <> string.inspect(err))
      panic as "Database connection failed"
    }
  }
}

// Test the raw SQL add_task_with_nulls directly
pub fn debug_raw_sql_task_test() {
  case db.connect() {
    Ok(conn) -> {
      io.println("🔍 Testing raw SQL task creation")

      // Create a project first using raw SQL
      let deadline = calendar.Date(2025, calendar.July, 31)
      case
        sql.add_project(
          conn.db,
          "Raw Debug Project",
          "Testing raw SQL",
          deadline,
          "active",
          "green",
        )
      {
        Ok(project_result) -> {
          case project_result.rows {
            [project] -> {
              io.println(
                "✅ Raw project created: ID " <> string.inspect(project.id),
              )

              // Now try raw SQL task creation
              io.println("🔄 Attempting raw SQL task creation...")
              case
                sql.add_task_with_nulls(
                  conn.db,
                  project.id,
                  // project_id
                  "Raw Debug Task",
                  // title
                  "Raw SQL debug test",
                  // description  
                  0,
                  // assigned_to (will become NULL via NULLIF)
                  "pending",
                  // status
                  "medium",
                  // priority
                  calendar.Date(1900, calendar.January, 1),
                  // due_date (will become NULL via NULLIF)
                  0.0,
                  // hours_logged
                )
              {
                Ok(task_result) -> {
                  case task_result.rows {
                    [task] -> {
                      io.println("✅ Raw SQL task creation SUCCESS!")
                      io.println("  Task ID: " <> string.inspect(task.id))
                      io.println(
                        "  Project ID: " <> string.inspect(task.project_id),
                      )
                      io.println("  Title: " <> task.title)
                      Nil
                    }
                    _ -> {
                      io.println("❌ Unexpected raw SQL task result format")
                      panic as "Unexpected raw SQL task result"
                    }
                  }
                }
                Error(err) -> {
                  io.println("❌ RAW SQL TASK CREATION FAILED!")
                  io.println("Error: " <> string.inspect(err))
                  panic as "Raw SQL task creation failed"
                }
              }
            }
            _ -> {
              io.println("❌ Unexpected raw SQL project result format")
              panic as "Unexpected raw SQL project result"
            }
          }
        }
        Error(err) -> {
          io.println(
            "❌ Raw SQL project creation failed: " <> string.inspect(err),
          )
          panic as "Raw SQL project creation failed"
        }
      }
    }
    Error(err) -> {
      io.println("❌ Database connection failed: " <> string.inspect(err))
      panic as "Database connection failed"
    }
  }
}
