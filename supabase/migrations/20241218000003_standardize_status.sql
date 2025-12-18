-- ============================================================================
-- ステータス管理の標準化（Status vs Step）
-- ============================================================================

-- 1. カラム型変更（VARCHAR(20)だと'questionnaire_completed'が入らないため拡張）
ALTER TABLE visits ALTER COLUMN status TYPE VARCHAR(50);

-- 2. 古い制約の削除
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_status_check;

-- 3. ステータスとステップのデータ移行（Mapping）

-- 3.1 questionnaire_completed (問診完了 -> 対応中 / Step: 問診完了)
UPDATE visits 
SET status = 'in_progress', current_step = 'questionnaire_completed' 
WHERE status = 'questionnaire_completed';

-- 3.2 diagnosis_completed (診断完了 -> 完了 / Step: 分析完了)
UPDATE visits 
SET status = 'completed', current_step = 'analysis_completed' 
WHERE status = 'diagnosis_completed';

-- 3.3 report_sent (レポート送信済 -> 公開済 / Step: 送信済)
UPDATE visits 
SET status = 'published', current_step = 'line_sent' 
WHERE status = 'report_sent';

-- 3.4 waiting (待機中 -> 待機中 / Step: LINE登録済)
UPDATE visits 
SET status = 'waiting', current_step = 'line_registered' 
WHERE status = 'waiting' AND current_step IS NULL;

-- 3.5 in_progress (診断中 -> 対応中 / Step: 診断開始 - デフォルト)
UPDATE visits 
SET status = 'in_progress', current_step = 'diagnosis_started' 
WHERE status = 'in_progress' AND current_step IS NULL;

-- 3.6 questionnaire_in_progress (問診中 -> 対応中 / Step: 問診開始)
UPDATE visits 
SET status = 'in_progress', current_step = 'questionnaire_started' 
WHERE status = 'questionnaire_in_progress';

-- 3.7 未定義のステータス（ゴミデータ）を waiting に強制変換（Safety Fallback）
UPDATE visits
SET status = 'waiting', current_step = 'line_registered'
WHERE status NOT IN ('waiting', 'in_progress', 'completed', 'published', 'cancelled');

-- 4. 新しいCHECK制約の適用

-- 4.1 status: ライフサイクル
ALTER TABLE visits 
ADD CONSTRAINT visits_status_check 
CHECK (status IN ('waiting', 'in_progress', 'completed', 'published', 'cancelled'));

-- 4.2 current_step: 詳細プロセス
-- NULLデータは初期値へ
UPDATE visits SET current_step = 'line_registered' WHERE current_step IS NULL;

ALTER TABLE visits 
ADD CONSTRAINT visits_current_step_check 
CHECK (current_step IN (
  'line_registered', 
  'questionnaire_started', 
  'questionnaire_completed', 
  'diagnosis_started', 
  'photos_uploaded', 
  'analysis_completed', 
  'report_generated', 
  'line_sent', 
  'line_confirmed'
));

-- 5. コメント更新
COMMENT ON COLUMN visits.status IS 'ライフサイクル: waiting(待機), in_progress(対応中), completed(現場完了), published(送信済), cancelled(中止)';
COMMENT ON COLUMN visits.current_step IS '進捗ステップ: line_registered, questionnaire_started, questionnaire_completed, diagnosis_started, photos_uploaded, analysis_completed, report_generated, line_sent, line_confirmed';
