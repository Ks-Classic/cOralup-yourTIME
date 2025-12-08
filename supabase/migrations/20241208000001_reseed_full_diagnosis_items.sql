-- 完全な診断項目データの再投入（修正版: analysis_useカラム除外）
-- 既存のデータをクリア
TRUNCATE TABLE diagnosis_items CASCADE;
TRUNCATE TABLE diagnosis_categories CASCADE;

-- カテゴリの挿入
INSERT INTO diagnosis_categories (name, display_order, is_active) VALUES
('習癖', 1, true),
('舌', 2, true),
('歯列・咬合', 3, true),
('口唇', 4, true),
('鼻・扁桃', 5, true),
('顔面・頚部', 6, true),
('呼吸', 7, true),
('嚥下', 8, true),
('食習慣', 9, true),
('睡眠', 10, true),
('足', 11, true),
('全身', 12, true),
('姿勢', 13, true),
('靴', 14, true),
('機能検査', 15, true),
('サーモグラフ', 16, true);

-- 項目の挿入
-- カテゴリIDを取得しやすくするためサブクエリを使用します。
WITH cats AS (SELECT id, name FROM diagnosis_categories)
INSERT INTO diagnosis_items (category_id, question, answer_type, options, is_required, input_type, note, placeholder, unit, min_value, max_value, is_active, display_order) VALUES
-- 習癖（保護者）
((SELECT id FROM cats WHERE name = '習癖'), '指しゃぶり', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 1),
((SELECT id FROM cats WHERE name = '習癖'), 'おしゃぶり', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 2),
((SELECT id FROM cats WHERE name = '習癖'), '爪噛', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 3),
((SELECT id FROM cats WHERE name = '習癖'), '口ぽかん', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 4),
((SELECT id FROM cats WHERE name = '習癖'), '向き癖', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 5),
((SELECT id FROM cats WHERE name = '習癖'), '食いしばり', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 6),
((SELECT id FROM cats WHERE name = '習癖'), '割座', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 7),
((SELECT id FROM cats WHERE name = '習癖'), '歯ぎしり', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 8),
((SELECT id FROM cats WHERE name = '習癖'), 'その他', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 9),

