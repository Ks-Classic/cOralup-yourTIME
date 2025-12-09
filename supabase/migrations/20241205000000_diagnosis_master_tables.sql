-- ============================================================================
-- 診断項目マスタ・設定・回答テーブル
-- ============================================================================
-- 作成日: 2024-12-05
-- 説明: 診断項目のマスタ管理、イベント/医院別設定、回答データを管理
-- 参照: docs/designe/26-診断項目DB設計書.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 診断カテゴリマスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diagnosis_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE diagnosis_categories IS '診断カテゴリマスタ（口腔機能、習癖等）';

-- ----------------------------------------------------------------------------
-- 2. 診断項目マスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diagnosis_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES diagnosis_categories(id) ON DELETE RESTRICT,
  question VARCHAR(500) NOT NULL,
  answer_type VARCHAR(20) NOT NULL CHECK (answer_type IN ('radio', 'checkbox', 'text', 'number', 'textarea')),
  options JSONB, -- [{value: string, label: string}]
  is_required BOOLEAN NOT NULL DEFAULT false,
  input_type VARCHAR(10) NOT NULL DEFAULT 'staff' CHECK (input_type IN ('staff', 'parent')),
  note TEXT,
  placeholder VARCHAR(200),
  unit VARCHAR(20),
  min_value INTEGER,
  max_value INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE diagnosis_items IS '診断項目マスタ（舌小帯短縮症、指しゃぶり等）';

-- ----------------------------------------------------------------------------
-- 3. イベント別診断項目設定
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_diagnosis_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES diagnosis_items(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER, -- NULLならマスタの順序を使用
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, item_id)
);

COMMENT ON TABLE event_diagnosis_settings IS 'イベントごとの診断項目使用設定';

-- ----------------------------------------------------------------------------
-- 4. 医院別診断項目設定
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization_diagnosis_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL, -- 将来的にorganizationsテーブルへのFK
  item_id UUID NOT NULL REFERENCES diagnosis_items(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, item_id)
);

COMMENT ON TABLE organization_diagnosis_settings IS '医院ごとの診断項目デフォルト設定';

-- ----------------------------------------------------------------------------
-- 5. 診断回答データ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diagnosis_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID, -- 将来的にvisitsテーブルへのFK（現状はsession_idで代替）
  session_id VARCHAR(10) REFERENCES sessions(session_id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES diagnosis_items(id) ON DELETE RESTRICT,
  value TEXT NOT NULL,
  metadata JSONB, -- 写真URL、追加情報等
  answered_by UUID, -- 将来的にprofilesへのFK
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, item_id) -- 1セッション1項目1回答
);

COMMENT ON TABLE diagnosis_responses IS '診断回答データ（正規化された回答）';

-- ----------------------------------------------------------------------------
-- インデックス
-- ----------------------------------------------------------------------------

-- diagnosis_categories
CREATE INDEX IF NOT EXISTS idx_diagnosis_categories_order 
  ON diagnosis_categories(display_order) WHERE is_active = true;

-- diagnosis_items
CREATE INDEX IF NOT EXISTS idx_diagnosis_items_category 
  ON diagnosis_items(category_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_items_active_order 
  ON diagnosis_items(category_id, display_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_diagnosis_items_input_type 
  ON diagnosis_items(input_type) WHERE is_active = true;

-- event_diagnosis_settings
CREATE INDEX IF NOT EXISTS idx_event_diagnosis_settings_event 
  ON event_diagnosis_settings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_diagnosis_settings_enabled 
  ON event_diagnosis_settings(event_id, is_enabled) WHERE is_enabled = true;

-- organization_diagnosis_settings
CREATE INDEX IF NOT EXISTS idx_org_diagnosis_settings_org 
  ON organization_diagnosis_settings(organization_id);

-- diagnosis_responses
CREATE INDEX IF NOT EXISTS idx_diagnosis_responses_session 
  ON diagnosis_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_responses_item 
  ON diagnosis_responses(item_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_responses_answered_at 
  ON diagnosis_responses(answered_at);

-- ----------------------------------------------------------------------------
-- 更新日時トリガー
-- ----------------------------------------------------------------------------
CREATE TRIGGER update_diagnosis_categories_updated_at
  BEFORE UPDATE ON diagnosis_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diagnosis_items_updated_at
  BEFORE UPDATE ON diagnosis_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_diagnosis_settings_updated_at
  BEFORE UPDATE ON event_diagnosis_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_diagnosis_settings_updated_at
  BEFORE UPDATE ON organization_diagnosis_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- ビュー: イベント用診断項目一覧
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW event_diagnosis_items_view AS
SELECT 
  e.id as event_id,
  e.name as event_name,
  dc.id as category_id,
  dc.name as category_name,
  dc.display_order as category_order,
  di.id as item_id,
  di.question,
  di.answer_type,
  di.options,
  di.is_required,
  di.input_type,
  di.note,
  di.placeholder,
  di.unit,
  COALESCE(eds.display_order, di.display_order) as item_order,
  COALESCE(eds.is_enabled, true) as is_enabled
FROM events e
CROSS JOIN diagnosis_items di
JOIN diagnosis_categories dc ON di.category_id = dc.id
LEFT JOIN event_diagnosis_settings eds 
  ON eds.event_id = e.id AND eds.item_id = di.id
WHERE di.is_active = true
  AND dc.is_active = true;

COMMENT ON VIEW event_diagnosis_items_view IS 'イベントごとの診断項目一覧（設定反映済み）';

-- ----------------------------------------------------------------------------
-- ビュー: 診断結果詳細
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW diagnosis_results_view AS
SELECT 
  dr.session_id,
  s.parent_name,
  dc.name as category_name,
  dc.display_order as category_order,
  di.question,
  di.answer_type,
  dr.value,
  dr.metadata,
  dr.answered_at,
  di.display_order as item_order
FROM diagnosis_responses dr
JOIN sessions s ON dr.session_id = s.session_id
JOIN diagnosis_items di ON dr.item_id = di.id
JOIN diagnosis_categories dc ON di.category_id = dc.id
ORDER BY dr.session_id, dc.display_order, di.display_order;

COMMENT ON VIEW diagnosis_results_view IS '診断結果詳細ビュー（セッション×項目）';




