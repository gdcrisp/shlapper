-- Insert a new project into the projects table
INSERT INTO projects (name, description, deadline, status, color)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, name, description, deadline, status, color,
         to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at;