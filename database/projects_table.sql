-- Projects Table Creation
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    project_code VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(project_name);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- Insert some sample projects (optional)
INSERT INTO projects (project_name, description, project_code, created_by) VALUES 
('Ericsson 5G Migration', '5G altyapı geçiş projesi', 'E5G001', 'admin@company.com'),
('Network Optimization', 'Ağ optimizasyon çalışmaları', 'NET001', 'admin@company.com'),
('Core System Upgrade', 'Core sistem güncellemeleri', 'CORE001', 'admin@company.com')
ON CONFLICT (project_name) DO NOTHING; 