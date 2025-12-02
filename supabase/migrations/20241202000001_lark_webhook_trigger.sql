-- -----------------------------------------------------------------------------
-- Lark Sync Webhook Trigger
-- 
-- visits テーブルの INSERT/UPDATE 時に Edge Function を呼び出す
-- -----------------------------------------------------------------------------

-- Webhook URL は環境変数で設定 (Supabase Dashboard で設定)
-- 例: https://<project-ref>.supabase.co/functions/v1/lark-sync

-- pg_net 拡張を有効化 (HTTP リクエスト用)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Webhook を呼び出す関数
CREATE OR REPLACE FUNCTION notify_lark_sync()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
  payload JSONB;
BEGIN
  -- Webhook URL を取得 (Supabase Vault から)
  -- 本番環境では Vault に設定: SELECT vault.create_secret('lark_webhook_url', 'https://...')
  webhook_url := current_setting('app.settings.lark_webhook_url', true);
  
  -- URL が設定されていない場合はスキップ
  IF webhook_url IS NULL OR webhook_url = '' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- ペイロードを構築
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW)::jsonb END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD)::jsonb END,
    'timestamp', extract(epoch from now())
  );

  -- 非同期で Webhook を呼び出し
  PERFORM net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key', true)
    ),
    body := payload::text
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- エラーが発生してもトランザクションは継続
    RAISE WARNING 'Lark sync webhook failed: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- visits テーブルにトリガーを設定
DROP TRIGGER IF EXISTS trigger_lark_sync_visits ON visits;

CREATE TRIGGER trigger_lark_sync_visits
  AFTER INSERT OR UPDATE ON visits
  FOR EACH ROW
  EXECUTE FUNCTION notify_lark_sync();

-- コメント
COMMENT ON FUNCTION notify_lark_sync() IS 'Lark Base にデータを同期するための Webhook 呼び出し関数';
COMMENT ON TRIGGER trigger_lark_sync_visits ON visits IS 'visits テーブル変更時に Lark 同期 Edge Function を呼び出す';

