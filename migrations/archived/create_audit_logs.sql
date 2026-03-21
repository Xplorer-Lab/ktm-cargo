-- ==============================================================================
-- CREATE AUDIT LOGS TABLE
-- Stores system audit trail for important actions
-- ==============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Action details
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  
  -- User who performed the action
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  user_role TEXT,
  
  -- Additional data
  old_data JSONB,
  new_data JSONB,
  metadata JSONB,
  
  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_date ON audit_logs(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.staff_role = 'managing_director')
    )
  );

-- System can insert audit logs (using service role)
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Done
DO $$ BEGIN RAISE NOTICE 'Audit logs table created successfully'; END $$;
