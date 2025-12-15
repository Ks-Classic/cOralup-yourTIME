-- ============================================================================
-- 不足テーブル作成（profiles, children, organizations）
-- ============================================================================
-- 作成日: 2024-12-13
-- 説明: CRMテーブルが未適用のため、必要なテーブルを作成
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 組織マスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('internal', 'clinic', 'trainer', 'partner')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'trial')),
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE organizations IS '組織マスタ（cOralup、医院、トレーナー等）';

-- 初期データ: cOralup
INSERT INTO organizations (name, type, status) 
VALUES ('cOralup', 'internal', 'active')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. ユーザー台帳（プロファイル）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  line_user_id VARCHAR(255) UNIQUE,
  email VARCHAR(255),
  last_name VARCHAR(50),
  first_name VARCHAR(50),
  last_name_kana VARCHAR(50),
  first_name_kana VARCHAR(50),
  display_name VARCHAR(100),
  avatar_url TEXT,
  phone_number VARCHAR(20),
  prefecture VARCHAR(50),
  role VARCHAR(20) NOT NULL DEFAULT 'parent' CHECK (role IN ('admin', 'staff', 'parent', 'trainer')),
  is_active BOOLEAN DEFAULT true,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'ユーザー台帳（親御さん、スタッフ、トレーナー等）';

-- ----------------------------------------------------------------------------
-- 3. 患者（お子様）マスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  first_name_kana VARCHAR(50),
  last_name_kana VARCHAR(50),
  birthday DATE,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  nickname VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE children IS '患者（お子様）マスタ';

-- ----------------------------------------------------------------------------
-- 4. visitsテーブルに不足カラム追加
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- child_id カラム追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visits' AND column_name = 'child_id'
  ) THEN
    ALTER TABLE visits ADD COLUMN child_id UUID REFERENCES children(id) ON DELETE SET NULL;
  END IF;

  -- staff_profile_id カラム追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visits' AND column_name = 'staff_profile_id'
  ) THEN
    ALTER TABLE visits ADD COLUMN staff_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  -- organization_id カラム追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visits' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE visits ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;

  -- event_id カラム追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visits' AND column_name = 'event_id'
  ) THEN
    ALTER TABLE visits ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE SET NULL;
  END IF;

  -- visit_date カラム追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visits' AND column_name = 'visit_date'
  ) THEN
    ALTER TABLE visits ADD COLUMN visit_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- child_age_months カラム追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visits' AND column_name = 'child_age_months'
  ) THEN
    ALTER TABLE visits ADD COLUMN child_age_months INTEGER;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. インデックス作成
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON profiles(line_user_id);

CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_profile_id);

CREATE INDEX IF NOT EXISTS idx_visits_child ON visits(child_id);
CREATE INDEX IF NOT EXISTS idx_visits_staff ON visits(staff_profile_id);
CREATE INDEX IF NOT EXISTS idx_visits_event ON visits(event_id);

-- ----------------------------------------------------------------------------
-- 6. RLS有効化
-- ----------------------------------------------------------------------------
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

-- service_role用ポリシー
DROP POLICY IF EXISTS "Service role access for organizations" ON organizations;
CREATE POLICY "Service role access for organizations" ON organizations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access for profiles" ON profiles;
CREATE POLICY "Service role access for profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access for children" ON children;
CREATE POLICY "Service role access for children" ON children FOR ALL USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 完了
-- ----------------------------------------------------------------------------





