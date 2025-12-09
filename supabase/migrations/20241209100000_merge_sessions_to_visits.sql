-- ============================================
-- sessions テーブルを visits に統合
-- 将来的な運用・発展性・認識のしやすさを考慮
-- session_id を主キーとして使用（汎用性のため）
-- ============================================

-- 1. visits テーブルに sessions のカラムを追加
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS parent_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(20);

-- 2. visits.session_id を UNIQUE NOT NULL に変更（既存データがある場合は慎重に）
DO $$
BEGIN
    -- visitsテーブルが存在する場合のみ実行
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visits') THEN
        -- session_idがNULLのレコードがある場合はエラー
        IF EXISTS (SELECT 1 FROM visits WHERE session_id IS NULL) THEN
            RAISE EXCEPTION 'visitsテーブルにsession_idがNULLのレコードがあります。先にデータを修正してください。';
        END IF;
        
        -- session_idをNOT NULLに変更（既にNOT NULLの場合はスキップ）
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'visits' 
            AND column_name = 'session_id' 
            AND is_nullable = 'YES'
        ) THEN
            ALTER TABLE visits ALTER COLUMN session_id SET NOT NULL;
        END IF;
        
        -- UNIQUE制約を追加（既存の制約を削除してから）
        ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_session_id_key;
        ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_session_id_unique;
        ALTER TABLE visits ADD CONSTRAINT visits_session_id_unique UNIQUE (session_id);
    END IF;
END $$;

-- 3. sessions テーブルから visits にデータを移行（既存データがある場合）
-- visitsに既にsession_idがある場合は更新、ない場合は新規作成
DO $$
DECLARE
    session_record RECORD;
BEGIN
    -- sessions テーブルが存在する場合のみ実行
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
        FOR session_record IN 
            SELECT * FROM sessions
        LOOP
            -- 既存のvisitがある場合は更新、ない場合は新規作成
            INSERT INTO visits (
                session_id,
                line_user_id,
                parent_name,
                parent_phone,
                status,
                visit_date,
                created_at,
                updated_at
            )
            VALUES (
                session_record.session_id,
                session_record.line_user_id,
                session_record.parent_name,
                session_record.parent_phone,
                COALESCE(
                    (SELECT status FROM visits WHERE session_id = session_record.session_id),
                    session_record.status
                ),
                COALESCE(
                    (SELECT visit_date FROM visits WHERE session_id = session_record.session_id),
                    session_record.created_at
                ),
                session_record.created_at,
                session_record.updated_at
            )
            ON CONFLICT (session_id) 
            DO UPDATE SET
                line_user_id = COALESCE(EXCLUDED.line_user_id, visits.line_user_id),
                parent_name = COALESCE(EXCLUDED.parent_name, visits.parent_name),
                parent_phone = COALESCE(EXCLUDED.parent_phone, visits.parent_phone),
                status = COALESCE(visits.status, EXCLUDED.status),
                updated_at = GREATEST(visits.updated_at, EXCLUDED.updated_at);
        END LOOP;
    END IF;
END $$;

-- 4. 外部キー制約を更新（sessions参照 → visits参照）
-- questionnaires
ALTER TABLE IF EXISTS questionnaires 
  DROP CONSTRAINT IF EXISTS questionnaires_session_id_fkey;
ALTER TABLE IF EXISTS questionnaires 
  ADD CONSTRAINT questionnaires_session_id_fkey 
  FOREIGN KEY (session_id) REFERENCES visits(session_id) ON DELETE CASCADE;

-- diagnoses
ALTER TABLE IF EXISTS diagnoses 
  DROP CONSTRAINT IF EXISTS diagnoses_session_id_fkey;
ALTER TABLE IF EXISTS diagnoses 
  ADD CONSTRAINT diagnoses_session_id_fkey 
  FOREIGN KEY (session_id) REFERENCES visits(session_id) ON DELETE CASCADE;

-- reports
ALTER TABLE IF EXISTS reports 
  DROP CONSTRAINT IF EXISTS reports_session_id_fkey;
ALTER TABLE IF EXISTS reports 
  ADD CONSTRAINT reports_session_id_fkey 
  FOREIGN KEY (session_id) REFERENCES visits(session_id) ON DELETE CASCADE;

