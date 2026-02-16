-- ===========================================
-- event_staffs テーブル作成 + イベント登録
-- ===========================================

-- 1. event_staffs テーブル作成
CREATE TABLE IF NOT EXISTS event_staffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'staff',
    booth_number INTEGER,
    status VARCHAR(20) DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 同じスタッフが同じイベントに重複登録されないように
    UNIQUE(event_id, profile_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_event_staffs_event_id ON event_staffs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_staffs_profile_id ON event_staffs(profile_id);

-- 2. イベント登録（3件）
-- ※ event_id（文字列コード）は既存のものがあればそのまま、なければ新規作成

-- 2-1: 大阪YourTIME（2025/12/21 過去イベント）
INSERT INTO events (event_id, name, description, start_date, end_date, venue, status)
VALUES (
    'osaka-yourtime-2025',
    '大阪YourTIME.',
    '2025年12月21日 大阪YourTIME. 歯科検診イベント',
    '2025-12-21 09:00:00+09:00',
    '2025-12-21 18:00:00+09:00',
    '大阪',
    'completed'
)
ON CONFLICT (event_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    venue = EXCLUDED.venue;

-- 2-2: 鹿児島YourTIME（2026/3/1）
INSERT INTO events (event_id, name, description, start_date, end_date, venue, status)
VALUES (
    'kagoshima-yourtime-2026',
    '鹿児島YourTIME.',
    '2026年3月1日 鹿児島YourTIME. 歯科検診イベント',
    '2026-03-01 09:00:00+09:00',
    '2026-03-01 18:00:00+09:00',
    '鹿児島',
    'active'
)
ON CONFLICT (event_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    venue = EXCLUDED.venue,
    status = EXCLUDED.status;

-- 2-3: 大泉学園YourTIME（2026/3/15）
INSERT INTO events (event_id, name, description, start_date, end_date, venue, status)
VALUES (
    'oizumigakuen-yourtime-2026',
    '大泉学園YourTIME.',
    '2026年3月15日 大泉学園YourTIME. 歯科検診イベント',
    '2026-03-15 09:00:00+09:00',
    '2026-03-15 18:00:00+09:00',
    '大泉学園',
    'active'
)
ON CONFLICT (event_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    venue = EXCLUDED.venue,
    status = EXCLUDED.status;

-- 3. 既存スタッフを全イベントに紐付け
-- （role='staff' または secondary_role='staff' のプロフィールを全イベントに登録）

-- 大阪YourTIME
INSERT INTO event_staffs (event_id, profile_id, role, status)
SELECT e.id, p.id, 'staff', 'confirmed'
FROM profiles p CROSS JOIN events e
WHERE (p.role = 'staff' OR p.secondary_role = 'staff')
  AND e.event_id = 'osaka-yourtime-2025'
ON CONFLICT (event_id, profile_id) DO NOTHING;

-- 鹿児島YourTIME
INSERT INTO event_staffs (event_id, profile_id, role, status)
SELECT e.id, p.id, 'staff', 'confirmed'
FROM profiles p CROSS JOIN events e
WHERE (p.role = 'staff' OR p.secondary_role = 'staff')
  AND e.event_id = 'kagoshima-yourtime-2026'
ON CONFLICT (event_id, profile_id) DO NOTHING;

-- 大泉学園YourTIME
INSERT INTO event_staffs (event_id, profile_id, role, status)
SELECT e.id, p.id, 'staff', 'confirmed'
FROM profiles p CROSS JOIN events e
WHERE (p.role = 'staff' OR p.secondary_role = 'staff')
  AND e.event_id = 'oizumigakuen-yourtime-2026'
ON CONFLICT (event_id, profile_id) DO NOTHING;

