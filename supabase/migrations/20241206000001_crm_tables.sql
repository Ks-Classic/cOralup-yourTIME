-- ============================================================================
-- CRM・自社管理用テーブル（箱作成）
-- ============================================================================
-- 作成日: 2024-12-06
-- 説明: cOralup自社管理用のCRM/SFAテーブル群
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
  email VARCHAR(255) UNIQUE,
  last_name VARCHAR(50),
  first_name VARCHAR(50),
  last_name_kana VARCHAR(50),
  first_name_kana VARCHAR(50),
  display_name VARCHAR(100),
  avatar_url TEXT,
  phone_number VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'parent' CHECK (role IN ('admin', 'staff', 'parent', 'trainer')),
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
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE children IS '患者（お子様）マスタ';

-- ----------------------------------------------------------------------------
-- 4. 来場セッション（visitsとsessionsの橋渡し）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  staff_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id VARCHAR(10) REFERENCES sessions(session_id) ON DELETE CASCADE,
  visit_date TIMESTAMP WITH TIME ZONE,
  child_age_months INTEGER, -- 診断時の月齢スナップショット
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'report_sent')),
  reception_number VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE visits IS '来場セッション（いつ、誰が、誰を診たか）';

-- ----------------------------------------------------------------------------
-- 5. 講座マスタ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  batch_number INTEGER,
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE courses IS '養成講座マスタ';

-- ----------------------------------------------------------------------------
-- 6. 受講履歴
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'graduated', 'dropped')),
  completion_date DATE,
  certificate_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, profile_id)
);

COMMENT ON TABLE enrollments IS '受講履歴';

-- ----------------------------------------------------------------------------
-- 7. MTG/議事録
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  meeting_date TIMESTAMP WITH TIME ZONE,
  location VARCHAR(200),
  content TEXT,
  summary TEXT,
  tags VARCHAR[] DEFAULT '{}',
  attendees UUID[] DEFAULT '{}', -- profile_ids
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE meetings IS 'MTG/議事録';

-- ----------------------------------------------------------------------------
-- 8. イベントスタッフ（誰がどのイベントに参加したか）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_staffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50), -- 'leader', 'diagnosis', 'reception'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, profile_id)
);

COMMENT ON TABLE event_staffs IS 'イベントスタッフ割り当て';

-- ----------------------------------------------------------------------------
-- インデックス
-- ----------------------------------------------------------------------------

-- organizations
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON profiles(line_user_id);

-- children
CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_profile_id);

-- visits
CREATE INDEX IF NOT EXISTS idx_visits_event ON visits(event_id);
CREATE INDEX IF NOT EXISTS idx_visits_child ON visits(child_id);
CREATE INDEX IF NOT EXISTS idx_visits_session ON visits(session_id);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);

-- courses
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_profile ON enrollments(profile_id);

-- meetings
CREATE INDEX IF NOT EXISTS idx_meetings_organization ON meetings(organization_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);

-- event_staffs
CREATE INDEX IF NOT EXISTS idx_event_staffs_event ON event_staffs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_staffs_profile ON event_staffs(profile_id);

-- ----------------------------------------------------------------------------
-- 更新日時トリガー
-- ----------------------------------------------------------------------------
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visits_updated_at
  BEFORE UPDATE ON visits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

