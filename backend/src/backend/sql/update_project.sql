-- Update an existing project in the projects table
UPDATE projects 
SET name = $2,
    description = $3,
    deadline = $4,
    status = $5,
    color = $6,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING id, name, description, deadline, status, color,
         to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
         to_char(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at;