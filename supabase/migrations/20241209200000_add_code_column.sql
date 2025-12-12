-- ============================================================================
-- codeカラム追加マイグレーション
-- ============================================================================
-- 作成日: 2024-12-10
-- 説明: 診断・問診のカテゴリ/項目にcodeカラムを追加
--       分析・外部連携・アプリケーション参照用の安定識別子
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 診断カテゴリにcodeカラム追加
-- ----------------------------------------------------------------------------
ALTER TABLE diagnosis_categories 
ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;

COMMENT ON COLUMN diagnosis_categories.code IS 'システム参照用コード（分析・API連携で使用）';

-- ----------------------------------------------------------------------------
-- 2. 診断項目にcodeカラム追加
-- ----------------------------------------------------------------------------
ALTER TABLE diagnosis_items 
ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;

COMMENT ON COLUMN diagnosis_items.code IS 'システム参照用コード（分析・API連携で使用）';

-- ----------------------------------------------------------------------------
-- 3. 問診カテゴリにcodeカラム追加
-- ----------------------------------------------------------------------------
ALTER TABLE questionnaire_categories 
ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;

COMMENT ON COLUMN questionnaire_categories.code IS 'システム参照用コード（分析・API連携で使用）';

-- ----------------------------------------------------------------------------
-- 4. 問診項目にcodeカラム追加
-- ----------------------------------------------------------------------------
ALTER TABLE questionnaire_items 
ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;

COMMENT ON COLUMN questionnaire_items.code IS 'システム参照用コード（分析・API連携で使用）';

-- ----------------------------------------------------------------------------
-- 5. インデックス追加
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_diagnosis_categories_code 
  ON diagnosis_categories(code) WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_diagnosis_items_code 
  ON diagnosis_items(code) WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_questionnaire_categories_code 
  ON questionnaire_categories(code) WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_questionnaire_items_code 
  ON questionnaire_items(code) WHERE code IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 6. 既存診断カテゴリにcode値を設定
-- ----------------------------------------------------------------------------
UPDATE diagnosis_categories SET code = 'habit' WHERE name = '習癖';
UPDATE diagnosis_categories SET code = 'tongue' WHERE name = '舌';
UPDATE diagnosis_categories SET code = 'dentition' WHERE name = '歯列・咬合';
UPDATE diagnosis_categories SET code = 'lips' WHERE name = '口唇';
UPDATE diagnosis_categories SET code = 'nose_tonsil' WHERE name = '鼻・扁桃';
UPDATE diagnosis_categories SET code = 'face_neck' WHERE name = '顔面・頚部';
UPDATE diagnosis_categories SET code = 'breathing' WHERE name = '呼吸';
UPDATE diagnosis_categories SET code = 'swallowing' WHERE name = '嚥下';
UPDATE diagnosis_categories SET code = 'eating_habit' WHERE name = '食習慣';
UPDATE diagnosis_categories SET code = 'sleep' WHERE name = '睡眠';
UPDATE diagnosis_categories SET code = 'foot' WHERE name = '足';
UPDATE diagnosis_categories SET code = 'whole_body' WHERE name = '全身';
UPDATE diagnosis_categories SET code = 'posture' WHERE name = '姿勢';
UPDATE diagnosis_categories SET code = 'shoes' WHERE name = '靴';
UPDATE diagnosis_categories SET code = 'function_test' WHERE name = '機能検査';
UPDATE diagnosis_categories SET code = 'thermograph' WHERE name = 'サーモグラフ';

-- ----------------------------------------------------------------------------
-- 7. 既存診断項目にcode値を設定
-- ----------------------------------------------------------------------------
-- 習癖
UPDATE diagnosis_items SET code = 'habit_thumb_sucking' WHERE question = '指しゃぶり';
UPDATE diagnosis_items SET code = 'habit_pacifier' WHERE question = 'おしゃぶり';
UPDATE diagnosis_items SET code = 'habit_nail_biting' WHERE question = '爪噛';
UPDATE diagnosis_items SET code = 'habit_mouth_open' WHERE question = '口ぽかん';
UPDATE diagnosis_items SET code = 'habit_head_tilt' WHERE question = '向き癖';
UPDATE diagnosis_items SET code = 'habit_clenching' WHERE question = '食いしばり';
UPDATE diagnosis_items SET code = 'habit_w_sitting' WHERE question = '割座';
UPDATE diagnosis_items SET code = 'habit_grinding' WHERE question = '歯ぎしり';
UPDATE diagnosis_items SET code = 'habit_other' WHERE question = 'その他' AND category_id = (SELECT id FROM diagnosis_categories WHERE code = 'habit');

