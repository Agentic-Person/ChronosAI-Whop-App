-- Fix infinite recursion in creators RLS policy
-- Date: 2025-10-31
-- Issue: creators_view_own_plan policy has recursive SELECT causing infinite loop

-- Drop the problematic policy
DROP POLICY IF EXISTS creators_view_own_plan ON creators;

-- Recreate policy without recursion
-- Users can view their own creator record based on whop_user_id matching auth.uid()
CREATE POLICY creators_view_own_plan ON creators
  FOR SELECT
  USING (whop_user_id = auth.uid()::text);

-- Note: Changed from recursive subquery to direct whop_user_id comparison
-- This avoids the infinite recursion while maintaining security
