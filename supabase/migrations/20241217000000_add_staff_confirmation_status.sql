-- ============================================================================
-- line_message_logs テーブルに staff_confirmation_status カラム追加
-- ============================================================================
-- 作成日: 2024-12-17
-- 目的: 
--   1. スタッフの確認結果を記録するカラムを追加
--   2. システム送信結果（status）とスタッフ確認結果（staff_confirmation_status）を分離
--   3. 再送信対象の特定と状態把握を容易にする
-- ============================================================================

-- staff_confirmation_status カラムを追加
ALTER TABLE line_message_logs 
ADD COLUMN IF NOT EXISTS staff_confirmation_status VARCHAR(20) 
CHECK (staff_confirmation_status IN ('confirmed', 'not_received', 'unknown'));

-- コメント追加
COMMENT ON COLUMN line_message_logs.staff_confirmation_status IS 
'スタッフ確認結果: confirmed=届いた, not_received=届いていない, unknown=確認できなかった';

-- インデックス追加（確認状態での検索を高速化）
CREATE INDEX IF NOT EXISTS idx_line_message_logs_staff_confirmation_status 
ON line_message_logs(staff_confirmation_status);

-- 確認日時カラムも追加（いつ確認したか記録）
ALTER TABLE line_message_logs 
ADD COLUMN IF NOT EXISTS staff_confirmed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN line_message_logs.staff_confirmed_at IS 
'スタッフが確認結果を入力した日時';


