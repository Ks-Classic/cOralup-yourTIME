-- ============================================================================
-- reports テーブルの改善
-- 
-- 変更内容:
--   1. 重複するvisit_idのレポートを削除（最新のみ保持）
--   2. visit_id に UNIQUE 制約を追加（1 visit = 1 report を保証）
--   3. uuid カラムを削除（visit_id をレポートURLの識別子として使用）
-- ============================================================================

-- 1. 重複するvisit_idのレポートを削除（最新のcreated_atのみ保持）
DELETE FROM reports r1
WHERE EXISTS (
  SELECT 1 FROM reports r2
  WHERE r1.visit_id = r2.visit_id
    AND r1.visit_id IS NOT NULL
    AND r1.created_at < r2.created_at
);

-- 2. visit_id に UNIQUE 制約を追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reports_visit_id_unique' AND conrelid = 'reports'::regclass
  ) THEN
    ALTER TABLE reports ADD CONSTRAINT reports_visit_id_unique UNIQUE (visit_id);
  END IF;
END $$;

-- 3. uuid カラムを削除（不要になったため）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'uuid'
  ) THEN
    DROP INDEX IF EXISTS idx_reports_uuid;
    ALTER TABLE reports DROP COLUMN uuid;
  END IF;
END $$;

-- コメント更新
COMMENT ON TABLE reports IS 'レポートテーブル（1 visit = 1 report、visit_id がURLの識別子）';


