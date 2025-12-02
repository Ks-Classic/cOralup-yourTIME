-- ============================================================================
-- cOralup Storage バケット作成マイグレーション
-- ============================================================================
-- 作成日: 2024-12-01
-- 説明: 画像アップロード用のStorageバケットを作成
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Storage バケット作成
-- ----------------------------------------------------------------------------

-- 診断写真用バケット
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diagnosis-photos',
  'diagnosis-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- アバター用バケット
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Storage ポリシー設定
-- ----------------------------------------------------------------------------
-- 注意: StorageポリシーはSupabase Dashboardから設定することを推奨
-- 以下のSQLは参考用（Dashboardで設定する場合は不要）

-- diagnosis-photos バケットのポリシー
-- 全ユーザーが読み取り可能
CREATE POLICY IF NOT EXISTS "Public Access for diagnosis-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'diagnosis-photos');

-- 認証済みユーザーがアップロード可能
CREATE POLICY IF NOT EXISTS "Authenticated users can upload diagnosis-photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'diagnosis-photos' AND
  auth.role() = 'authenticated'
);

-- 認証済みユーザーが更新可能
CREATE POLICY IF NOT EXISTS "Authenticated users can update diagnosis-photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'diagnosis-photos' AND
  auth.role() = 'authenticated'
);

-- 認証済みユーザーが削除可能
CREATE POLICY IF NOT EXISTS "Authenticated users can delete diagnosis-photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'diagnosis-photos' AND
  auth.role() = 'authenticated'
);

-- avatars バケットのポリシー
-- 全ユーザーが読み取り可能
CREATE POLICY IF NOT EXISTS "Public Access for avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 認証済みユーザーがアップロード可能
CREATE POLICY IF NOT EXISTS "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

-- 認証済みユーザーが更新可能
CREATE POLICY IF NOT EXISTS "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

-- 認証済みユーザーが削除可能
CREATE POLICY IF NOT EXISTS "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

-- ----------------------------------------------------------------------------
-- コメント追加
-- ----------------------------------------------------------------------------
COMMENT ON TABLE storage.buckets IS 'Storageバケット管理テーブル';
COMMENT ON POLICY "Public Access" ON storage.objects IS '診断写真バケットの公開読み取りポリシー';
COMMENT ON POLICY "Authenticated users can upload" ON storage.objects IS '診断写真バケットのアップロードポリシー';

