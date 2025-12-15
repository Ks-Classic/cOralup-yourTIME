-- ============================================================================
-- session_id / status カラムの長さを修正
-- ============================================================================
-- 作成日: 2024-12-14
-- 目的: 
--   1. session_id が VARCHAR(10) で定義されているが、実際に生成される値は
--      13文字（例: SMJ5DCHEQXOPY）のため、VARCHAR(50) に拡張
--   2. status が VARCHAR(20) で定義されているが、'questionnaire_in_progress' は
--      24文字のため、VARCHAR(50) に拡張
-- ============================================================================

-- 1. visits テーブル
ALTER TABLE IF EXISTS visits 
  ALTER COLUMN session_id TYPE VARCHAR(50);

-- visits.status を拡張（questionnaire_in_progress は24文字）
ALTER TABLE IF EXISTS visits 
  ALTER COLUMN status TYPE VARCHAR(50);

-- 2. questionnaire_responses テーブル（session_id カラムがある場合）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questionnaire_responses' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE questionnaire_responses ALTER COLUMN session_id TYPE VARCHAR(50);
  END IF;
END $$;

-- 3. diagnosis_responses テーブル
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'diagnosis_responses' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE diagnosis_responses ALTER COLUMN session_id TYPE VARCHAR(50);
  END IF;
END $$;

-- 4. reports テーブル
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE reports ALTER COLUMN session_id TYPE VARCHAR(50);
  END IF;
END $$;

-- 5. questionnaires テーブル
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questionnaires' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE questionnaires ALTER COLUMN session_id TYPE VARCHAR(50);
  END IF;
END $$;

-- 6. diagnoses テーブル
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'diagnoses' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE diagnoses ALTER COLUMN session_id TYPE VARCHAR(50);
  END IF;
END $$;

-- 7. form_responses テーブル
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_responses' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE form_responses ALTER COLUMN session_id TYPE VARCHAR(50);
  END IF;
END $$;

-- 8. line_message_logs テーブル
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'line_message_logs' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE line_message_logs ALTER COLUMN session_id TYPE VARCHAR(50);
  END IF;
END $$;

-- 9. visit_photos テーブル
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visit_photos' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE visit_photos ALTER COLUMN session_id TYPE VARCHAR(50);
  END IF;
END $$;

-- 10. ai_analysis_results テーブル
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_analysis_results' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE ai_analysis_results ALTER COLUMN session_id TYPE VARCHAR(50);
  END IF;
END $$;

-- 11. sessions テーブル（存在する場合）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE sessions ALTER COLUMN session_id TYPE VARCHAR(50);
  END IF;
END $$;

COMMENT ON COLUMN visits.session_id IS 'セッションID（VARCHAR(50)に拡張、例: SMJ5DCHEQXOPY）';
