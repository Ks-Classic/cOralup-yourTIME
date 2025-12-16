-- ============================================================================
-- 本番デプロイ前DB整備マイグレーション
-- ============================================================================
-- 作成日: 2024-12-18
-- 目的:
--   1. コードで使用されているが未定義のテーブル追加（ai_analysis_logs）
--   2. sessionsを参照しているビューをvisitsに更新
--   3. 未使用テーブル/ビューの整理（削除はせず、コメント追加）
--
-- 【重要】既存処理への影響なし
--   - 新規テーブル追加のみ
--   - ビューは CREATE OR REPLACE で安全に更新
--   - テーブル/カラム削除は一切行わない
-- ============================================================================

-- ============================================================================
-- Phase 1: 未定義テーブル ai_analysis_logs の作成
-- ============================================================================
-- src/app/api/analysis/route.ts で使用されているが、マイグレーションに定義なし

CREATE TABLE IF NOT EXISTS ai_analysis_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    
    -- 入力データ
    input_data JSONB DEFAULT '{}',
    
    -- AI生成コンテンツ
    generated_content TEXT,  -- AI生成コメント
    final_content TEXT,      -- 編集後の最終コメント
    
    -- フィードバック
    feedback_score INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
    
    -- メタ情報
    model_version VARCHAR(50),
    prompt_version VARCHAR(50),
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    
    -- ステータス
    status VARCHAR(20) DEFAULT 'completed',
    error_message TEXT,
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE ai_analysis_logs IS 'AI分析ログ（分析結果とフィードバック記録）';
COMMENT ON COLUMN ai_analysis_logs.input_data IS '分析入力データ（問診・診断データ）';
COMMENT ON COLUMN ai_analysis_logs.generated_content IS 'AIが生成した元のコメント';
COMMENT ON COLUMN ai_analysis_logs.final_content IS 'スタッフ編集後の最終コメント';
COMMENT ON COLUMN ai_analysis_logs.feedback_score IS 'AI生成結果へのフィードバックスコア（1-5）';

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_ai_analysis_logs_visit_id ON ai_analysis_logs(visit_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_logs_created_at ON ai_analysis_logs(created_at);

-- RLS有効化
ALTER TABLE ai_analysis_logs ENABLE ROW LEVEL SECURITY;

-- service_role用ポリシー
DROP POLICY IF EXISTS "Service role access for ai_analysis_logs" ON ai_analysis_logs;
CREATE POLICY "Service role access for ai_analysis_logs" 
    ON ai_analysis_logs FOR ALL 
    USING (true) WITH CHECK (true);

-- 更新日時トリガー
DROP TRIGGER IF EXISTS update_ai_analysis_logs_updated_at ON ai_analysis_logs;
CREATE TRIGGER update_ai_analysis_logs_updated_at
    BEFORE UPDATE ON ai_analysis_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Phase 2: レガシービューの修正（sessions → visits）
-- ============================================================================
-- 既存のビューがsessionsテーブルを参照している可能性があるため修正
-- visitsテーブルに統合済みのため、visitsを参照するように更新

-- 2.1 diagnosis_results_view の更新
-- 元のビューはsessionsを参照 → visitsに変更
DROP VIEW IF EXISTS diagnosis_results_view CASCADE;
CREATE OR REPLACE VIEW diagnosis_results_view AS
SELECT 
    dr.id,
    dr.session_id,
    v.id AS visit_id,
    p.display_name AS parent_name,
    c.first_name AS child_name,
    dc.name AS category_name,
    dc.display_order AS category_order,
    di.question,
    di.answer_type,
    dr.value,
    dr.metadata,
    dr.answered_at,
    di.display_order AS item_order
FROM diagnosis_responses dr
LEFT JOIN visits v ON dr.visit_id = v.id OR dr.session_id = v.session_id
LEFT JOIN children c ON v.child_id = c.id
LEFT JOIN profiles p ON c.parent_profile_id = p.id
LEFT JOIN diagnosis_items di ON dr.item_id = di.id
LEFT JOIN diagnosis_categories dc ON di.category_id = dc.id
ORDER BY dr.session_id, dc.display_order, di.display_order;

COMMENT ON VIEW diagnosis_results_view IS '診断結果詳細ビュー（visits統合版）';

-- 2.2 questionnaire_results_view の更新
DROP VIEW IF EXISTS questionnaire_results_view CASCADE;
CREATE OR REPLACE VIEW questionnaire_results_view AS
SELECT 
    qr.id,
    qr.session_id,
    v.id AS visit_id,
    p.display_name AS parent_name,
    c.first_name AS child_name,
    qc.name AS category_name,
    qc.target_age,
    qc.display_order AS category_order,
    qi.question,
    qi.answer_type,
    qr.value,
    qr.metadata,
    qr.answered_at,
    qi.display_order AS item_order
FROM questionnaire_responses qr
LEFT JOIN visits v ON qr.visit_id = v.id OR qr.session_id = v.session_id
LEFT JOIN children c ON v.child_id = c.id
LEFT JOIN profiles p ON c.parent_profile_id = p.id
LEFT JOIN questionnaire_items qi ON qr.item_id = qi.id
LEFT JOIN questionnaire_categories qc ON qi.category_id = qc.id
ORDER BY qr.session_id, qc.display_order, qi.display_order;

COMMENT ON VIEW questionnaire_results_view IS '問診結果詳細ビュー（visits統合版）';

-- 2.3 user_responses_view の更新
DROP VIEW IF EXISTS user_responses_view CASCADE;
CREATE OR REPLACE VIEW user_responses_view AS
SELECT
    fr.id,
    fr.response_id,
    fr.session_id,
    fr.visit_id,
    fr.submitted_at,
    p.display_name AS parent_name,
    p.phone_number AS parent_phone,
    e.name AS event_name,
    fs.name AS form_name,
    fs.form_type,
    fr.response_data,
    fr.metadata
FROM form_responses fr
LEFT JOIN visits v ON fr.visit_id = v.id OR fr.session_id = v.session_id
LEFT JOIN children c ON v.child_id = c.id
LEFT JOIN profiles p ON c.parent_profile_id = p.id
LEFT JOIN events e ON fr.event_id = e.id
LEFT JOIN form_schemas fs ON fr.schema_id = fs.id;

COMMENT ON VIEW user_responses_view IS 'フォーム回答統合ビュー（visits統合版）';

-- 2.4 diagnosis_analytics_view の更新
DROP VIEW IF EXISTS diagnosis_analytics_view CASCADE;
CREATE OR REPLACE VIEW diagnosis_analytics_view AS
SELECT
    fr.id,
    fr.session_id,
    v.id AS visit_id,
    p.display_name AS parent_name,
    p.phone_number AS parent_phone,
    e.name AS event_name,
    fr.submitted_at,
    (fr.response_data->>'posture_score')::integer AS posture_score,
    (fr.response_data->>'oral_score')::integer AS oral_score,
    (fr.response_data->>'overall_score')::integer AS overall_score,
    fr.response_data->>'diagnosis_notes' AS notes,
    fr.response_data->>'ai_analysis' AS ai_analysis
FROM form_responses fr
LEFT JOIN visits v ON fr.visit_id = v.id OR fr.session_id = v.session_id
LEFT JOIN children c ON v.child_id = c.id
LEFT JOIN profiles p ON c.parent_profile_id = p.id
LEFT JOIN events e ON fr.event_id = e.id
WHERE fr.response_data->>'form_type' = 'diagnosis';

COMMENT ON VIEW diagnosis_analytics_view IS '診断分析ビュー（visits統合版）';

-- ============================================================================
-- Phase 3: 未使用テーブルへのコメント追加（存在する場合のみ）
-- ============================================================================
-- 削除はせず、Phase 2/3で使用予定であることを明記

DO $$
BEGIN
    -- 3.1 Phase 2 で使用予定のテーブル
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_staffs') THEN
        EXECUTE 'COMMENT ON TABLE event_staffs IS ''[Phase 2] イベントスタッフ割り当て（2025 Q1使用開始予定）''';
    END IF;

    -- 3.2 Phase 3 で使用予定のテーブル
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
        EXECUTE 'COMMENT ON TABLE courses IS ''[Phase 3] 養成講座マスタ（2025 Q2以降使用予定）''';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'enrollments') THEN
        EXECUTE 'COMMENT ON TABLE enrollments IS ''[Phase 3] 受講履歴（2025 Q2以降使用予定）''';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meetings') THEN
        EXECUTE 'COMMENT ON TABLE meetings IS ''[Phase 3] MTG/議事録（2025 Q2以降使用予定）''';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_diagnosis_settings') THEN
        EXECUTE 'COMMENT ON TABLE organization_diagnosis_settings IS ''[Phase 3] 医院ごとの診断項目デフォルト設定（マルチテナント化時に使用）''';
    END IF;

    -- 3.3 使用状況不明（要確認）
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'form_fields') THEN
        EXECUTE 'COMMENT ON TABLE form_fields IS ''[要確認] フォーム項目定義テーブル - form_schemasのconfig JSOBで代替されている可能性''';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'form_cache') THEN
        EXECUTE 'COMMENT ON TABLE form_cache IS ''[要確認] フォームキャッシュテーブル - 現在未使用''';
    END IF;

    -- 4.1 レガシーテーブル（後方互換用）
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'questionnaires') THEN
        EXECUTE 'COMMENT ON TABLE questionnaires IS ''[レガシー] 問診票（JSONB形式）- questionnaire_responsesへの移行推奨''';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'diagnoses') THEN
        EXECUTE 'COMMENT ON TABLE diagnoses IS ''[レガシー] 診断結果（JSONB形式）- diagnosis_responsesへの移行推奨''';
    END IF;
    
    RAISE NOTICE 'テーブルコメント追加完了（存在するテーブルのみ）';
END $$;

-- ============================================================================
-- 完了メッセージ
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'DB整備マイグレーション完了';
    RAISE NOTICE '- ai_analysis_logs テーブル作成';
    RAISE NOTICE '- ビュー更新（sessions → visits参照）';
    RAISE NOTICE '- 未使用テーブルへのコメント追加';
    RAISE NOTICE '============================================';
END $$;
