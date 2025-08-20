-- Update an existing task in the tasks table with proper NULL handling
UPDATE tasks 
SET project_id = $2,
    title = $3, 
    description = $4,
    assigned_to = NULLIF($5, 0),
    status = $6,
    priority = $7,
    due_date = NULLIF($8, '1900-01-01'::DATE),
    hours_logged = $9,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING id, project_id, title, description, assigned_to, status, priority,
         due_date, hours_logged;