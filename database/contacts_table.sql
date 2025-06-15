-- Contacts Table Creation
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    system_info TEXT NOT NULL,
    contact_info TEXT NOT NULL,
    contact_type VARCHAR(10) NOT NULL CHECK (contact_type IN ('defect', 'mail')),
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_name);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by);

-- Insert some sample data (optional)
INSERT INTO contacts (user_name, system_info, contact_info, contact_type, created_by) VALUES 
('Ahmet Yılmaz', 'Windows Server 2019 - DB Issues', 'ahmet.yilmaz@company.com', 'mail', '12345'),
('Mehmet Kaya', 'Linux Server - Network Problem', 'DEF-2024-001', 'defect', '67890'),
('Ayşe Demir', 'Oracle Database Connection', 'ayse.demir@company.com', 'mail', '11111')
ON CONFLICT DO NOTHING; 