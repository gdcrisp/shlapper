-- Insert a new task into the tasks table with proper NULL handling
INSERT INTO tasks (project_id, title, description, assigned_to, status, priority, due_date, hours_logged)
VALUES ($1, $2, $3, NULLIF($4, 0), $5, $6, NULLIF($7, '1900-01-01'::DATE), $8)
RETURNING id, project_id, title, description, assigned_to, status, priority,
         due_date, hours_logged;