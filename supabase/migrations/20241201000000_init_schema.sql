-- ============================================================================
-- cOralup 初期スキーママイグレーション
-- ============================================================================
-- 作成日: 2024-12-01
-- 説明: システムの基本テーブル構造を定義
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. セッション管理テーブル
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(10) UNIQUE NOT NULL,
  line_user_id VARCHAR(255),
  parent_name VARCHAR(100),
  parent_phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. 問診票テーブル
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(10) REFERENCES sessions(session_id) ON DELETE CASCADE,
  child_name VARCHAR(100) NOT NULL,
  child_age INTEGER NOT NULL,
  child_gender VARCHAR(10) NOT NULL,
  parent_name VARCHAR(100) NOT NULL,
  parent_phone VARCHAR(20) NOT NULL,
  medical_history TEXT[] DEFAULT '{}',
  concerns TEXT[] DEFAULT '{}',
  ideal_goals TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. 診断結果テーブル
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(10) REFERENCES sessions(session_id) ON DELETE CASCADE,
  posture_analysis JSONB,
  oral_analysis JSONB,
  diagnosis_items JSONB,
  ai_analysis TEXT,
  staff_notes TEXT,
  photos JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. レポートテーブル
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(10) REFERENCES sessions(session_id) ON DELETE CASCADE,
  pdf_url TEXT,
  line_sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. イベント管理テーブル（動的フォーム用）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  venue VARCHAR(200),
  status VARCHAR(20) DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. フォームスキーマテーブル（動的フォーム用）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id VARCHAR(50) UNIQUE NOT NULL,
  event_id UUID REFERENCES events(id),
  form_type VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  version VARCHAR(20) NOT NULL DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  config JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. フォーム回答データテーブル（動的フォーム用）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id VARCHAR(100) UNIQUE NOT NULL,
  schema_id UUID REFERENCES form_schemas(id),
  session_id VARCHAR(10) REFERENCES sessions(session_id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  event_id UUID REFERENCES events(id),
  response_data JSONB NOT NULL,
  metadata JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. フォーム項目定義テーブル（動的フォーム用）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id UUID REFERENCES form_schemas(id) ON DELETE CASCADE,
  field_id VARCHAR(50) NOT NULL,
  field_name VARCHAR(200) NOT NULL,
  field_type VARCHAR(50) NOT NULL,
  field_config JSONB,
  display_order INTEGER,
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schema_id, field_id)
);

-- ----------------------------------------------------------------------------
-- 9. フォームスキーマバージョン履歴テーブル（動的フォーム用）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_schema_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id UUID REFERENCES form_schemas(id) ON DELETE CASCADE,
  version VARCHAR(20) NOT NULL,
  config JSONB NOT NULL,
  change_log TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schema_id, version)
);

-- ----------------------------------------------------------------------------
-- 10. フォームキャッシュテーブル（パフォーマンス向上用）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(500) UNIQUE NOT NULL,
  cache_data JSONB,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- インデックス作成
-- ----------------------------------------------------------------------------

