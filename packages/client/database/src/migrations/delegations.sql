-- Added after initial database.sql deployments; safe to re-run.
CREATE TABLE IF NOT EXISTS delegations (
  account_id INTEGER PRIMARY KEY REFERENCES effectstream.accounts(id) ON DELETE CASCADE,
  delegate_to_address TEXT NOT NULL,
  delegated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delegations_delegate_to_address
  ON delegations(delegate_to_address);
