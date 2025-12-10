-- ============================================================================
-- 親御さん問診票（未就学児・小学生以上）マスターデータ
-- ============================================================================
-- 作成日: 2024-12-10
-- 説明: カウンセリングシートの全項目を投入
-- ============================================================================

-- 既存の問診項目をクリア（再投入のため）
DELETE FROM questionnaire_responses WHERE item_id IN (SELECT id FROM questionnaire_items);
DELETE FROM questionnaire_items;
DELETE FROM questionnaire_categories;

-- ============================================================================
-- カテゴリマスタ投入
-- ============================================================================
INSERT INTO questionnaire_categories (name, code, target_age, display_order, description) VALUES
-- 共通カテゴリ
('基本情報', 'basic_info', 'all', 1, 'お子様の基本情報'),
('睡眠の様子', 'sleep_status', 'all', 2, '睡眠中の状態'),
('睡眠時間', 'sleep_time', 'all', 3, '就寝時間・起床パターン'),
('習い事', 'lessons', 'all', 4, '習い事について'),
('同意事項', 'consent', 'all', 99, '学会発表等への同意'),
-- 未就学児専用
('きょうだい', 'siblings', 'preschool', 5, 'きょうだいの有無'),
('スマホ・タブレット・TV視聴', 'screen_time_preschool', 'preschool', 6, '視聴頻度と時間'),
('食事について', 'eating', 'preschool', 7, '食事の様子・問題'),
('食べ物の好み', 'food_preference', 'preschool', 8, '好き嫌い'),
-- 小学生以上専用
('ゲーム・スマホ・タブレット・TV視聴', 'screen_time_elementary', 'elementary', 6, '視聴頻度と時間'),
('気になること', 'concerns', 'elementary', 7, '保護者が気になる点');

-- ============================================================================
-- 問診項目マスタ投入
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 【共通】基本情報
-- ----------------------------------------------------------------------------
WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '基本情報' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, placeholder, display_order)
SELECT id, 'ふりがな', 'text', NULL, true, 'やまだ たろう', 1 FROM cat;

WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '基本情報' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, placeholder, display_order)
SELECT id, 'お名前', 'text', NULL, true, '山田 太郎', 2 FROM cat;

WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '基本情報' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, placeholder, display_order)
SELECT id, '生年月日', 'text', NULL, true, '2018年4月1日', 3 FROM cat;

WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '基本情報' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, placeholder, display_order)
SELECT id, 'お住まいの都道府県', 'select', '[
  {"value": "hokkaido", "label": "北海道"},
  {"value": "aomori", "label": "青森県"},
  {"value": "iwate", "label": "岩手県"},
  {"value": "miyagi", "label": "宮城県"},
  {"value": "akita", "label": "秋田県"},
  {"value": "yamagata", "label": "山形県"},
  {"value": "fukushima", "label": "福島県"},
  {"value": "ibaraki", "label": "茨城県"},
  {"value": "tochigi", "label": "栃木県"},
  {"value": "gunma", "label": "群馬県"},
  {"value": "saitama", "label": "埼玉県"},
  {"value": "chiba", "label": "千葉県"},
  {"value": "tokyo", "label": "東京都"},
  {"value": "kanagawa", "label": "神奈川県"},
  {"value": "niigata", "label": "新潟県"},
  {"value": "toyama", "label": "富山県"},
  {"value": "ishikawa", "label": "石川県"},
  {"value": "fukui", "label": "福井県"},
  {"value": "yamanashi", "label": "山梨県"},
  {"value": "nagano", "label": "長野県"},
  {"value": "gifu", "label": "岐阜県"},
  {"value": "shizuoka", "label": "静岡県"},
  {"value": "aichi", "label": "愛知県"},
  {"value": "mie", "label": "三重県"},
  {"value": "shiga", "label": "滋賀県"},
  {"value": "kyoto", "label": "京都府"},
  {"value": "osaka", "label": "大阪府"},
  {"value": "hyogo", "label": "兵庫県"},
  {"value": "nara", "label": "奈良県"},
  {"value": "wakayama", "label": "和歌山県"},
  {"value": "tottori", "label": "鳥取県"},
  {"value": "shimane", "label": "島根県"},
  {"value": "okayama", "label": "岡山県"},
  {"value": "hiroshima", "label": "広島県"},
  {"value": "yamaguchi", "label": "山口県"},
  {"value": "tokushima", "label": "徳島県"},
  {"value": "kagawa", "label": "香川県"},
  {"value": "ehime", "label": "愛媛県"},
  {"value": "kochi", "label": "高知県"},
  {"value": "fukuoka", "label": "福岡県"},
  {"value": "saga", "label": "佐賀県"},
  {"value": "nagasaki", "label": "長崎県"},
  {"value": "kumamoto", "label": "熊本県"},
  {"value": "oita", "label": "大分県"},
  {"value": "miyazaki", "label": "宮崎県"},
  {"value": "kagoshima", "label": "鹿児島県"},
  {"value": "okinawa", "label": "沖縄県"}
]'::jsonb, true, NULL, 4 FROM cat;

WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '基本情報' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, display_order)
SELECT id, '性別', 'radio', '[
  {"value": "male", "label": "男"},
  {"value": "female", "label": "女"}
]'::jsonb, true, 5 FROM cat;

WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '基本情報' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, is_required, display_order)
SELECT id, '年齢', 'number', true, 6 FROM cat;

WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '基本情報' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, is_required, display_order)
SELECT id, 'ニックネーム', 'text', false, 7 FROM cat;

-- 小学生専用: 年生
WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '基本情報' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, helper_text, display_order)
SELECT id, '年生', 'select', '[
  {"value": "1", "label": "1年生"},
  {"value": "2", "label": "2年生"},
  {"value": "3", "label": "3年生"},
  {"value": "4", "label": "4年生"},
  {"value": "5", "label": "5年生"},
  {"value": "6", "label": "6年生"}
]'::jsonb, false, '小学生以上のみ', 8 FROM cat;

-- ----------------------------------------------------------------------------
-- 【共通】睡眠の様子
-- ----------------------------------------------------------------------------
WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '睡眠の様子' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, display_order)
SELECT id, '睡眠の様子', 'checkbox', '[
  {"value": "snoring", "label": "いびき"},
  {"value": "fussy_sleep", "label": "寝ぐずり"},
  {"value": "fussy_wake", "label": "起きぐずり"},
  {"value": "frequent_waking", "label": "頻回起き"},
  {"value": "prone", "label": "うつ伏せ寝"},
  {"value": "supine", "label": "仰向け"},
  {"value": "side", "label": "横向き寝"}
]'::jsonb, false, 1 FROM cat;

-- 未就学児追加項目
WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '睡眠の様子' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, helper_text, display_order)
SELECT id, '睡眠の様子（未就学児追加）', 'checkbox', '[
  {"value": "night_crying", "label": "夜泣き"},
  {"value": "other", "label": "その他"}
]'::jsonb, false, '未就学児のみ表示', 2 FROM cat;

WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '睡眠の様子' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, is_required, helper_text, display_order)
SELECT id, '睡眠の様子その他', 'text', false, 'その他を選択した場合', 3 FROM cat;

-- ----------------------------------------------------------------------------
-- 【共通】睡眠時間
-- ----------------------------------------------------------------------------
WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '睡眠時間' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, display_order)
SELECT id, '就寝時間', 'select', '[
  {"value": "19", "label": "19時"},
  {"value": "20", "label": "20時"},
  {"value": "21", "label": "21時"},
  {"value": "22", "label": "22時"},
  {"value": "23", "label": "23時"},
  {"value": "undecided", "label": "決まっていない"}
]'::jsonb, false, 1 FROM cat;

WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '睡眠時間' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, display_order)
SELECT id, '規則正しい', 'radio', '[
  {"value": "yes", "label": "はい"},
  {"value": "no", "label": "いいえ"}
]'::jsonb, false, 2 FROM cat;

-- 未就学児追加: 昼寝関連
WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '睡眠時間' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, helper_text, display_order)
SELECT id, '昼寝の状況', 'checkbox', '[
  {"value": "morning_nap", "label": "朝寝"},
  {"value": "afternoon_nap", "label": "昼寝"},
  {"value": "evening_nap", "label": "夕寝"}
]'::jsonb, false, '未就学児のみ', 3 FROM cat;

-- ----------------------------------------------------------------------------
-- 【共通】習い事
-- ----------------------------------------------------------------------------
-- 未就学児用（選択式）
WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '習い事' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, helper_text, display_order)
SELECT id, '習い事（未就学児）', 'checkbox', '[
  {"value": "swimming", "label": "スイミング"},
  {"value": "gymnastics", "label": "体操"},
  {"value": "soccer", "label": "サッカー"},
  {"value": "baseball", "label": "野球"},
  {"value": "english", "label": "英語"},
  {"value": "other", "label": "その他"}
]'::jsonb, false, '未就学児用', 1 FROM cat;

WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '習い事' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, is_required, helper_text, display_order)
SELECT id, '習い事その他（未就学児）', 'text', false, 'その他を選んだ場合', 2 FROM cat;

-- 小学生用（自由記述）
WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '習い事' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, is_required, helper_text, display_order)
SELECT id, '習い事（小学生以上）', 'text', false, '小学生以上用・自由記述', 3 FROM cat;

-- ----------------------------------------------------------------------------
-- 【未就学児】きょうだい
-- ----------------------------------------------------------------------------
WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = 'きょうだい' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, display_order)
SELECT id, 'きょうだいの有無', 'radio', '[
  {"value": "none", "label": "いない"},
  {"value": "has", "label": "いる"}
]'::jsonb, false, 1 FROM cat;

WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = 'きょうだい' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, is_required, helper_text, display_order)
SELECT id, '何人目', 'number', false, 'いるを選んだ場合', 2 FROM cat;

-- ----------------------------------------------------------------------------
-- 【未就学児】スマホ・タブレット・TV視聴
-- ----------------------------------------------------------------------------
WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = 'スマホ・タブレット・TV視聴' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, display_order)
SELECT id, 'スマホ・タブレット・TVを見る頻度と時間', 'radio', '[
  {"value": "rarely", "label": "ほぼ見ない"},
  {"value": "under_30min", "label": "30分以内"},
  {"value": "under_1hour", "label": "1時間以内"},
  {"value": "over_1hour", "label": "それ以上"}
]'::jsonb, false, 1 FROM cat;

WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = 'スマホ・タブレット・TV視聴' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, is_required, helper_text, display_order)
SELECT id, '視聴時間（それ以上の場合）', 'number', false, 'それ以上を選んだ場合（時間）', 2 FROM cat;

-- ----------------------------------------------------------------------------
-- 【未就学児】食事について
-- ----------------------------------------------------------------------------
WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '食事について' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, display_order)
SELECT id, '食事について', 'checkbox', '[
  {"value": "picky", "label": "偏食"},
  {"value": "no_chewing", "label": "噛まない"},
  {"value": "cant_swallow", "label": "飲み込めない（吐き出す）"},
  {"value": "gulp", "label": "丸呑み食べ"},
  {"value": "large_bites", "label": "一口量が多い"},
  {"value": "fast_eating", "label": "食べるのが早い"},
  {"value": "slow_eating", "label": "食べるのが遅い"},
  {"value": "other", "label": "その他"}
]'::jsonb, false, 1 FROM cat;

WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '食事について' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, is_required, helper_text, display_order)
SELECT id, '食事についてその他', 'text', false, 'その他を選んだ場合', 2 FROM cat;

-- ----------------------------------------------------------------------------
-- 【未就学児】食べ物の好み
-- ----------------------------------------------------------------------------
WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '食べ物の好み' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, is_required, placeholder, display_order)
SELECT id, '嫌いな食べ物', 'textarea', false, '自由記述', 1 FROM cat;

WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '食べ物の好み' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, is_required, placeholder, display_order)
SELECT id, '好きな食べ物', 'textarea', false, '自由記述', 2 FROM cat;

-- ----------------------------------------------------------------------------
-- 【小学生以上】ゲーム・スマホ・タブレット・TV視聴
-- ----------------------------------------------------------------------------
WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = 'ゲーム・スマホ・タブレット・TV視聴' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, display_order)
SELECT id, 'ゲーム・スマホ・タブレット・TVを見る頻度と時間', 'radio', '[
  {"value": "rarely", "label": "ほぼ見ない"},
  {"value": "under_30min", "label": "30分以内"},
  {"value": "under_1hour", "label": "1時間以内"},
  {"value": "over_1hour", "label": "それ以上"}
]'::jsonb, false, 1 FROM cat;

WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = 'ゲーム・スマホ・タブレット・TV視聴' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, is_required, helper_text, display_order)
SELECT id, '視聴時間（それ以上の場合）', 'number', false, 'それ以上を選んだ場合（時間）', 2 FROM cat;

-- ----------------------------------------------------------------------------
-- 【小学生以上】気になること
-- ----------------------------------------------------------------------------
WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '気になること' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, display_order)
SELECT id, '気になること', 'checkbox', '[
  {"value": "mouth_open", "label": "お口がポカンと開いていることがある"},
  {"value": "teeth_worry", "label": "将来歯並びや噛み合わせが良くなるか不安"},
  {"value": "articulation", "label": "滑舌が悪いと感じることがある"},
  {"value": "posture", "label": "姿勢が悪いと感じる"},
  {"value": "sleep_position", "label": "ママとお子様の寝る位置が決まっている"},
  {"value": "night_waking", "label": "夜中に起きることがある"},
  {"value": "bedwetting", "label": "おねしょをする"},
  {"value": "tired_easily", "label": "すぐ「疲れた」と言う（体力がない）"},
  {"value": "restless", "label": "落ち着きがない"},
  {"value": "fast_eating", "label": "食べるのが早い（あまり噛んでいない）"},
  {"value": "large_bites", "label": "一口量が多かったり詰め込みたべをする"},
  {"value": "cant_sit_still", "label": "食事中じっとしていない"},
  {"value": "drink_during_meal", "label": "食事中よく水分をとる"},
  {"value": "tv_during_meal", "label": "食事中テレビがついている"},
  {"value": "picky_eater", "label": "好き嫌いが多い"},
  {"value": "w_sitting", "label": "割座（お姉さん座り）をする"},
  {"value": "often_sick", "label": "よく体調を崩す"},
  {"value": "other", "label": "その他"}
]'::jsonb, false, 1 FROM cat;

WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '気になること' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, is_required, helper_text, display_order)
SELECT id, '気になることその他', 'text', false, 'その他を選んだ場合', 2 FROM cat;

-- ----------------------------------------------------------------------------
-- 【共通】同意事項
-- ----------------------------------------------------------------------------
WITH cat AS (SELECT id FROM questionnaire_categories WHERE name = '同意事項' LIMIT 1)
INSERT INTO questionnaire_items (category_id, question, answer_type, options, is_required, helper_text, display_order)
SELECT id, '学会発表や資料作成のために症例写真の使用にご協力いただけますか？', 'radio', '[
  {"value": "yes", "label": "YES"},
  {"value": "no", "label": "NO"}
]'::jsonb, true, '※目元は隠し個人が特定されることはありません。', 1 FROM cat;
