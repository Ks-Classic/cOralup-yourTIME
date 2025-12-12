-- ============================================================================
-- visits.id (UUID) への統一マイグレーション
-- session_id を廃止し、visit_id に完全統一
-- ============================================================================
-- 作成日: 2024-12-13
-- 目的: ID体系の簡素化と正規化
-- ============================================================================

-- ============================================================================
-- Phase 1: 各テーブルに visit_id カラムを追加（session_id からの移行準備）
-- ============================================================================

-- 1.1 questionnaire_responses に visit_id 追加
ALTER TABLE questionnaire_responses
  ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES visits(id) ON DELETE CASCADE;

-- 1.2 既存データの visit_id を session_id から設定
UPDATE questionnaire_responses qr
SET visit_id = v.id
FROM visits v
WHERE qr.session_id = v.session_id
  AND qr.visit_id IS NULL;

-- 1.3 questionnaires (レガシー) に visit_id 追加
ALTER TABLE questionnaires
  ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES visits(id) ON DELETE CASCADE;

UPDATE questionnaires q
SET visit_id = v.id
FROM visits v
WHERE q.session_id = v.session_id
  AND q.visit_id IS NULL;

-- 1.4 diagnoses (レガシー) に visit_id 追加
ALTER TABLE diagnoses
  ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES visits(id) ON DELETE CASCADE;

UPDATE diagnoses d
SET visit_id = v.id
FROM visits v
WHERE d.session_id = v.session_id
  AND d.visit_id IS NULL;

-- 1.5 diagnosis_responses の visit_id を session_id から設定（既にカラムあり）
UPDATE diagnosis_responses dr
SET visit_id = v.id
FROM visits v
WHERE dr.session_id = v.session_id
  AND dr.visit_id IS NULL;

-- 1.6 form_responses に visit_id 追加
ALTER TABLE form_responses
  ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES visits(id) ON DELETE CASCADE;

UPDATE form_responses fr
SET visit_id = v.id
FROM visits v
WHERE fr.session_id = v.session_id
  AND fr.visit_id IS NULL;

-- ============================================================================
-- Phase 2: インデックス作成
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_visit_id ON questionnaire_responses(visit_id);
CREATE INDEX IF NOT EXISTS idx_questionnaires_visit_id ON questionnaires(visit_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_visit_id ON diagnoses(visit_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_responses_visit_id ON diagnosis_responses(visit_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_visit_id ON form_responses(visit_id);

-- ============================================================================
-- Phase 3: UNIQUE制約を session_id から visit_id に変更
-- ============================================================================

-- questionnaire_responses: (session_id, item_id) → (visit_id, item_id)
ALTER TABLE questionnaire_responses
  DROP CONSTRAINT IF EXISTS questionnaire_responses_session_id_item_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'questionnaire_responses_visit_id_item_id_key'
  ) THEN
    -- visit_id が NULL でないレコードのみに制約を適用
    ALTER TABLE questionnaire_responses
      ADD CONSTRAINT questionnaire_responses_visit_id_item_id_key 
      UNIQUE (visit_id, item_id);
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'UNIQUE constraint creation skipped: %', SQLERRM;
END $$;

-- diagnosis_responses: (session_id, item_id) → (visit_id, item_id)
ALTER TABLE diagnosis_responses
  DROP CONSTRAINT IF EXISTS diagnosis_responses_session_id_item_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'diagnosis_responses_visit_id_item_id_key'
  ) THEN
    ALTER TABLE diagnosis_responses
      ADD CONSTRAINT diagnosis_responses_visit_id_item_id_key 
      UNIQUE (visit_id, item_id);
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'UNIQUE constraint creation skipped: %', SQLERRM;
END $$;

-- ============================================================================
-- Phase 4: session_id 外部キー制約を削除
-- ============================================================================

ALTER TABLE questionnaire_responses
  DROP CONSTRAINT IF EXISTS questionnaire_responses_session_id_fkey;

ALTER TABLE diagnosis_responses
  DROP CONSTRAINT IF EXISTS diagnosis_responses_session_id_fkey;

ALTER TABLE questionnaires
  DROP CONSTRAINT IF EXISTS questionnaires_session_id_fkey;

ALTER TABLE diagnoses
  DROP CONSTRAINT IF EXISTS diagnoses_session_id_fkey;

ALTER TABLE reports
  DROP CONSTRAINT IF EXISTS reports_session_id_fkey;

ALTER TABLE form_responses
  DROP CONSTRAINT IF EXISTS form_responses_session_id_fkey;

-- visit_photos (存在する場合のみ)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visit_photos') THEN
    ALTER TABLE visit_photos DROP CONSTRAINT IF EXISTS visit_photos_session_id_fkey;
  END IF;
END $$;

-- ai_analysis_results (存在する場合のみ)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_analysis_results') THEN
    ALTER TABLE ai_analysis_results DROP CONSTRAINT IF EXISTS ai_analysis_results_session_id_fkey;
  END IF;
END $$;

-- line_message_logs (存在する場合のみ)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'line_message_logs') THEN
    ALTER TABLE line_message_logs DROP CONSTRAINT IF EXISTS line_message_logs_session_id_fkey;
  END IF;