-- 舌
UPDATE diagnosis_items SET code = 'tongue_tie' WHERE question = '舌小帯短縮症';
UPDATE diagnosis_items SET code = 'tongue_heart' WHERE question = 'ハート舌';
UPDATE diagnosis_items SET code = 'tongue_scalloped' WHERE question = '舌圧痕';
UPDATE diagnosis_items SET code = 'tongue_vertical_movement' WHERE question = '上下運動';
UPDATE diagnosis_items SET code = 'tongue_low_position' WHERE question = '低位舌';
UPDATE diagnosis_items SET code = 'tongue_sublingual_vein' WHERE question = '舌下静脈怒張';
UPDATE diagnosis_items SET code = 'tongue_suction' WHERE question = '吸い上げ';
UPDATE diagnosis_items SET code = 'tongue_suction_hold' WHERE question = '吸い上げ保持';

-- 歯列・咬合
UPDATE diagnosis_items SET code = 'dentition_normal' WHERE question = '正常' AND category_id = (SELECT id FROM diagnosis_categories WHERE code = 'dentition');
UPDATE diagnosis_items SET code = 'dentition_deep_bite' WHERE question = '過蓋合';
UPDATE diagnosis_items SET code = 'dentition_open_bite' WHERE question = 'かいこう';
UPDATE diagnosis_items SET code = 'dentition_crossbite' WHERE question = '反対咬合';
UPDATE diagnosis_items SET code = 'dentition_crowding' WHERE question = '叢生';

-- 口唇
UPDATE diagnosis_items SET code = 'lips_closure' WHERE question = '口唇閉鎖';
UPDATE diagnosis_items SET code = 'lips_frenulum' WHERE question = '上唇小帯異常';
UPDATE diagnosis_items SET code = 'lips_eversion' WHERE question = '上唇翻転';
UPDATE diagnosis_items SET code = 'lips_pressure' WHERE question = '口唇圧';

-- 鼻・扁桃
UPDATE diagnosis_items SET code = 'nose_congestion' WHERE question = '鼻づまり';
UPDATE diagnosis_items SET code = 'nose_allergy' WHERE question = 'アレルギー';
UPDATE diagnosis_items SET code = 'tonsil_hypertrophy' WHERE question = '扁桃腺肥大';

-- 顔面・頚部
UPDATE diagnosis_items SET code = 'face_dark_circles' WHERE question = '目の下のクマ';
UPDATE diagnosis_items SET code = 'face_asymmetry' WHERE question = '左右差';
UPDATE diagnosis_items SET code = 'face_midface' WHERE question = 'イー：中顔面';
UPDATE diagnosis_items SET code = 'face_depressor' WHERE question = '口角下制筋';
UPDATE diagnosis_items SET code = 'neck_platysma' WHERE question = '広頚筋緊張';

-- 呼吸
UPDATE diagnosis_items SET code = 'breathing_type' WHERE question = '口呼吸・鼻呼吸';

-- 嚥下
UPDATE diagnosis_items SET code = 'swallow_tongue_thrust' WHERE question = '舌突出癖';
UPDATE diagnosis_items SET code = 'swallow_mentalis' WHERE question = 'オトガイ筋収縮';

-- 食習慣
UPDATE diagnosis_items SET code = 'eating_picky' WHERE question = '偏食';
UPDATE diagnosis_items SET code = 'eating_gulp' WHERE question = '丸のみ';
UPDATE diagnosis_items SET code = 'eating_no_chew' WHERE question = '噛まない';
UPDATE diagnosis_items SET code = 'eating_no_swallow' WHERE question = '飲みこまない';
UPDATE diagnosis_items SET code = 'eating_tv' WHERE question = 'TV見ながら食事';
UPDATE diagnosis_items SET code = 'eating_tv_position' WHERE question = 'TV位置';

-- 睡眠
UPDATE diagnosis_items SET code = 'sleep_snoring_grinding' WHERE question = 'いびき・歯ぎしり';
UPDATE diagnosis_items SET code = 'sleep_wakeup_breathing' WHERE question = '起床時の呼吸';
UPDATE diagnosis_items SET code = 'sleep_daytime' WHERE question = '昼間の状態';

-- 足
UPDATE diagnosis_items SET code = 'foot_valgus' WHERE question = '外反足';
UPDATE diagnosis_items SET code = 'foot_sleeping_toe' WHERE question = '寝指';
UPDATE diagnosis_items SET code = 'foot_floating_toe' WHERE question = '浮指';
UPDATE diagnosis_items SET code = 'foot_bunion' WHERE question = '外反母趾';
UPDATE diagnosis_items SET code = 'foot_flat' WHERE question = '扁平足';
UPDATE diagnosis_items SET code = 'foot_high_arch' WHERE question = 'ハイアーチ';

-- 全身
UPDATE diagnosis_items SET code = 'body_front_symmetry' WHERE question = '正面間';

-- 姿勢
UPDATE diagnosis_items SET code = 'posture_pelvis' WHERE question = '骨盤';
UPDATE diagnosis_items SET code = 'posture_axis' WHERE question = '軸';
UPDATE diagnosis_items SET code = 'posture_head' WHERE question = '頭位';
UPDATE diagnosis_items SET code = 'posture_legs' WHERE question = '下肢';

