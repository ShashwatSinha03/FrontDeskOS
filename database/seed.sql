-- seed.sql
-- Seed data for auth and profiles.
-- Run AFTER schema.sql and all migrations.

-- Ensure founder has SUPER_ADMIN profile
INSERT INTO profiles (id, email, full_name, global_role)
VALUES ('00000000-0000-0000-0000-000000000001', 'shashwat@frontdeskos.com', 'Shashwat', 'SUPER_ADMIN')
ON CONFLICT (id) DO UPDATE SET global_role = 'SUPER_ADMIN';

-- Ensure demo tenant owner has USER profile
INSERT INTO profiles (id, email, full_name, global_role)
VALUES ('00000000-0000-0000-0000-000000000002', 'dr.smith@brightsmiledental.com', 'Dr. James Smith', 'USER')
ON CONFLICT (id) DO UPDATE SET global_role = 'USER';
