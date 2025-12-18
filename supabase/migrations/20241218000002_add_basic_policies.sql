-- ============================================================================
-- 認証済みユーザーへのデータ参照権限付与
-- ============================================================================
-- 現状、RLS（行レベルセキュリティ）が有効ですが、参照ポリシーがないため
-- クライアントサイドからデータが見えない状態です。
-- 管理画面機能のため、暫定的に「認証済みユーザー（Authenticated）」であれば参照可能にします。

-- 1. visits (対応履歴)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'visits' AND policyname = 'Allow read access for authenticated users') THEN
    CREATE POLICY "Allow read access for authenticated users" ON visits FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'visits' AND policyname = 'Allow update access for authenticated users') THEN
    CREATE POLICY "Allow update access for authenticated users" ON visits FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- 2. reports (レポート)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reports' AND policyname = 'Allow read access for authenticated users') THEN
    CREATE POLICY "Allow read access for authenticated users" ON reports FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- 3. children (子供情報)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'children' AND policyname = 'Allow read access for authenticated users') THEN
    CREATE POLICY "Allow read access for authenticated users" ON children FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- 4. profiles (ユーザー・スタッフ情報)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow read access for authenticated users') THEN
    CREATE POLICY "Allow read access for authenticated users" ON profiles FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