-- 靴
UPDATE diagnosis_items SET code = 'shoes_brand' WHERE question = 'メーカー';
UPDATE diagnosis_items SET code = 'shoes_fastening' WHERE question = '靴の固定';
UPDATE diagnosis_items SET code = 'shoes_outgrown' WHERE question = 'サイズアウト';
UPDATE diagnosis_items SET code = 'shoes_sole_wear' WHERE question = 'ソールの減り';

-- 機能検査
UPDATE diagnosis_items SET code = 'test_stretch_board' WHERE question = 'ストレッチボード';

-- サーモグラフ
UPDATE diagnosis_items SET code = 'thermo_toe' WHERE question = '足指' AND category_id = (SELECT id FROM diagnosis_categories WHERE code = 'thermograph');
UPDATE diagnosis_items SET code = 'thermo_center_of_gravity' WHERE question = '重心位置';
UPDATE diagnosis_items SET code = 'thermo_flat_foot' WHERE question = '偏平足';

-- ----------------------------------------------------------------------------
-- 8. 問診項目にcode値を設定
-- ----------------------------------------------------------------------------
-- 基本情報
UPDATE questionnaire_items SET code = 'basic_furigana' WHERE question = 'ふりがな';
UPDATE questionnaire_items SET code = 'basic_name' WHERE question = 'お名前';
UPDATE questionnaire_items SET code = 'basic_birthday' WHERE question = '生年月日';
UPDATE questionnaire_items SET code = 'basic_prefecture' WHERE question = 'お住まいの都道府県';
UPDATE questionnaire_items SET code = 'basic_gender' WHERE question = '性別';
UPDATE questionnaire_items SET code = 'basic_age' WHERE question = '年齢';
UPDATE questionnaire_items SET code = 'basic_nickname' WHERE question = 'ニックネーム';
UPDATE questionnaire_items SET code = 'basic_grade' WHERE question = '年生';

-- 睡眠の様子
UPDATE questionnaire_items SET code = 'sleep_status_main' WHERE question = '睡眠の様子';
UPDATE questionnaire_items SET code = 'sleep_status_preschool' WHERE question = '睡眠の様子（未就学児追加）';
UPDATE questionnaire_items SET code = 'sleep_status_other' WHERE question = '睡眠の様子その他';

-- 睡眠時間
UPDATE questionnaire_items SET code = 'sleep_bedtime' WHERE question = '就寝時間';
UPDATE questionnaire_items SET code = 'sleep_regular' WHERE question = '規則正しい';
UPDATE questionnaire_items SET code = 'sleep_nap' WHERE question = '昼寝の状況';

-- 習い事
UPDATE questionnaire_items SET code = 'lessons_preschool' WHERE question = '習い事（未就学児）';
UPDATE questionnaire_items SET code = 'lessons_preschool_other' WHERE question = '習い事その他（未就学児）';
UPDATE questionnaire_items SET code = 'lessons_elementary' WHERE question = '習い事（小学生以上）';

-- きょうだい
UPDATE questionnaire_items SET code = 'siblings_has' WHERE question = 'きょうだいの有無';
UPDATE questionnaire_items SET code = 'siblings_order' WHERE question = '何人目';

-- スマホ・タブレット・TV視聴（未就学児）
UPDATE questionnaire_items SET code = 'screen_preschool_freq' WHERE question = 'スマホ・タブレット・TVを見る頻度と時間';
UPDATE questionnaire_items SET code = 'screen_preschool_hours' 
  WHERE question = '視聴時間（それ以上の場合）' 
  AND category_id = (SELECT id FROM questionnaire_categories WHERE code = 'screen_time_preschool');

-- 食事について
UPDATE questionnaire_items SET code = 'eating_issues' WHERE question = '食事について';
UPDATE questionnaire_items SET code = 'eating_other' WHERE question = '食事についてその他';

-- 食べ物の好み
UPDATE questionnaire_items SET code = 'food_dislike' WHERE question = '嫌いな食べ物';
UPDATE questionnaire_items SET code = 'food_like' WHERE question = '好きな食べ物';

-- ゲーム・スマホ・タブレット・TV視聴（小学生）
UPDATE questionnaire_items SET code = 'screen_elementary_freq' WHERE question = 'ゲーム・スマホ・タブレット・TVを見る頻度と時間';
UPDATE questionnaire_items SET code = 'screen_elementary_hours' 
  WHERE question = '視聴時間（それ以上の場合）' 
  AND category_id = (SELECT id FROM questionnaire_categories WHERE code = 'screen_time_elementary');

-- 気になること
UPDATE questionnaire_items SET code = 'concerns_main' WHERE question = '気になること';
UPDATE questionnaire_items SET code = 'concerns_other' WHERE question = '気になることその他';

-- 同意事項
UPDATE questionnaire_items SET code = 'consent_photo' WHERE question LIKE '%学会発表%';

