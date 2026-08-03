-- YourTIME.8th 東京（2026-08-02）を追加する。
-- 過去イベントがログイン画面へ残らないよう、既知の終了済みイベントも完了扱いにする。

UPDATE events
SET status = 'completed', updated_at = NOW()
WHERE event_id IN (
  'osaka-yourtime-2025',
  'kagoshima-yourtime-2026',
  'oizumigakuen-yourtime-2026'
);

INSERT INTO events (
  event_id,
  name,
  description,
  start_date,
  end_date,
  venue,
  status,
  created_at,
  updated_at
)
VALUES (
  'yourtime-8th-tokyo-2026',
  '8/2 YourTIME.8th 東京',
  'YourTIME.8th 東京 cOral upブース',
  '2026-08-02T10:30:00+09:00',
  '2026-08-02T16:30:00+09:00',
  '東京流通センター 第1展示場C・D（東京都大田区平和島6-1-1）',
  'upcoming',
  NOW(),
  NOW()
)
ON CONFLICT (event_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  venue = EXCLUDED.venue,
  status = EXCLUDED.status,
  updated_at = NOW();
