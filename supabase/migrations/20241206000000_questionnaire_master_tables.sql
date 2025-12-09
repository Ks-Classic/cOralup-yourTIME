-- ============================================================================
-- 問診項目マスタ・設定・回答テーブル
-- ============================================================================
-- 作成日: 2024-12-06
-- 説明: 問診項目のマスタ管理、回答データを管理
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 問診カテゴリマスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questionnaire_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  target_age VARCHAR(20) NOT NULL DEFAULT 'all', -- 'preschool', 'elementary', 'all'
  display_order INTEGER NOT NULL DEFAULT 0,
  owner VARCHAR(50) NOT NULL DEFAULT 'system', -- 'system' or organization_id
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE questionnaire_categories IS '問診カテゴリマスタ（基本情報、睡眠、食事等）';

-- ----------------------------------------------------------------------------
-- 2. 問診項目マスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questionnaire_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES questionnaire_categories(id) ON DELETE RESTRICT,
  question VARCHAR(500) NOT NULL,
  answer_type VARCHAR(20) NOT NULL CHECK (answer_type IN ('radio', 'checkbox', 'text', 'number', 'textarea', 'select')),
  options JSONB, -- [{value: string, label: string}]
  is_required BOOLEAN NOT NULL DEFAULT false,
  placeholder VARCHAR(200),
  helper_text VARCHAR(500),
  validation JSONB, -- {min, max, minLength, maxLength}
  display_order INTEGER NOT NULL DEFAULT 0,
  owner VARCHAR(50) NOT NULL DEFAULT 'system',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE questionnaire_items IS '問診項目マスタ（お名前、睡眠の様子等）';

-- ----------------------------------------------------------------------------
-- 3. 問診回答データ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(10) REFERENCES sessions(session_id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES questionnaire_items(id) ON DELETE RESTRICT,
  value TEXT NOT NULL,
  metadata JSONB,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, item_id)
);

COMMENT ON TABLE questionnaire_responses IS '問診回答データ（正規化された回答）';

-- ----------------------------------------------------------------------------
-- 4. イベント別フォーム設定（問診・診断共通）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_form_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('diagnosis', 'questionnaire')),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, item_id, item_type)
);

COMMENT ON TABLE event_form_settings IS 'イベントごとのフォーム項目使用設定';

-- ----------------------------------------------------------------------------
-- インデックス
-- ----------------------------------------------------------------------------

-- questionnaire_categories
CREATE INDEX IF NOT EXISTS idx_questionnaire_categories_order 
  ON questionnaire_categories(display_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_questionnaire_categories_target 
  ON questionnaire_categories(target_age) WHERE is_active = true;

-- questionnaire_items
CREATE INDEX IF NOT EXISTS idx_questionnaire_items_category 
  ON questionnaire_items(category_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_items_active_order 
  ON questionnaire_items(category_id, display_order) WHERE is_active = true;

-- questionnaire_responses
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_session 
  ON questionnaire_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_item 
  ON questionnaire_responses(item_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_answered_at 
  ON questionnaire_responses(answered_at);

-- event_form_settings
CREATE INDEX IF NOT EXISTS idx_event_form_settings_event 
  ON event_form_settings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_form_settings_type 
  ON event_form_settings(event_id, item_type) WHERE is_enabled = true;

-- ----------------------------------------------------------------------------
-- 更新日時トリガー
-- ----------------------------------------------------------------------------
CREATE TRIGGER update_questionnaire_categories_updated_at
  BEFORE UPDATE ON questionnaire_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questionnaire_items_updated_at
  BEFORE UPDATE ON questionnaire_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_form_settings_updated_at
  BEFORE UPDATE ON event_form_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- ビュー: イベント用問診項目一覧
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW event_questionnaire_items_view AS
SELECT 
  e.id as event_id,
  e.name as event_name,
  qc.id as category_id,
  qc.name as category_name,
  qc.target_age,
  qc.display_order as category_order,
  qi.id as item_id,
  qi.question,
  qi.answer_type,
  qi.options,
  qi.is_required,
  qi.placeholder,
  qi.helper_text,
  qi.validation,
  COALESCE(efs.display_order, qi.display_order) as item_order,
  COALESCE(efs.is_enabled, true) as is_enabled
FROM events e
CROSS JOIN questionnaire_items qi
JOIN questionnaire_categories qc ON qi.category_id = qc.id
LEFT JOIN event_form_settings efs 
  ON efs.event_id = e.id 
  AND efs.item_id = qi.id 
  AND efs.item_type = 'questionnaire'
WHERE qi.is_active = true
  AND qc.is_active = true;

COMMENT ON VIEW event_questionnaire_items_view IS 'イベントごとの問診項目一覧（設定反映済み）';

-- ----------------------------------------------------------------------------
-- ビュー: 問診結果詳細
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW questionnaire_results_view AS
SELECT 
  qr.session_id,
  s.parent_name,
  qc.name as category_name,
  qc.target_age,
  qc.display_order as category_order,
  qi.question,
  qi.answer_type,
  qr.value,
  qr.metadata,
  qr.answered_at,
  qi.display_order as item_order
FROM questionnaire_responses qr
JOIN sessions s ON qr.session_id = s.session_id
JOIN questionnaire_items qi ON qr.item_id = qi.id
JOIN questionnaire_categories qc ON qi.category_id = qc.id
ORDER BY qr.session_id, qc.display_order, qi.display_order;

COMMENT ON VIEW questionnaire_results_view IS '問診結果詳細ビュー（セッション×項目）';




