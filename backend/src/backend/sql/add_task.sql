-- Insert a new task into the tasks table
INSERT INTO tasks (project_id, title, description, assigned_to, status, priority, due_date, hours_logged)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, project_id, title, description, assigned_to, status, priority,
         due_date, hours_logged;