-- 舌（スタッフ）
((SELECT id FROM cats WHERE name = '舌'), '舌小帯短縮症', 'radio', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 1),
((SELECT id FROM cats WHERE name = '舌'), 'ハート舌', 'radio', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 2),
((SELECT id FROM cats WHERE name = '舌'), '舌圧痕', 'radio', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 3),
((SELECT id FROM cats WHERE name = '舌'), '上下運動', 'radio', '[{"value": "possible", "label": "可能"}, {"value": "difficult", "label": "困難"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 4),
((SELECT id FROM cats WHERE name = '舌'), '低位舌', 'radio', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 5),
((SELECT id FROM cats WHERE name = '舌'), '舌下静脈怒張', 'radio', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 6),
((SELECT id FROM cats WHERE name = '舌'), '吸い上げ', 'radio', '[{"value": "front", "label": "前"}, {"value": "center", "label": "中央"}, {"value": "back", "label": "奥"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 7),
((SELECT id FROM cats WHERE name = '舌'), '吸い上げ保持', 'radio', '[{"value": "possible", "label": "可能"}, {"value": "difficult", "label": "困難"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 8),

-- 歯列・咬合（スタッフ）
((SELECT id FROM cats WHERE name = '歯列・咬合'), '正常', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 1),
((SELECT id FROM cats WHERE name = '歯列・咬合'), '過蓋合', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 2),
((SELECT id FROM cats WHERE name = '歯列・咬合'), 'かいこう', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 3),
((SELECT id FROM cats WHERE name = '歯列・咬合'), '反対咬合', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 4),
((SELECT id FROM cats WHERE name = '歯列・咬合'), '叢生', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 5),

-- 口唇（スタッフ）
((SELECT id FROM cats WHERE name = '口唇'), '口唇閉鎖', 'radio', '[{"value": "possible", "label": "可"}, {"value": "impossible", "label": "不可"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 1),
((SELECT id FROM cats WHERE name = '口唇'), '上唇小帯異常', 'radio', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 2),
((SELECT id FROM cats WHERE name = '口唇'), '上唇翻転', 'radio', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 3),
((SELECT id FROM cats WHERE name = '口唇'), '口唇圧', 'number', NULL, false, 'staff', '実施できない場合は「不可」の項目', '例: 2.5', 'kg', NULL, NULL, true, 4),

-- 鼻・扁桃
((SELECT id FROM cats WHERE name = '鼻・扁桃'), '鼻づまり', 'radio', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 1),
((SELECT id FROM cats WHERE name = '鼻・扁桃'), 'アレルギー', 'radio', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 2),
((SELECT id FROM cats WHERE name = '鼻・扁桃'), '扁桃腺肥大', 'radio', '[{"value": "normal", "label": "正常"}, {"value": "degree1", "label": "肥大1度"}, {"value": "degree2", "label": "肥大2度"}, {"value": "degree3", "label": "肥大3度"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 3),

-- 顔面・頚部（スタッフ）
((SELECT id FROM cats WHERE name = '顔面・頚部'), '目の下のクマ', 'radio', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 1),
((SELECT id FROM cats WHERE name = '顔面・頚部'), '左右差', 'radio', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 2),
((SELECT id FROM cats WHERE name = '顔面・頚部'), 'イー：中顔面', 'radio', '[{"value": "normal", "label": "普通"}, {"value": "hard", "label": "硬い"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 3),
((SELECT id FROM cats WHERE name = '顔面・頚部'), '口角下制筋', 'radio', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 4),
((SELECT id FROM cats WHERE name = '顔面・頚部'), '広頚筋緊張', 'radio', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 5),

-- 呼吸（スタッフ）
((SELECT id FROM cats WHERE name = '呼吸'), '口呼吸・鼻呼吸', 'radio', '[{"value": "mouth", "label": "口呼吸"}, {"value": "nose", "label": "鼻呼吸"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 1),

-- 嚥下（スタッフ）
((SELECT id FROM cats WHERE name = '嚥下'), '舌突出癖', 'radio', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 1),
((SELECT id FROM cats WHERE name = '嚥下'), 'オトガイ筋収縮', 'radio', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 2),


-- 食習慣（保護者）
((SELECT id FROM cats WHERE name = '食習慣'), '偏食', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 1),
((SELECT id FROM cats WHERE name = '食習慣'), '丸のみ', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 2),
((SELECT id FROM cats WHERE name = '食習慣'), '噛まない', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 3),
((SELECT id FROM cats WHERE name = '食習慣'), '飲みこまない', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 4),
((SELECT id FROM cats WHERE name = '食習慣'), 'TV見ながら食事', 'checkbox', '[{"value": "yes", "label": "TV有"}, {"value": "no", "label": "TV無"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 5),
((SELECT id FROM cats WHERE name = '食習慣'), 'TV位置', 'checkbox', '[{"value": "front", "label": "正面"}, {"value": "right", "label": "右"}, {"value": "left", "label": "左"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 6),


-- 睡眠（保護者）
((SELECT id FROM cats WHERE name = '睡眠'), 'いびき・歯ぎしり', 'checkbox', '[{"value": "grinding_yes", "label": "歯ぎしり(有)"}, {"value": "grinding_no", "label": "歯ぎしり(無)"}, {"value": "apnea_yes", "label": "睡眠時無呼吸(有)"}, {"value": "apnea_no", "label": "睡眠時無呼吸(無)"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 1),
((SELECT id FROM cats WHERE name = '睡眠'), '起床時の呼吸', 'radio', '[{"value": "nose", "label": "鼻"}, {"value": "mouth", "label": "口"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 2),
((SELECT id FROM cats WHERE name = '睡眠'), '昼間の状態', 'radio', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'parent', NULL, NULL, NULL, NULL, NULL, true, 3),

-- 足（スタッフ）
((SELECT id FROM cats WHERE name = '足'), '外反足', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', '4歳以下は一概に判断できないので、参考程度の表現にとどめる', NULL, NULL, NULL, NULL, true, 1),
((SELECT id FROM cats WHERE name = '足'), '寝指', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', '4歳以下は一概に判断できないので、参考程度の表現にとどめる', NULL, NULL, NULL, NULL, true, 2),
((SELECT id FROM cats WHERE name = '足'), '浮指', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', '4歳以下は一概に判断できないので、参考程度の表現にとどめる', NULL, NULL, NULL, NULL, true, 3),
((SELECT id FROM cats WHERE name = '足'), '外反母趾', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', '4歳以下は一概に判断できないので、参考程度の表現にとどめる', NULL, NULL, NULL, NULL, true, 4),
((SELECT id FROM cats WHERE name = '足'), '扁平足', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', '4歳以下は一概に判断できないので、参考程度の表現にとどめる', NULL, NULL, NULL, NULL, true, 5),
((SELECT id FROM cats WHERE name = '足'), 'ハイアーチ', 'checkbox', '[{"value": "yes", "label": "有"}, {"value": "no", "label": "無"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 6),

-- 全身（スタッフ）
((SELECT id FROM cats WHERE name = '全身'), '正面間', 'radio', '[{"value": "symmetric", "label": "左右対称"}, {"value": "asymmetric", "label": "非対称"}]', false, 'staff', '写真が撮れなかったときに記載', NULL, NULL, NULL, NULL, true, 1),

-- 姿勢（スタッフ）
((SELECT id FROM cats WHERE name = '姿勢'), '骨盤', 'radio', '[{"value": "posterior", "label": "後傾"}, {"value": "neutral", "label": "ニュートラル"}, {"value": "anterior", "label": "前傾"}]', false, 'staff', '写真が撮れなかったときに記載', NULL, NULL, NULL, NULL, true, 1),
((SELECT id FROM cats WHERE name = '姿勢'), '軸', 'radio', '[{"value": "straight", "label": "まっすぐ"}, {"value": "swayback", "label": "反り腰"}, {"value": "kyphosis", "label": "猫背"}]', false, 'staff', '写真が撮れなかったときに記載', NULL, NULL, NULL, NULL, true, 2),
((SELECT id FROM cats WHERE name = '姿勢'), '頭位', 'radio', '[{"value": "normal", "label": "正常"}, {"value": "forward", "label": "フォワードヘッド"}]', false, 'staff', '写真が撮れなかったときに記載', NULL, NULL, NULL, NULL, true, 3),
((SELECT id FROM cats WHERE name = '姿勢'), '下肢', 'radio', '[{"value": "normal", "label": "正常"}, {"value": "bow", "label": "O脚"}, {"value": "knock", "label": "X脚"}]', false, 'staff', '写真が撮れなかったときに記載', NULL, NULL, NULL, NULL, true, 4),

-- 靴（スタッフ）
((SELECT id FROM cats WHERE name = '靴'), 'メーカー', 'text', NULL, false, 'staff', 'お出かけ用の場合は不要', '例: ナイキ', NULL, NULL, NULL, true, 1),
((SELECT id FROM cats WHERE name = '靴'), '靴の固定', 'radio', '[{"value": "tape", "label": "テープ"}, {"value": "none", "label": "無"}, {"value": "yes", "label": "有"}]', false, 'staff', 'お出かけ用の場合は不要', NULL, NULL, NULL, NULL, true, 2),
((SELECT id FROM cats WHERE name = '靴'), 'サイズアウト', 'radio', '[{"value": "no", "label": "無"}, {"value": "yes", "label": "有"}]', false, 'staff', 'お出かけ用の場合は不要', NULL, NULL, NULL, NULL, true, 3),
((SELECT id FROM cats WHERE name = '靴'), 'ソールの減り', 'radio', '[{"value": "no", "label": "無"}, {"value": "yes", "label": "有"}]', false, 'staff', 'お出かけ用の場合は不要', NULL, NULL, NULL, NULL, true, 4),

-- 機能検査（スタッフ）
((SELECT id FROM cats WHERE name = '機能検査'), 'ストレッチボード', 'radio', '[{"value": "20", "label": "20度"}, {"value": "30", "label": "30度"}, {"value": "40", "label": "40度"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 1),

-- サーモグラフ（スタッフ）
((SELECT id FROM cats WHERE name = 'サーモグラフ'), '足指', 'radio', '[{"value": "visible", "label": "写る"}, {"value": "not_visible", "label": "写らない"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 1),
((SELECT id FROM cats WHERE name = 'サーモグラフ'), '重心位置', 'radio', '[{"value": "center", "label": "中央"}, {"value": "right", "label": "右"}, {"value": "left", "label": "左"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 2),
((SELECT id FROM cats WHERE name = 'サーモグラフ'), '偏平足', 'radio', '[{"value": "no", "label": "無"}, {"value": "yes", "label": "有"}]', true, 'staff', NULL, NULL, NULL, NULL, NULL, true, 3);
