-- Get dashboard statistics
SELECT 
  (SELECT COUNT(*) FROM projects) as total_projects,
  (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
  (SELECT COUNT(*) FROM tasks WHERE status = 'completed') as completed_tasks,
  (SELECT COUNT(*) FROM tasks WHERE status != 'completed') as pending_tasks,
  (SELECT COUNT(*) FROM team_members) as team_members,
  (SELECT COALESCE(SUM(hours_logged), 0) FROM tasks) as total_hours;