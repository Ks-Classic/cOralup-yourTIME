-- テストデータ管理用カラム追加
-- 2024-12-19

-- visits テーブルにテストフラグを追加
ALTER TABLE visits ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT FALSE;

-- children テーブルにもテストフラグを追加（削除対象の特定用）
ALTER TABLE children ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT FALSE;

-- インデックス追加（テストデータ検索用）
CREATE INDEX IF NOT EXISTS idx_visits_is_test_data ON visits(is_test_data) WHERE is_test_data = TRUE;
CREATE INDEX IF NOT EXISTS idx_children_is_test_data ON children(is_test_data) WHERE is_test_data = TRUE;

-- コメント
COMMENT ON COLUMN visits.is_test_data IS 'テストデータフラグ。本番運用前に一括削除する対象を識別';
COMMENT ON COLUMN children.is_test_data IS 'テストデータフラグ。本番運用前に一括削除する対象を識別';
