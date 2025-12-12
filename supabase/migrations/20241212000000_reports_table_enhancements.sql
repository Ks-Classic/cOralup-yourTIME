-- ============================================================================
-- reports テーブル拡張（visit_id, uuid, AI分析カラム追加）
-- ============================================================================

-- 1. uuid カラム追加（レポートURL用）
ALTER TABLE reports 
  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() UNIQUE;

-- 2. visit_id カラム追加（visitsテーブルとの紐付け）
ALTER TABLE reports 
  ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES visits(id) ON DELETE SET NULL;

-- 3. AI分析結果カラム追加
ALTER TABLE reports 
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;

ALTER TABLE reports 
  ADD COLUMN IF NOT EXISTS age_consideration TEXT;

ALTER TABLE reports 
  ADD COLUMN IF NOT EXISTS posture_analysis JSONB;

ALTER TABLE reports 
  ADD COLUMN IF NOT EXISTS oral_analysis JSONB;

-- 4. 診断IDカラム追加（diagnosesテーブルとの紐付け）
ALTER TABLE reports 
  ADD COLUMN IF NOT EXISTS diagnosis_id UUID;

-- 5. インデックス追加
CREATE INDEX IF NOT EXISTS idx_reports_uuid ON reports(uuid);
CREATE INDEX IF NOT EXISTS idx_reports_visit_id ON reports(visit_id);

-- 6. コメント追加
COMMENT ON COLUMN reports.uuid IS 'レポートURL用UUID';
COMMENT ON COLUMN reports.visit_id IS '来場セッションID（visitsテーブル参照）';
COMMENT ON COLUMN reports.ai_summary IS 'AI分析サマリー';
COMMENT ON COLUMN reports.age_consideration IS '月齢考慮コメント';
COMMENT ON COLUMN reports.posture_analysis IS '姿勢分析結果（JSONB）';
COMMENT ON COLUMN reports.oral_analysis IS '口腔分析結果（JSONB）';
COMMENT ON COLUMN reports.diagnosis_id IS '診断ID';

-- ============================================================================
-- line_message_logs テーブル作成（LINE送信ログ）
-- ============================================================================

CREATE TABLE IF NOT EXISTS line_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  session_id VARCHAR(10),
  line_user_id VARCHAR(255) NOT NULL,
  message_type VARCHAR(50) NOT NULL,
  message_content JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  response JSONB,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_line_message_logs_visit_id ON line_message_logs(visit_id);
CREATE INDEX IF NOT EXISTS idx_line_message_logs_line_user_id ON line_message_logs(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_message_logs_status ON line_message_logs(status);

-- RLS有効化
ALTER TABLE line_message_logs ENABLE ROW LEVEL SECURITY;

-- service_roleのみアクセス可能
CREATE POLICY "Service role access for line_message_logs" ON line_message_logs
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE line_message_logs IS 'LINE送信ログテーブル';

-- ============================================================================
-- visits テーブルに report_sent_at カラム追加
-- ============================================================================

ALTER TABLE visits 
  ADD COLUMN IF NOT EXISTS report_sent_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN visits.report_sent_at IS 'レポートLINE送信日時';

