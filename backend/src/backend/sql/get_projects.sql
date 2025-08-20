-- Get all projects with optional filtering
SELECT id, name, description, deadline, status, color,
       to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM projects
ORDER BY created_at DESC;