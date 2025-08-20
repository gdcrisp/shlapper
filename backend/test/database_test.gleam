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

// Basic connection and health tests
pub fn database_connection_test() {
  case db.connect() {
    Ok(conn) -> {
      io.println("✅ Database connection successful")
      Nil
    }
    Error(err) -> {
      io.println("❌ Database connection failed: " <> string.inspect(err))
      panic as "Failed to connect to database"
    }
  }
}

pub fn database_health_test() {
  case db.connect() {
    Ok(conn) -> {
      // Test basic queries to ensure database is healthy
      case db.get_projects(conn) {
        Ok(_) -> {
          io.println("✅ Database health check: projects query successful")
        }
        Error(err) -> {
          io.println(
            "❌ Database health check failed on projects: "
            <> string.inspect(err),
          )
          panic as "Database health check failed"
        }
      }
    }
    Error(_) -> panic as "Failed to connect to database"
  }
}

// Project CRUD tests
pub fn project_crud_test() {
  case db.connect() {
    Ok(conn) -> {
      let deadline = calendar.Date(2025, calendar.December, 31)

      // Test project creation
      case
        db.add_project(
          conn,
          "Test CRUD Project",
          "Testing CRUD operations",
          deadline,
          "active",
          "red",
        )
      {
        Ok([project]) -> {
          io.println("✅ Project created successfully: " <> project.name)

          // Test project retrieval 
          case db.get_projects(conn) {
            Ok(projects) -> {
              let found = case
                projects |> list_find_by_name("Test CRUD Project")
              {
                Some(_) -> True
                None -> False
              }

              case found {
                True -> io.println("✅ Project retrieval successful")
                False -> {
                  io.println("❌ Created project not found in projects list")
                  panic as "Project retrieval test failed"
                }
              }
            }
            Error(err) -> {
              io.println("❌ Project retrieval failed: " <> string.inspect(err))
              panic as "Project retrieval failed"
            }
          }
        }
        Ok(_) -> panic as "Unexpected project creation result format"
        Error(err) -> {
          io.println("❌ Project creation failed: " <> string.inspect(err))
          panic as "Project creation test failed"
        }
      }
    }
    Error(_) -> panic as "Failed to connect to database"
  }
}

// Helper function to find project by name
fn list_find_by_name(
  projects: List(sql.GetProjectsRow),
  name: String,
) -> option.Option(sql.GetProjectsRow) {
  case projects {
    [] -> None
    [first, ..rest] ->
      case first.name == name {
        True -> Some(first)
        False -> list_find_by_name(rest, name)
      }
  }
}

// SQL layer tests - test raw SQL functions
pub fn sql_add_project_test() {
  case db.connect() {
    Ok(conn) -> {
      let deadline = calendar.Date(2025, calendar.January, 15)

      case
        sql.add_project(
          conn.db,
          "SQL Test Project",
          "Testing raw SQL",
          deadline,
          "active",
          "purple",
        )
      {
        Ok(result) -> {
          io.println(
            "✅ SQL add_project successful, rows returned: "
            <> string.inspect(list.length(result.rows)),
          )

          case result.rows {
            [project] -> {
              io.println("  Project ID: " <> string.inspect(project.id))
              io.println("  Project name: " <> project.name)
            }
            _ -> {
              io.println("❌ Unexpected number of rows returned")
              panic as "SQL add_project returned unexpected results"
            }
          }
        }
        Error(err) -> {
          io.println("❌ SQL add_project failed: " <> string.inspect(err))
          panic as "Raw SQL add_project test failed"
        }
      }
    }
    Error(_) -> panic as "Failed to connect to database"
  }
}

// Task creation tests - focus on the issue we're debugging
pub fn task_creation_basic_test() {
  case db.connect() {
    Ok(conn) -> {
      // First create a project to assign tasks to
      let deadline = calendar.Date(2025, calendar.February, 28)
      case
        db.add_project(
          conn,
          "Task Test Project",
          "For testing task creation",
          deadline,
          "active",
          "orange",
        )
      {
        Ok([project]) -> {
          io.println(
            "✅ Test project created with ID: " <> string.inspect(project.id),
          )

          // Now test basic task creation
          case
            db.add_task(
              conn,
              project.id,
              "Basic Test Task",
              "Testing basic task creation",
              None,
              // assigned_to
              "pending",
              "medium",
              None,
              // due_date
              0.0,
              // hours_logged
            )
          {
            Ok([task]) -> {
              io.println("✅ Basic task created successfully")
              io.println("  Task ID: " <> string.inspect(task.id))
              io.println("  Project ID: " <> string.inspect(task.project_id))
              io.println("  Title: " <> task.title)
            }
            Ok(_) -> panic as "Unexpected task creation result format"
            Error(err) -> {
              io.println(
                "❌ Basic task creation failed: " <> string.inspect(err),
              )
              panic as "Basic task creation test failed"
            }
          }
        }
        Ok(_) -> panic as "Unexpected project creation result format"
        Error(err) -> {
          io.println("❌ Test project creation failed: " <> string.inspect(err))
          panic as "Test project creation failed"
        }
      }
    }
    Error(_) -> panic as "Failed to connect to database"
  }
}

