-- 安全化対策: 誰でもデータ一覧を取得できる（Listing）ポリシーを削除
-- 親御さんへのURL共有（閲覧）は維持しつつ、攻撃者による「全データリスト取得」を防ぐ

-- 1. visit_photos テーブルの公開読み取りポリシーを削除
-- (これにより、API経由でのみURLが発行されるようになり、テーブルの総当たりができなくなります)
DROP POLICY IF EXISTS "Anyone can read visit_photos" ON visit_photos;

-- 2. Storageの公開読み取り（Listing）ポリシーを削除
-- (Bucket自体はPublic設定のまま維持するため、正しいURLを知っていれば画像は表示されます)
-- (しかし、storage.objectsへのSELECT権限を消すことで、ファイル一覧の取得ができなくなります)
DROP POLICY IF EXISTS "Public Access for diagnosis-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access for avatars" ON storage.objects;