END $$;

-- ============================================================================
-- Phase 5: session_id カラムを削除
-- ============================================================================

-- 5.1 questionnaire_responses
ALTER TABLE questionnaire_responses
  DROP COLUMN IF EXISTS session_id;

-- 5.2 diagnosis_responses
ALTER TABLE diagnosis_responses
  DROP COLUMN IF EXISTS session_id;

-- 5.3 questionnaires (レガシー)
ALTER TABLE questionnaires
  DROP COLUMN IF EXISTS session_id;

-- 5.4 diagnoses (レガシー)
ALTER TABLE diagnoses
  DROP COLUMN IF EXISTS session_id;

-- 5.5 reports
ALTER TABLE reports
  DROP COLUMN IF EXISTS session_id;

-- 5.6 form_responses
ALTER TABLE form_responses
  DROP COLUMN IF EXISTS session_id;

-- 5.7 visit_photos (存在する場合のみ)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visit_photos') THEN
    ALTER TABLE visit_photos DROP COLUMN IF EXISTS session_id;
  END IF;
END $$;

-- 5.8 ai_analysis_results (存在する場合のみ)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_analysis_results') THEN
    ALTER TABLE ai_analysis_results DROP COLUMN IF EXISTS session_id;
  END IF;
END $$;

-- 5.9 line_message_logs (存在する場合のみ)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'line_message_logs') THEN
    ALTER TABLE line_message_logs DROP COLUMN IF EXISTS session_id;
  END IF;
END $$;

-- ============================================================================
-- Phase 6: visits テーブルから冗長カラムを削除
-- ============================================================================

-- 6.1 session_id (UNIQUE制約も削除)
ALTER TABLE visits
  DROP CONSTRAINT IF EXISTS visits_session_id_unique;
ALTER TABLE visits
  DROP CONSTRAINT IF EXISTS visits_session_id_key;
ALTER TABLE visits
  DROP COLUMN IF EXISTS session_id;

-- 6.2 line_user_id (profiles から取得可能)
ALTER TABLE visits
  DROP COLUMN IF EXISTS line_user_id;

-- 6.3 parent_name (profiles から取得可能)
ALTER TABLE visits
  DROP COLUMN IF EXISTS parent_name;

-- 6.4 parent_phone (profiles から取得可能)
ALTER TABLE visits
  DROP COLUMN IF EXISTS parent_phone;

-- ============================================================================
-- Phase 7: reports テーブルから uuid カラムを削除（visit_id でURL）
-- ============================================================================

DROP INDEX IF EXISTS idx_reports_uuid;
ALTER TABLE reports
  DROP COLUMN IF EXISTS uuid;

-- ============================================================================
-- Phase 8: 不要なインデックスを削除
-- ============================================================================

