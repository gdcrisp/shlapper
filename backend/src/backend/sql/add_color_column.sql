-- Migration: Add color column to projects table
ALTER TABLE projects 
ADD COLUMN color VARCHAR(20) DEFAULT 'blue' CHECK (color IN ('red', 'pink', 'purple', 'deep-purple', 'indigo', 'blue', 'light-blue', 'cyan', 'teal', 'green', 'light-green', 'lime', 'yellow', 'amber', 'orange', 'deep-orange'));