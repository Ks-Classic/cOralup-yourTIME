-- ============================================================================
-- visits テーブルに詳細ステップ管理カラムを追加
-- ============================================================================
-- 作成日: 2024-12-17
-- 目的: 
--   1. 診断フローの詳細ステップを記録
--   2. リアルタイム監視ダッシュボードで可視化
--   3. 各ステップのタイムスタンプを記録
-- ============================================================================

-- 診断ステップの定義
-- 1. line_registered - LINE友だち登録完了
-- 2. questionnaire_completed - 問診完了
-- 3. diagnosis_started - QR読み込み（診断スタート）
-- 4. photos_uploaded - 写真撮影・保存成功
-- 5. analysis_completed - AI分析完了
-- 6. report_generated - レポート生成完了
-- 7. line_sent - LINE送信完了
-- 8. line_confirmed - LINE通知確認完了（診断完了）

-- 現在のステップを記録
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS current_step VARCHAR(50);

COMMENT ON COLUMN visits.current_step IS 
'現在の診断ステップ: line_registered, questionnaire_completed, diagnosis_started, photos_uploaded, analysis_completed, report_generated, line_sent, line_confirmed';

-- 各ステップのタイムスタンプを記録（JSONB）
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS step_timestamps JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN visits.step_timestamps IS 
'各ステップのタイムスタンプ: {"line_registered": "2024-12-17T10:00:00Z", ...}';

-- インデックス追加（ステップでの検索を高速化）
CREATE INDEX IF NOT EXISTS idx_visits_current_step ON visits(current_step);

-- ブース番号（診断ブースの識別用）
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS booth_number INTEGER;

COMMENT ON COLUMN visits.booth_number IS 
'診断ブース番号（1-4）';

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_visits_booth_number ON visits(booth_number);

-- エラー情報を記録
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS error_info JSONB;

COMMENT ON COLUMN visits.error_info IS 
'エラー情報: {"type": "photo_upload_failed", "message": "...", "occurred_at": "2024-12-17T10:00:00Z"}';