-- form_responses
ALTER TABLE IF EXISTS form_responses 
  DROP CONSTRAINT IF EXISTS form_responses_session_id_fkey;
ALTER TABLE IF EXISTS form_responses 
  ADD CONSTRAINT form_responses_session_id_fkey 
  FOREIGN KEY (session_id) REFERENCES visits(session_id) ON DELETE CASCADE;

-- diagnosis_responses
ALTER TABLE IF EXISTS diagnosis_responses 
  DROP CONSTRAINT IF EXISTS diagnosis_responses_session_id_fkey;
ALTER TABLE IF EXISTS diagnosis_responses 
  ADD CONSTRAINT diagnosis_responses_session_id_fkey 
  FOREIGN KEY (session_id) REFERENCES visits(session_id) ON DELETE CASCADE;

-- questionnaire_responses
ALTER TABLE IF EXISTS questionnaire_responses 
  DROP CONSTRAINT IF EXISTS questionnaire_responses_session_id_fkey;
ALTER TABLE IF EXISTS questionnaire_responses 
  ADD CONSTRAINT questionnaire_responses_session_id_fkey 
  FOREIGN KEY (session_id) REFERENCES visits(session_id) ON DELETE CASCADE;

-- 5. visits テーブルから session_id への外部キー参照を削除（自己参照になるため）
ALTER TABLE IF EXISTS visits 
  DROP CONSTRAINT IF EXISTS visits_session_id_fkey;

-- 6. ビューを更新
DROP VIEW IF EXISTS user_responses_view;
CREATE OR REPLACE VIEW user_responses_view AS
SELECT
  fr.id,
  fr.response_id,
  fr.session_id,
  fr.submitted_at,
  v.parent_name,
  v.parent_phone,
  e.name as event_name,
  fs.name as form_name,
  fs.form_type,
  fr.response_data,
  fr.metadata
FROM form_responses fr
LEFT JOIN visits v ON fr.session_id = v.session_id
LEFT JOIN events e ON fr.event_id = e.id
LEFT JOIN form_schemas fs ON fr.schema_id = fs.id;

DROP VIEW IF EXISTS diagnosis_analytics_view;
CREATE OR REPLACE VIEW diagnosis_analytics_view AS
SELECT
  fr.session_id,
  v.parent_name,
  v.parent_phone,
  e.name as event_name,
  fr.submitted_at,
  (fr.response_data->>'posture_score')::integer as posture_score,
  (fr.response_data->>'oral_score')::integer as oral_score,
  (fr.response_data->>'overall_score')::integer as overall_score,
  fr.response_data->>'diagnosis_notes' as notes,
  fr.response_data->>'ai_analysis' as ai_analysis
FROM form_responses fr
LEFT JOIN visits v ON fr.session_id = v.session_id
LEFT JOIN events e ON fr.event_id = e.id
WHERE fr.response_data->>'form_type' = 'diagnosis';

-- 7. インデックスを更新
CREATE INDEX IF NOT EXISTS idx_visits_session_id ON visits(session_id);
CREATE INDEX IF NOT EXISTS idx_visits_line_user_id ON visits(line_user_id);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_event_id ON visits(event_id);
CREATE INDEX IF NOT EXISTS idx_visits_child_id ON visits(child_id);
CREATE INDEX IF NOT EXISTS idx_visits_staff_profile_id ON visits(staff_profile_id);

-- 8. sessions テーブルを削除（外部キー参照が全て更新された後）
-- 注意: データ移行が完了していることを確認してから実行
-- トリガーを先に削除
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
DROP TABLE IF EXISTS sessions CASCADE;

-- 9. コメントを更新
COMMENT ON TABLE visits IS '来場セッション管理テーブル（sessionsを統合）';
COMMENT ON COLUMN visits.session_id IS 'セッションID（QRコード用、汎用的に使用可能）';
COMMENT ON COLUMN visits.line_user_id IS 'LINEユーザーID（親御さん）';
COMMENT ON COLUMN visits.parent_name IS '親御さん名';
COMMENT ON COLUMN visits.parent_phone IS '親御さん電話番号';

