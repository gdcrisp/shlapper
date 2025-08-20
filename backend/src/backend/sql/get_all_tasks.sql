-- Get all tasks without filtering
SELECT t.id, t.project_id, t.title, t.description, t.assigned_to, 
       t.status, t.priority, t.due_date, t.hours_logged,
       p.name as project_name,
       tm.name as assigned_name
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN team_members tm ON t.assigned_to = tm.id
ORDER BY t.created_at DESC;