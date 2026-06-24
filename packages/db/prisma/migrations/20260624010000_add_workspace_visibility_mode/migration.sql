-- Migration: 20260624010000_add_workspace_visibility_mode
-- Additive only. No existing columns dropped or renamed.
-- All existing users receive workspaceVisibilityMode = 'SELECTED' via DEFAULT clause.
-- ALL mode is a Super Admin-only executive visibility grant.

-- Create the enum type
CREATE TYPE "WorkspaceVisibilityMode" AS ENUM ('SELECTED', 'ALL');

-- Add workspaceVisibilityMode with DEFAULT so all existing rows stay SELECTED
ALTER TABLE "users" ADD COLUMN "workspaceVisibilityMode" "WorkspaceVisibilityMode" NOT NULL DEFAULT 'SELECTED';
