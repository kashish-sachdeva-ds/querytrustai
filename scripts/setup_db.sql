-- QueryTrust AI: Database and Role Setup
-- This script creates the database and two roles required by the application.

-- Create the database
DROP DATABASE IF EXISTS querytrust;
CREATE DATABASE querytrust;

-- Set known password for postgres user
ALTER USER postgres WITH PASSWORD 'postgres_dev_2026';

-- Create application user (full CRUD on all app tables)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
    CREATE USER app_user WITH PASSWORD 'querytrust_app_dev';
  ELSE
    ALTER USER app_user WITH PASSWORD 'querytrust_app_dev';
  END IF;
END $$;

-- Create read-only analytics user (SELECT-only on business tables)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'analytics_reader') THEN
    CREATE USER analytics_reader WITH PASSWORD 'querytrust_reader_dev';
  ELSE
    ALTER USER analytics_reader WITH PASSWORD 'querytrust_reader_dev';
  END IF;
END $$;

-- Grant database-level privileges
GRANT ALL PRIVILEGES ON DATABASE querytrust TO app_user;
GRANT CONNECT ON DATABASE querytrust TO analytics_reader;

-- Connect to querytrust database to configure schema privileges
\c querytrust

GRANT ALL ON SCHEMA public TO app_user;
ALTER SCHEMA public OWNER TO app_user;

GRANT USAGE ON SCHEMA public TO analytics_reader;

-- Enforce least privilege: revoke blanket SELECT on all tables (ARCH-02)
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM analytics_reader;
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM analytics_reader;

-- Grant strictly on approved analytics business tables:
GRANT SELECT ON TABLE devices, sites, service_events, telemetry_readings TO analytics_reader;

