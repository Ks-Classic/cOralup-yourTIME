-- ============================================
-- 追加テーブル: visit_photos, ai_analysis_results, line_message_logs
-- 本番テストフロー仕様書で必要なテーブル
-- ============================================

-- ============================================
-- 1. visit_photos (写真管理)
-- ============================================
CREATE TABLE IF NOT EXISTS visit_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    session_id VARCHAR(10) REFERENCES sessions(session_id),
    photo_type VARCHAR(50) NOT NULL, -- posture_front, posture_side, oral_front, oral_side, oral_closeup
    storage_path TEXT NOT NULL,
    public_url TEXT,
    file_size INTEGER,
    mime_type VARCHAR(50),
    width INTEGER,
    height INTEGER,
    metadata JSONB DEFAULT '{}',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_visit_photos_visit_id ON visit_photos(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_photos_session_id ON visit_photos(session_id);
CREATE INDEX IF NOT EXISTS idx_visit_photos_photo_type ON visit_photos(photo_type);

-- RLS
ALTER TABLE visit_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage visit_photos"
    ON visit_photos FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE visit_photos IS '診断時の写真管理テーブル';
COMMENT ON COLUMN visit_photos.photo_type IS '写真種別: posture_front, posture_side, oral_front, oral_side, oral_closeup';

-- ============================================
-- 2. ai_analysis_results (AI分析結果)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    session_id VARCHAR(10) REFERENCES sessions(session_id),
    
    -- AI生成コンテンツ
    summary TEXT, -- 総合サマリー
    detailed_analysis JSONB DEFAULT '{}', -- 詳細分析結果
    improvement_suggestions JSONB DEFAULT '[]', -- 改善提案リスト
    next_steps JSONB DEFAULT '[]', -- 次のステップ
    encouragement_message TEXT, -- 励ましメッセージ
    
    -- スタッフ編集
    staff_edited BOOLEAN DEFAULT FALSE,
    staff_edited_summary TEXT,
    staff_edited_at TIMESTAMP WITH TIME ZONE,
    staff_profile_id UUID REFERENCES profiles(id),
    
    -- メタ情報
    model_version VARCHAR(50), -- 使用したAIモデル
    prompt_version VARCHAR(50), -- プロンプトバージョン
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    
    -- ステータス
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_ai_analysis_results_visit_id ON ai_analysis_results(visit_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_results_session_id ON ai_analysis_results(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_results_status ON ai_analysis_results(status);

-- RLS
ALTER TABLE ai_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage ai_analysis_results"
    ON ai_analysis_results FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE ai_analysis_results IS 'AI分析結果テーブル';
COMMENT ON COLUMN ai_analysis_results.staff_edited IS 'スタッフが編集したかどうか';

-- ============================================
-- 3. line_message_logs (LINE送信ログ)
-- ============================================
CREATE TABLE IF NOT EXISTS line_message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    session_id VARCHAR(10) REFERENCES sessions(session_id),
    line_user_id VARCHAR(255) NOT NULL,
    
    -- メッセージ情報
    message_type VARCHAR(50) NOT NULL, -- welcome, report, reminder, notification
    message_content JSONB, -- 送信したメッセージ内容
    
    -- 送信結果
    status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed
    response JSONB, -- LINE APIからのレスポンス
    error_message TEXT,
    
    -- タイムスタンプ
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_line_message_logs_visit_id ON line_message_logs(visit_id);
CREATE INDEX IF NOT EXISTS idx_line_message_logs_session_id ON line_message_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_line_message_logs_line_user_id ON line_message_logs(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_message_logs_message_type ON line_message_logs(message_type);
CREATE INDEX IF NOT EXISTS idx_line_message_logs_status ON line_message_logs(status);

-- RLS
ALTER TABLE line_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage line_message_logs"
    ON line_message_logs FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE line_message_logs IS 'LINE送信ログテーブル';
COMMENT ON COLUMN line_message_logs.message_type IS 'メッセージ種別: welcome, report, reminder, notification';

-- ============================================
-- 4. visits テーブルに report_sent_at カラム追加
-- ============================================
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS report_sent_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN visits.report_sent_at IS 'レポートLINE送信日時';

-- ============================================
-- 5. profiles テーブルに is_active カラム追加（なければ）
-- ============================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id_role 
ON profiles(line_user_id, role);

COMMENT ON COLUMN profiles.is_active IS 'アカウント有効フラグ';

