-- Add support_test column to contacts table
-- Bu alan sadece contact_type = 'defect' olduğunda doldurulacak

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS support_test TEXT;

-- Mevcut defect kayıtları için örnek değerler
UPDATE contacts 
SET support_test = 'Support Team A' 
WHERE contact_type = 'defect' AND support_test IS NULL;

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_contacts_support_test ON contacts(support_test); 