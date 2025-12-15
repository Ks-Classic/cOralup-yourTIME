-- ============================================================================
-- 冗長カラム削除 + session_id 統一マイグレーション
-- ============================================================================
-- 作成日: 2024-12-13
-- 目的: 
--   1. visits テーブルから冗長な line_user_id, parent_name, parent_phone を削除
--   2. 各テーブルの session_id を visit_id に統一
--   3. データ整合性の確保
-- ============================================================================

-- ============================================================================
-- Phase 1: visits テーブルの冗長カラム削除
-- ============================================================================
-- 理由: line_user_id, parent_name, parent_phone は
--       visits.child_id -> children.parent_profile_id -> profiles から取得可能

-- 1.1 line_user_id 削除
ALTER TABLE visits DROP COLUMN IF EXISTS line_user_id;

-- 1.2 parent_name 削除
ALTER TABLE visits DROP COLUMN IF EXISTS parent_name;

-- 1.3 parent_phone 削除
ALTER TABLE visits DROP COLUMN IF EXISTS parent_phone;

-- ============================================================================
-- Phase 2: 各テーブルに visit_id カラム追加（存在しない場合）
-- ============================================================================

-- 2.1 questionnaires テーブル
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questionnaires' AND column_name = 'visit_id'
  ) THEN
    ALTER TABLE questionnaires ADD COLUMN visit_id UUID;
  END IF;
END $$;

-- 2.2 diagnoses テーブル
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'diagnoses' AND column_name = 'visit_id'
  ) THEN
    ALTER TABLE diagnoses ADD COLUMN visit_id UUID;
  END IF;
END $$;

-- 2.3 questionnaire_responses テーブル
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questionnaire_responses' AND column_name = 'visit_id'
  ) THEN
    ALTER TABLE questionnaire_responses ADD COLUMN visit_id UUID;
  END IF;
END $$;

-- 2.4 form_responses テーブル
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_responses' AND column_name = 'visit_id'
  ) THEN
    ALTER TABLE form_responses ADD COLUMN visit_id UUID;
  END IF;
END $$;

-- ============================================================================
-- Phase 3: session_id から visit_id へのデータ移行
-- ============================================================================

-- 3.1 questionnaires: session_id -> visit_id
UPDATE questionnaires q
SET visit_id = v.id
FROM visits v
WHERE q.session_id = v.session_id
  AND q.visit_id IS NULL
  AND q.session_id IS NOT NULL;

-- 3.2 diagnoses: session_id -> visit_id
UPDATE diagnoses d
SET visit_id = v.id
FROM visits v
WHERE d.session_id = v.session_id
  AND d.visit_id IS NULL
  AND d.session_id IS NOT NULL;

-- 3.3 questionnaire_responses: session_id -> visit_id
UPDATE questionnaire_responses qr
SET visit_id = v.id
FROM visits v
WHERE qr.session_id = v.session_id
  AND qr.visit_id IS NULL
  AND qr.session_id IS NOT NULL;

-- 3.4 diagnosis_responses: session_id -> visit_id (既に visit_id がある場合はスキップ)
UPDATE diagnosis_responses dr
SET visit_id = v.id
FROM visits v
WHERE dr.session_id = v.session_id
  AND dr.visit_id IS NULL
  AND dr.session_id IS NOT NULL;

-- 3.5 reports: session_id -> visit_id
UPDATE reports r
SET visit_id = v.id
FROM visits v
WHERE r.session_id = v.session_id
  AND r.visit_id IS NULL
  AND r.session_id IS NOT NULL;

-- 3.6 form_responses: session_id -> visit_id
UPDATE form_responses fr
SET visit_id = v.id
FROM visits v
WHERE fr.session_id = v.session_id
  AND fr.visit_id IS NULL
  AND fr.session_id IS NOT NULL;

-- 3.7 line_message_logs: session_id -> visit_id
UPDATE line_message_logs lml
SET visit_id = v.id
FROM visits v
WHERE lml.session_id = v.session_id
  AND lml.visit_id IS NULL
  AND lml.session_id IS NOT NULL;

-- ============================================================================
-- Phase 4: 外部キー制約の追加
-- ============================================================================

-- 4.1 questionnaires.visit_id -> visits.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'questionnaires_visit_id_fkey' AND table_name = 'questionnaires'
  ) THEN
    ALTER TABLE questionnaires 
      ADD CONSTRAINT questionnaires_visit_id_fkey 
      FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4.2 diagnoses.visit_id -> visits.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'diagnoses_visit_id_fkey' AND table_name = 'diagnoses'
  ) THEN
    ALTER TABLE diagnoses 
      ADD CONSTRAINT diagnoses_visit_id_fkey 
      FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4.3 questionnaire_responses.visit_id -> visits.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'questionnaire_responses_visit_id_fkey' AND table_name = 'questionnaire_responses'
  ) THEN
    ALTER TABLE questionnaire_responses 
      ADD CONSTRAINT questionnaire_responses_visit_id_fkey 
      FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4.4 form_responses.visit_id -> visits.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'form_responses_visit_id_fkey' AND table_name = 'form_responses'
  ) THEN
    ALTER TABLE form_responses 
      ADD CONSTRAINT form_responses_visit_id_fkey 
      FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- Phase 5: インデックス追加
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_questionnaires_visit_id ON questionnaires(visit_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_visit_id ON diagnoses(visit_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_visit_id ON questionnaire_responses(visit_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_visit_id ON form_responses(visit_id);

-- ============================================================================
-- Phase 6: コメント追加
-- ============================================================================

COMMENT ON COLUMN questionnaires.visit_id IS '来場セッションID（visitsテーブル参照）';
COMMENT ON COLUMN diagnoses.visit_id IS '来場セッションID（visitsテーブル参照）';
COMMENT ON COLUMN questionnaire_responses.visit_id IS '来場セッションID（visitsテーブル参照）';
COMMENT ON COLUMN form_responses.visit_id IS '来場セッションID（visitsテーブル参照）';

-- ============================================================================
-- 注意: session_id カラムは後方互換性のため一旦残す
-- 完全移行後に別マイグレーションで削除予定
-- ============================================================================






