-- ========================================
-- イベントデータ登録 + 既存スタッフ紐付け
-- ========================================
-- 実行方法:
--   supabase SQL Editor で実行、または:
--   npx tsx scripts/seed-events.ts
--
-- 注意: event_staffs テーブルが先に作成されている必要あり
--       (npm run db:push で Drizzle スキーマを反映)
--
-- 冪等性: ON CONFLICT で重複実行しても安全
-- ========================================

-- 1. イベント登録（3件）
-- osaka-yourtime-2025（完了済み）
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

-- kagoshima-yourtime-2026（アクティブ）
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

-- oizumigakuen-yourtime-2026（アクティブ）
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

-- 2. 既存スタッフを全イベントに紐付け
-- (role='staff' または secondary_role='staff' のプロフィールを対象)
-- ON CONFLICT で重複実行しても安全

-- 大阪YourTIME（完了済み・実績記録）
INSERT INTO event_staffs (event_id, profile_id, role, status)
SELECT e.id, p.id, 'staff', 'confirmed'
FROM profiles p
CROSS JOIN events e
WHERE e.event_id = 'osaka-yourtime-2025'
  AND (p.role = 'staff' OR p.secondary_role = 'staff')
ON CONFLICT (event_id, profile_id) DO NOTHING;

-- 鹿児島YourTIME（active）
INSERT INTO event_staffs (event_id, profile_id, role, status)
SELECT e.id, p.id, 'staff', 'confirmed'
FROM profiles p
CROSS JOIN events e
WHERE e.event_id = 'kagoshima-yourtime-2026'
  AND (p.role = 'staff' OR p.secondary_role = 'staff')
ON CONFLICT (event_id, profile_id) DO NOTHING;

-- 大泉学園YourTIME（active）
INSERT INTO event_staffs (event_id, profile_id, role, status)
SELECT e.id, p.id, 'staff', 'confirmed'
FROM profiles p
CROSS JOIN events e
WHERE e.event_id = 'oizumigakuen-yourtime-2026'
  AND (p.role = 'staff' OR p.secondary_role = 'staff')
ON CONFLICT (event_id, profile_id) DO NOTHING;