-- インデックス削除（存在する場合のみ自動スキップ）
DROP INDEX IF EXISTS idx_visits_session_id;
DROP INDEX IF EXISTS idx_visits_session;
DROP INDEX IF EXISTS idx_visits_line_user_id;
DROP INDEX IF EXISTS idx_questionnaire_responses_session_id;
DROP INDEX IF EXISTS idx_diagnosis_responses_session_id;
DROP INDEX IF EXISTS idx_reports_session_id;

-- 存在しない可能性があるテーブルのインデックス
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visit_photos') THEN
    DROP INDEX IF EXISTS idx_visit_photos_session_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_analysis_results') THEN
    DROP INDEX IF EXISTS idx_ai_analysis_results_session_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'line_message_logs') THEN
    DROP INDEX IF EXISTS idx_line_message_logs_session_id;
  END IF;
END $$;

-- ============================================================================
-- Phase 9: コメント更新
-- ============================================================================

COMMENT ON TABLE visits IS '来場セッション管理テーブル（中心テーブル）';
COMMENT ON COLUMN visits.id IS '来場セッションID（全テーブルの外部キー参照先）';

COMMENT ON TABLE questionnaire_responses IS '問診回答テーブル（正規化）';
COMMENT ON COLUMN questionnaire_responses.visit_id IS '来場セッションID';

COMMENT ON TABLE diagnosis_responses IS '診断回答テーブル（正規化）';
COMMENT ON COLUMN diagnosis_responses.visit_id IS '来場セッションID';

COMMENT ON TABLE reports IS 'レポート管理テーブル';
COMMENT ON COLUMN reports.visit_id IS '来場セッションID（レポートURLにも使用）';

-- ============================================================================
-- Phase 10: ビューを更新（session_id 参照を削除）
-- ============================================================================

DROP VIEW IF EXISTS user_responses_view;
DROP VIEW IF EXISTS diagnosis_analytics_view;
DROP VIEW IF EXISTS diagnosis_results_view;
DROP VIEW IF EXISTS questionnaire_results_view;

-- 新しいビュー: 診断結果
CREATE OR REPLACE VIEW diagnosis_results_view AS
SELECT
  v.id as visit_id,
  v.visit_date,
  v.status,
  c.first_name as child_first_name,
  c.last_name as child_last_name,
  p.first_name as parent_first_name,
  p.last_name as parent_last_name,
  p.display_name as parent_display_name,
  e.name as event_name,
  di.question as item_question,
  di.code as item_code,
  dc.name as category_name,
  dc.code as category_code,
  dr.value,
  dr.answered_at
FROM visits v
LEFT JOIN children c ON v.child_id = c.id
LEFT JOIN profiles p ON c.parent_profile_id = p.id
LEFT JOIN events e ON v.event_id = e.id
LEFT JOIN diagnosis_responses dr ON v.id = dr.visit_id
LEFT JOIN diagnosis_items di ON dr.item_id = di.id
LEFT JOIN diagnosis_categories dc ON di.category_id = dc.id
ORDER BY v.visit_date DESC, dc.display_order, di.display_order;

-- 新しいビュー: 問診結果
CREATE OR REPLACE VIEW questionnaire_results_view AS
SELECT
  v.id as visit_id,
  v.visit_date,
  v.status,
  c.first_name as child_first_name,
  c.last_name as child_last_name,
  p.first_name as parent_first_name,
  p.last_name as parent_last_name,
  p.display_name as parent_display_name,
  e.name as event_name,
  qi.question as item_question,
  qi.code as item_code,
  qc.name as category_name,
  qc.code as category_code,
  qr.value,
  qr.answered_at
FROM visits v
LEFT JOIN children c ON v.child_id = c.id
LEFT JOIN profiles p ON c.parent_profile_id = p.id
LEFT JOIN events e ON v.event_id = e.id
LEFT JOIN questionnaire_responses qr ON v.id = qr.visit_id
LEFT JOIN questionnaire_items qi ON qr.item_id = qi.id
LEFT JOIN questionnaire_categories qc ON qi.category_id = qc.id
ORDER BY v.visit_date DESC, qc.display_order, qi.display_order;

-- ============================================================================
-- 完了
-- ============================================================================

