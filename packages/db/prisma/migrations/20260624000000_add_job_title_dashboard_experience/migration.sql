-- Migration: 20260624000000_add_job_title_dashboard_experience
-- Additive only. No existing columns dropped or renamed.
-- All existing users receive dashboardExperience = 'STANDARD' via the DEFAULT clause.
-- jobTitle is nullable — existing rows are unaffected.

-- Create the enum type
CREATE TYPE "DashboardExperience" AS ENUM ('STANDARD', 'EXECUTIVE');

-- Add nullable jobTitle column (safe for existing rows — NULL for all existing users)
ALTER TABLE "users" ADD COLUMN "jobTitle" TEXT;

-- Add dashboardExperience with DEFAULT so all existing rows automatically get STANDARD
ALTER TABLE "users" ADD COLUMN "dashboardExperience" "DashboardExperience" NOT NULL DEFAULT 'STANDARD';