// Test task creation with NULL values (mimicking frontend behavior)
pub fn task_creation_with_nulls_test() {
  case db.connect() {
    Ok(conn) -> {
      // Create a project first
      let deadline = calendar.Date(2025, calendar.March, 31)
      case
        db.add_project(
          conn,
          "Null Test Project",
          "For testing NULL handling",
          deadline,
          "active",
          "cyan",
        )
      {
        Ok([project]) -> {
          io.println(
            "✅ Null test project created with ID: "
            <> string.inspect(project.id),
          )

          // Test task creation with NULL assigned_to and due_date (like frontend sends)
          case
            db.add_task(
              conn,
              project.id,
              "Frontend-style Task",
              "Testing NULL handling like frontend",
              None,
              // assigned_to = null
              "pending",
              "medium",
              None,
              // due_date = null  
              0.0,
              // hours_logged = 0.0 (default)
            )
          {
            Ok([task]) -> {
              io.println("✅ Frontend-style task created successfully")
              io.println("  Task ID: " <> string.inspect(task.id))
              io.println("  Assigned to: " <> string.inspect(task.assigned_to))
              io.println("  Due date: " <> string.inspect(task.due_date))
              io.println(
                "  Hours logged: " <> string.inspect(task.hours_logged),
              )
            }
            Ok(_) -> panic as "Unexpected task creation result format"
            Error(err) -> {
              io.println(
                "❌ Frontend-style task creation failed: " <> string.inspect(err),
              )
              io.println(
                "   This might be the same error the API is encountering!",
              )
              panic as "Frontend-style task creation test failed"
            }
          }
        }
        Ok(_) -> panic as "Unexpected project creation result format"
        Error(err) -> {
          io.println(
            "❌ Null test project creation failed: " <> string.inspect(err),
          )
          panic as "Null test project creation failed"
        }
      }
    }
    Error(_) -> panic as "Failed to connect to database"
  }
}

// Test with specific project IDs that exist in database
pub fn task_creation_existing_project_test() {
  case db.connect() {
    Ok(conn) -> {
      // Get existing projects first
      case db.get_projects(conn) {
        Ok(projects) -> {
          case projects {
            [first_project, ..] -> {
              io.println(
                "✅ Found existing project ID: "
                <> string.inspect(first_project.id),
              )

              // Try to create task with existing project ID
              case
                db.add_task(
                  conn,
                  first_project.id,
                  "Existing Project Task",
                  "Testing with real existing project ID",
                  None,
                  "pending",
                  "medium",
                  None,
                  0.0,
                )
              {
                Ok([task]) -> {
                  io.println("✅ Task created with existing project ID")
                  io.println("  Task ID: " <> string.inspect(task.id))
                }
                Ok(_) -> panic as "Unexpected task creation result format"
                Error(err) -> {
                  io.println(
                    "❌ Task creation with existing project failed: "
                    <> string.inspect(err),
                  )
                  panic as "Task creation with existing project test failed"
                }
              }
            }
            [] -> {
              io.println("❌ No existing projects found")
              panic as "No projects available for testing"
            }
          }
        }
        Error(err) -> {
          io.println(
            "❌ Failed to get existing projects: " <> string.inspect(err),
          )
          panic as "Failed to get projects for testing"
        }
      }
    }
    Error(_) -> panic as "Failed to connect to database"
  }
}

