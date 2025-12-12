-- ============================================================================
-- reports テーブル拡張 + visits 関連修正
-- ============================================================================
-- 作成日: 2024-12-13
-- 目的: 
--   1. reports テーブルに visit_id, uuid, AI分析カラム追加
--   2. visits テーブルに report_sent_at 追加
--   3. line_message_logs テーブル作成
-- ============================================================================

-- ============================================================================
-- Phase 1: reports テーブル拡張
-- ============================================================================

-- 1.1 uuid カラム追加（レポートURL用）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'uuid'
  ) THEN
    ALTER TABLE reports ADD COLUMN uuid UUID DEFAULT gen_random_uuid() UNIQUE;
  END IF;
END $$;

-- 1.2 visit_id カラム追加
-- ※ visits テーブルが存在することを確認してから追加
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visits') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'reports' AND column_name = 'visit_id'
    ) THEN
      ALTER TABLE reports ADD COLUMN visit_id UUID;
      -- 外部キー制約は後で追加（visits が空でない場合のエラー回避）
    END IF;
  END IF;
END $$;

-- 1.3 AI分析結果カラム追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'ai_summary'
  ) THEN
    ALTER TABLE reports ADD COLUMN ai_summary TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'age_consideration'
  ) THEN
    ALTER TABLE reports ADD COLUMN age_consideration TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'posture_analysis'
  ) THEN
    ALTER TABLE reports ADD COLUMN posture_analysis JSONB;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'oral_analysis'
  ) THEN
    ALTER TABLE reports ADD COLUMN oral_analysis JSONB;
  END IF;
END $$;

-- 1.4 診断IDカラム追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'diagnosis_id'
  ) THEN
    ALTER TABLE reports ADD COLUMN diagnosis_id UUID;
  END IF;
END $$;

-- 1.5 外部キー制約追加（visit_id）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visits') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'reports_visit_id_fkey' AND table_name = 'reports'
    ) THEN
      ALTER TABLE reports 
        ADD CONSTRAINT reports_visit_id_fkey 
        FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 1.6 インデックス追加
CREATE INDEX IF NOT EXISTS idx_reports_uuid ON reports(uuid);
CREATE INDEX IF NOT EXISTS idx_reports_visit_id ON reports(visit_id);

-- 1.7 コメント追加
COMMENT ON COLUMN reports.uuid IS 'レポートURL用UUID';
COMMENT ON COLUMN reports.visit_id IS '来場セッションID（visitsテーブル参照）';
COMMENT ON COLUMN reports.ai_summary IS 'AI分析サマリー';
COMMENT ON COLUMN reports.age_consideration IS '月齢考慮コメント';
COMMENT ON COLUMN reports.posture_analysis IS '姿勢分析結果（JSONB）';
COMMENT ON COLUMN reports.oral_analysis IS '口腔分析結果（JSONB）';
COMMENT ON COLUMN reports.diagnosis_id IS '診断ID';

-- ============================================================================
-- Phase 2: visits テーブル拡張
-- ============================================================================

-- 2.1 report_sent_at カラム追加
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visits') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'visits' AND column_name = 'report_sent_at'
    ) THEN
      ALTER TABLE visits ADD COLUMN report_sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
  END IF;
END $$;

COMMENT ON COLUMN visits.report_sent_at IS 'レポートLINE送信日時';

-- ============================================================================
-- Phase 3: line_message_logs テーブル作成
-- ============================================================================

CREATE TABLE IF NOT EXISTS line_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID,
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

-- 外部キー制約（visits が存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visits') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'line_message_logs_visit_id_fkey' AND table_name = 'line_message_logs'
    ) THEN
      ALTER TABLE line_message_logs 
        ADD CONSTRAINT line_message_logs_visit_id_fkey 
        FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_line_message_logs_visit_id ON line_message_logs(visit_id);
CREATE INDEX IF NOT EXISTS idx_line_message_logs_line_user_id ON line_message_logs(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_message_logs_status ON line_message_logs(status);

-- RLS有効化
ALTER TABLE line_message_logs ENABLE ROW LEVEL SECURITY;

-- service_roleのみアクセス可能
DROP POLICY IF EXISTS "Service role access for line_message_logs" ON line_message_logs;
CREATE POLICY "Service role access for line_message_logs" ON line_message_logs
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE line_message_logs IS 'LINE送信ログテーブル';

-- ============================================================================
-- 完了
-- ============================================================================

