-- ============================================================================
-- マスターデータ投入用シードSQL
-- ============================================================================
-- 対象: diagnosis_categories, diagnosis_items
--      questionnaire_categories, questionnaire_items
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 診断カテゴリ
-- ----------------------------------------------------------------------------
INSERT INTO diagnosis_categories (name, display_order, description) VALUES
('習癖', 1, '指しゃぶり、爪噛みなどの習癖'),
('舌', 2, '舌小帯、舌の形状、動き'),
('歯列・咬合', 3, '歯並び、噛み合わせ'),
('口唇', 4, '唇の形状、閉鎖不全'),
('鼻・扁桃', 5, '鼻呼吸障害、扁桃肥大'),
('顔面・頚部', 6, '顔の非対称、首の傾き'),
('呼吸', 7, '口呼吸、いびき'),
('嚥下', 8, '飲み込み方の異常'),
('食習慣', 9, '食事中の姿勢、食べ方'),
('睡眠', 10, '睡眠の質、態勢'),
('足', 11, '足指の変形、接地'),
('全身', 12, '姿勢、バランス'),
('姿勢', 13, '立位、座位の姿勢'),
('靴', 14, '靴の選び方、すり減り'),
('機能検査', 15, '口唇閉鎖力、咀嚼能力'),
('サーモグラフ', 16, '顔面皮膚温');

-- ----------------------------------------------------------------------------
-- 2. 診断項目（サンプル: 習癖カテゴリ）
-- ----------------------------------------------------------------------------
WITH cat AS (SELECT id FROM diagnosis_categories WHERE name = '習癖' LIMIT 1)
INSERT INTO diagnosis_items (category_id, question, answer_type, input_type, options, display_order)
SELECT 
  id, 
  '指しゃぶりはありますか？',
  'radio',
  'staff',
  '[
    {"value": "none", "label": "なし"},
    {"value": "thumb", "label": "親指"},
    {"value": "fingers", "label": "他の指"}
   ]'::jsonb,
  1
FROM cat;

WITH cat AS (SELECT id FROM diagnosis_categories WHERE name = '習癖' LIMIT 1)
INSERT INTO diagnosis_items (category_id, question, answer_type, input_type, options, display_order)
SELECT 
  id, 
  '爪噛みはありますか？',
  'radio',
  'staff',
  '[
    {"value": "no", "label": "なし"},
    {"value": "yes", "label": "あり"}
   ]'::jsonb,
  2
FROM cat;

-- ----------------------------------------------------------------------------
-- 3. 診断項目（サンプル: 舌カテゴリ）
-- ----------------------------------------------------------------------------
WITH cat AS (SELECT id FROM diagnosis_categories WHERE name = '舌' LIMIT 1)
INSERT INTO diagnosis_items (category_id, question, answer_type, input_type, options, display_order)
SELECT 
  id, 
  '舌小帯の付着異常はありますか？',
  'radio',
  'staff',
  '[
    {"value": "normal", "label": "正常"},
    {"value": "short", "label": "短縮症疑い"},
    {"value": "ankyloglossia", "label": "癒着症"}
   ]'::jsonb,
  1
FROM cat;

-- ----------------------------------------------------------------------------
-- 4. 問診カテゴリ
-- ----------------------------------------------------------------------------
INSERT INTO questionnaire_categories (name, target_age, display_order) VALUES
('基本情報', 'all', 1),
('きょうだい', 'preschool', 2),
('スマホ・タブレット・TV視聴', 'preschool', 3),
('睡眠の様子', 'all', 4),
('睡眠時間', 'all', 5),
('習い事', 'all', 6),
('食事について', 'all', 7),
('食べ物の好み', 'preschool', 8),
('気になること', 'elementary', 9),
('同意事項', 'all', 10);

-- ----------------------------------------------------------------------------
-- 5. 問診項目（サンプル: 基本情報）
-- ----------------------------------------------------------------------------
WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '基本情報' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, is_required, display_order) 
SELECT id, 'お子様のお名前', 'text', true, 1 FROM cat;

WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '基本情報' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, is_required, display_order) 
SELECT id, '生年月日', 'text', true, 2 FROM cat; -- dateタイプがない場合はtextか要確認

-- ----------------------------------------------------------------------------
-- 6. 問診項目（サンプル: 睡眠の様子）
-- ----------------------------------------------------------------------------
WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '睡眠の様子' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, display_order)
SELECT 
  id, 
  'いびきをかきますか？',
  'radio',
  '[
    {"value": "never", "label": "かかない"},
    {"value": "sometimes", "label": "ときどき"},
    {"value": "always", "label": "毎日"}
   ]'::jsonb,
  1
FROM cat;
