-- visit_photosテーブルに読み取りポリシーを追加
-- レポートページ（公開）から写真を取得できるようにする

-- 全ユーザーが読み取り可能（公開レポート用）
CREATE POLICY "Anyone can read visit_photos"
    ON visit_photos FOR SELECT
    TO anon, authenticated
    USING (true);