// Test raw SQL add_task_with_nulls function
pub fn sql_add_task_with_nulls_test() {
  case db.connect() {
    Ok(conn) -> {
      // Create project first
      let deadline = calendar.Date(2025, calendar.April, 30)
      case
        sql.add_project(
          conn.db,
          "Raw SQL Task Project",
          "Testing raw SQL task creation",
          deadline,
          "active",
          "pink",
        )
      {
        Ok(project_result) -> {
          case project_result.rows {
            [project] -> {
              io.println(
                "✅ Raw SQL project created with ID: "
                <> string.inspect(project.id),
              )

              // Test raw SQL task creation with nulls
              case
                sql.add_task_with_nulls(
                  conn.db,
                  project.id,
                  // project_id
                  "Raw SQL Task",
                  // title  
                  "Testing raw SQL with nulls",
                  // description
                  0,
                  // assigned_to (will be converted to NULL via NULLIF)
                  "pending",
                  // status
                  "medium",
                  // priority
                  calendar.Date(1900, calendar.January, 1),
                  // due_date (will be converted to NULL via NULLIF)
                  0.0,
                  // hours_logged
                )
              {
                Ok(task_result) -> {
                  case task_result.rows {
                    [task] -> {
                      io.println("✅ Raw SQL task created successfully")
                      io.println("  Task ID: " <> string.inspect(task.id))
                      io.println(
                        "  Assigned to: " <> string.inspect(task.assigned_to),
                      )
                      io.println(
                        "  Due date: " <> string.inspect(task.due_date),
                      )
                    }
                    _ -> panic as "Unexpected raw SQL task result format"
                  }
                }
                Error(err) -> {
                  io.println(
                    "❌ Raw SQL task creation failed: " <> string.inspect(err),
                  )
                  io.println("   Error details: " <> string.inspect(err))
                  panic as "Raw SQL task creation test failed"
                }
              }
            }
            _ -> panic as "Unexpected raw SQL project result format"
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
    Error(_) -> panic as "Failed to connect to database"
  }
}

// Test foreign key constraints
pub fn foreign_key_constraint_test() {
  case db.connect() {
    Ok(conn) -> {
      // Try to create task with non-existent project ID
      let fake_project_id = 99_999

      case
        db.add_task(
          conn,
          fake_project_id,
          "Invalid Project Task",
          "This should fail due to foreign key constraint",
          None,
          "pending",
          "medium",
          None,
          0.0,
        )
      {
        Ok(_) -> {
          io.println(
            "❌ Task creation with invalid project ID succeeded (unexpected)",
          )
          panic as "Foreign key constraint test failed - should have been rejected"
        }
        Error(err) -> {
          io.println(
            "✅ Task creation with invalid project ID properly rejected",
          )
          io.println("  Error: " <> string.inspect(err))
          Nil
        }
      }
    }
    Error(_) -> panic as "Failed to connect to database"
  }
}

// Test team member constraints
pub fn team_member_constraint_test() {
  case db.connect() {
    Ok(conn) -> {
      // First get available team members
      case db.get_team_members(conn) {
        Ok(team_members) -> {
          io.println(
            "✅ Found "
            <> string.inspect(list.length(team_members))
            <> " team members",
          )

          // Create a project first
          let deadline = calendar.Date(2025, calendar.May, 31)
          case
            db.add_project(
              conn,
              "Team Test Project",
              "For testing team assignment",
              deadline,
              "active",
              "teal",
            )
          {
            Ok([project]) -> {
              // Test with valid team member (if any exist)
              case team_members {
                [first_member, ..] -> {
                  io.println(
                    "  Testing assignment to team member ID: "
                    <> string.inspect(first_member.id),
                  )

                  case
                    db.add_task(
                      conn,
                      project.id,
                      "Assigned Task",
                      "Testing team member assignment",
                      Some(first_member.id),
                      // Valid team member ID
                      "pending",
                      "medium",
                      None,
                      0.0,
                    )
                  {
                    Ok([task]) -> {
                      io.println(
                        "✅ Task assignment to valid team member successful",
                      )
                      io.println(
                        "  Assigned to: " <> string.inspect(task.assigned_to),
                      )
                    }
                    Ok(_) -> panic as "Unexpected task creation result format"
                    Error(err) -> {
                      io.println(
                        "❌ Task assignment to valid team member failed: "
                        <> string.inspect(err),
                      )
                      panic as "Valid team member assignment test failed"
                    }
                  }
                }
                [] -> {
                  io.println(
                    "  No team members found, skipping assignment test",
                  )
                  Nil
                }
              }
            }
            Ok(_) -> panic as "Unexpected project creation result format"
            Error(err) -> {
              io.println(
                "❌ Team test project creation failed: " <> string.inspect(err),
              )
              panic as "Team test project creation failed"
            }
          }
        }
        Error(err) -> {
          io.println("❌ Failed to get team members: " <> string.inspect(err))
          panic as "Failed to get team members"
        }
      }
    }
    Error(_) -> panic as "Failed to connect to database"
  }
}

// Comprehensive test that mimics the exact API call that's failing
pub fn api_failure_reproduction_test() {
  case db.connect() {
    Ok(conn) -> {
      io.println("🔍 Reproducing the exact API failure scenario...")

      // Use project ID 81 (from our earlier tests)
      let test_project_id = 81
      let test_title = "Test Task"
      let test_description = "Test description"
      let test_status = "pending"
      let test_priority = "medium"
      let test_assigned_to = None
      // NULL
      let test_due_date = None
      // NULL
      let test_hours_logged = 0.0
      // Default

      io.println("  Project ID: " <> string.inspect(test_project_id))
      io.println("  Title: " <> test_title)
      io.println("  Description: " <> test_description)
      io.println("  Status: " <> test_status)
      io.println("  Priority: " <> test_priority)
      io.println("  Assigned to: " <> string.inspect(test_assigned_to))
      io.println("  Due date: " <> string.inspect(test_due_date))
      io.println("  Hours logged: " <> string.inspect(test_hours_logged))

      case
        db.add_task(
          conn,
          test_project_id,
          test_title,
          test_description,
          test_assigned_to,
          test_status,
          test_priority,
          test_due_date,
          test_hours_logged,
        )
      {
        Ok([task]) -> {
          io.println(
            "✅ API failure reproduction test PASSED - task created successfully!",
          )
          io.println("  This means the API issue might be elsewhere...")
          io.println("  Created task ID: " <> string.inspect(task.id))
        }
        Ok(_) -> panic as "Unexpected task creation result format"
        Error(err) -> {
          io.println("❌ API failure reproduction test confirmed the error!")
          io.println("  This is likely the same error the API encounters")
          io.println("  Error details: " <> string.inspect(err))
          // Don't panic here - we want to see what the error actually is
          Nil
        }
      }
    }
    Error(_) -> panic as "Failed to connect to database"
  }
}