-- sessions テーブル
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_line_user_id ON sessions(line_user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- questionnaires テーブル
CREATE INDEX IF NOT EXISTS idx_questionnaires_session_id ON questionnaires(session_id);

-- diagnoses テーブル
CREATE INDEX IF NOT EXISTS idx_diagnoses_session_id ON diagnoses(session_id);

-- reports テーブル
CREATE INDEX IF NOT EXISTS idx_reports_session_id ON reports(session_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- events テーブル
CREATE INDEX IF NOT EXISTS idx_events_event_id ON events(event_id);
CREATE INDEX IF NOT EXISTS idx_events_status_dates ON events(status, start_date, end_date);

-- form_schemas テーブル
CREATE INDEX IF NOT EXISTS idx_form_schemas_schema_id ON form_schemas(schema_id);
CREATE INDEX IF NOT EXISTS idx_form_schemas_event_type ON form_schemas(event_id, form_type);
CREATE INDEX IF NOT EXISTS idx_form_schemas_active ON form_schemas(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_form_schemas_config ON form_schemas USING GIN(config);

-- form_responses テーブル
CREATE INDEX IF NOT EXISTS idx_form_responses_response_id ON form_responses(response_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_schema_session ON form_responses(schema_id, session_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_event_user ON form_responses(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_submitted_at ON form_responses(submitted_at);
CREATE INDEX IF NOT EXISTS idx_form_responses_data ON form_responses USING GIN(response_data);

-- form_fields テーブル
CREATE INDEX IF NOT EXISTS idx_form_fields_schema_id ON form_fields(schema_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_schema_field ON form_fields(schema_id, field_id);

-- form_schema_versions テーブル
CREATE INDEX IF NOT EXISTS idx_form_schema_versions_schema_id ON form_schema_versions(schema_id);

-- form_cache テーブル
CREATE INDEX IF NOT EXISTS idx_form_cache_key ON form_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_form_cache_expires_at ON form_cache(expires_at) WHERE expires_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 更新日時自動更新トリガー関数
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questionnaires_updated_at
  BEFORE UPDATE ON questionnaires
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diagnoses_updated_at
  BEFORE UPDATE ON diagnoses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_schemas_updated_at
  BEFORE UPDATE ON form_schemas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- ビュー作成（データ統合・分析用）
-- ----------------------------------------------------------------------------

-- ユーザー統合ビュー
CREATE OR REPLACE VIEW user_responses_view AS
SELECT
  fr.id,
  fr.response_id,
  fr.session_id,
  fr.submitted_at,
  s.parent_name,
  s.parent_phone,
  e.name as event_name,
  fs.name as form_name,
  fs.form_type,
  fr.response_data,
  fr.metadata
FROM form_responses fr
LEFT JOIN sessions s ON fr.session_id = s.session_id
LEFT JOIN events e ON fr.event_id = e.id
LEFT JOIN form_schemas fs ON fr.schema_id = fs.id;

-- 診断データ統合ビュー
CREATE OR REPLACE VIEW diagnosis_analytics_view AS
SELECT
  fr.session_id,
  s.parent_name,
  s.parent_phone,
  e.name as event_name,
  fr.submitted_at,
  (fr.response_data->>'posture_score')::integer as posture_score,
  (fr.response_data->>'oral_score')::integer as oral_score,
  (fr.response_data->>'overall_score')::integer as overall_score,
  fr.response_data->>'diagnosis_notes' as notes,
  fr.response_data->>'ai_analysis' as ai_analysis
FROM form_responses fr
LEFT JOIN sessions s ON fr.session_id = s.session_id
LEFT JOIN events e ON fr.event_id = e.id
WHERE fr.response_data->>'form_type' = 'diagnosis';

-- フォーム分析ビュー
CREATE OR REPLACE VIEW form_analytics_view AS
SELECT
  fs.form_type,
  fs.name as form_name,
  e.name as event_name,
  COUNT(fr.id) as total_responses,
  AVG(EXTRACT(EPOCH FROM (fr.submitted_at - fr.created_at))) as avg_completion_time,
  COUNT(DISTINCT fr.user_id) as unique_users,
  DATE(fr.submitted_at) as response_date
FROM form_responses fr
LEFT JOIN form_schemas fs ON fr.schema_id = fs.id
LEFT JOIN events e ON fr.event_id = e.id
GROUP BY fs.form_type, fs.name, e.name, DATE(fr.submitted_at);

-- ----------------------------------------------------------------------------
-- コメント追加
-- ----------------------------------------------------------------------------
COMMENT ON TABLE sessions IS 'セッション管理テーブル';
COMMENT ON TABLE questionnaires IS '問診票データテーブル';
COMMENT ON TABLE diagnoses IS '診断結果データテーブル';
COMMENT ON TABLE reports IS 'レポート管理テーブル';
COMMENT ON TABLE events IS 'イベント管理テーブル';
COMMENT ON TABLE form_schemas IS 'フォームスキーマ定義テーブル';
COMMENT ON TABLE form_responses IS 'フォーム回答データテーブル';
COMMENT ON TABLE form_fields IS 'フォーム項目定義テーブル';
COMMENT ON TABLE form_schema_versions IS 'フォームスキーマバージョン履歴テーブル';
COMMENT ON TABLE form_cache IS 'フォームキャッシュテーブル';

