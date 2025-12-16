-- secondary_role カラム追加
-- 目的: スタッフが親御さん役としてテストできるように（1人2役対応）

-- secondary_role カラム追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS secondary_role VARCHAR(20) 
  CHECK (secondary_role IN ('admin', 'staff', 'parent', 'trainer'));

-- コメント追加
COMMENT ON COLUMN profiles.secondary_role IS 'テスト用: スタッフが親御さん役もできるように（または逆）';

-- インデックス追加（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_profiles_secondary_role ON profiles(secondary_role);


