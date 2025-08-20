-- Get dashboard data with recent projects and tasks in a single query
WITH recent_projects AS (
    SELECT id, name, description, deadline, status,
           to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
    FROM projects
    ORDER BY created_at DESC
    LIMIT 5
),
recent_tasks AS (
    SELECT t.id, t.project_id, t.title, t.description, t.assigned_to, 
           t.status, t.priority, t.due_date, t.hours_logged,
           p.name as project_name,
           tm.name as assigned_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN team_members tm ON t.assigned_to = tm.id
    ORDER BY t.created_at DESC
    LIMIT 5
)
SELECT 
    -- Dashboard stats
    (SELECT COUNT(*) FROM projects) as total_projects,
    (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
    (SELECT COUNT(*) FROM tasks WHERE status = 'completed') as completed_tasks,
    (SELECT COUNT(*) FROM tasks WHERE status != 'completed') as pending_tasks,
    (SELECT COUNT(*) FROM team_members) as team_members,
    (SELECT COALESCE(SUM(hours_logged), 0) FROM tasks) as total_hours,
    -- Recent projects (as JSON array)
    (SELECT COALESCE(json_agg(
        json_build_object(
            'id', id,
            'name', name,
            'description', COALESCE(description, ''),
            'deadline', COALESCE(to_char(deadline, 'YYYY-MM-DD'), ''),
            'status', COALESCE(status, 'active'),
            'created_at', created_at
        )
    ), '[]'::json) FROM recent_projects) as recent_projects,
    -- Recent tasks (as JSON array)
    (SELECT COALESCE(json_agg(
        json_build_object(
            'id', id,
            'project_id', project_id,
            'title', title,
            'description', COALESCE(description, ''),
            'assigned_to', assigned_to,
            'status', COALESCE(status, 'pending'),
            'priority', COALESCE(priority, 'medium'),
            'due_date', CASE WHEN due_date IS NOT NULL THEN to_char(due_date, 'YYYY-MM-DD') ELSE NULL END,
            'hours_logged', COALESCE(hours_logged, 0.0)
        )
    ), '[]'::json) FROM recent_tasks) as recent_tasks;