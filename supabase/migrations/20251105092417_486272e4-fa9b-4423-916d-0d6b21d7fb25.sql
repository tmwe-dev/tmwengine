-- Tabella temporanea per indice leggero delle email prima dell'import
CREATE TABLE email_temp_index (
  uid text NOT NULL,
  folder text NOT NULL,
  user_email text NOT NULL,
  subject text,
  from_email text NOT NULL,
  from_name text,
  date timestamptz NOT NULL,
  size integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'imported')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (uid, folder, user_email)
);

-- RLS Policies
ALTER TABLE email_temp_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own temp index"
ON email_temp_index FOR SELECT
USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can insert own temp index"
ON email_temp_index FOR INSERT
WITH CHECK (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can update own temp index"
ON email_temp_index FOR UPDATE
USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can delete own temp index"
ON email_temp_index FOR DELETE
USING (user_email = auth.jwt() ->> 'email');

-- Index per performance
CREATE INDEX idx_email_temp_index_user_folder ON email_temp_index(user_email, folder);
CREATE INDEX idx_email_temp_index_status ON email_temp_index(status) WHERE status IN ('pending', 'selected');