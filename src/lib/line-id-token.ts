/**
 * LINE ID トークン検証ユーティリティ
 *
 * LIFF の `liff.getIDToken()` が返す ID トークン(JWT)を LINE の公式
 * verify エンドポイントでサーバ側検証する。署名・有効期限・aud(チャネルID)
 * を LINE 側で検証したうえで、検証済みの sub(=lineUserId) だけを採用する。
 *
 * これにより「body の lineUserId をそのまま信頼する」なりすましを防ぐ。
 * （body 信頼だと、登録スタッフの lineUserId を知る者がそのスタッフの
 *   セッションを発行できてしまう）
 */

const LINE_VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify'
const LINE_PROFILE_URL = 'https://api.line.me/v2/profile'

function createRequestSignal(): AbortSignal | undefined {
  return typeof AbortSignal !== 'undefined' &&
    typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(5000)
    : undefined
}

export interface VerifiedLineIdentity {
  lineUserId: string
  displayName?: string
}

/**
 * LINE ID トークンを検証し、検証済みの本人情報を返す。
 * 無効なトークンは null。チャネルID未設定は fail-closed で例外。
 */
export async function verifyLineIdToken(
  idToken: unknown
): Promise<VerifiedLineIdentity | null> {
  const channelId = process.env.LINE_STAFF_LOGIN_CHANNEL_ID
  if (!channelId) {
    // CR-S: 検証に必要な設定が無い状態で素通りさせない
    throw new Error('LINE_STAFF_LOGIN_CHANNEL_ID is not set')
  }

  if (typeof idToken !== 'string' || idToken.trim().length === 0) {
    return null
  }

  let response: Response
  try {
    response = await fetch(LINE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: channelId,
      }),
    })
  } catch {
    // ネットワーク障害等。検証できない＝拒否
    return null
  }

  if (!response.ok) {
    // 署名不正・期限切れ・aud不一致などは LINE が 4xx を返す
    return null
  }

  const payload = (await response.json().catch(() => null)) as {
    sub?: unknown
    aud?: unknown
    name?: unknown
  } | null

  if (!payload || typeof payload.sub !== 'string' || payload.sub.length === 0) {
    return null
  }

  // verify エンドポイントは aud を検証済みだが、二重確認(防御の多層化)
  if (typeof payload.aud !== 'string' || payload.aud !== channelId) {
    return null
  }

  return {
    lineUserId: payload.sub,
    displayName: typeof payload.name === 'string' ? payload.name : undefined,
  }
}

/**
 * LIFFアクセストークンをLINE公式APIで検証し、本人情報を返す。
 * openid scopeが無くIDトークンを取得できないLIFF設定の安全な代替経路。
 */
export async function verifyLineAccessToken(
  accessToken: unknown
): Promise<VerifiedLineIdentity | null> {
  const channelId = process.env.LINE_STAFF_LOGIN_CHANNEL_ID
  if (!channelId) {
    throw new Error('LINE_STAFF_LOGIN_CHANNEL_ID is not set')
  }

  if (typeof accessToken !== 'string' || accessToken.trim().length === 0) {
    return null
  }

  try {
    const verificationResponse = await fetch(
      `${LINE_VERIFY_URL}?access_token=${encodeURIComponent(accessToken)}`,
      { signal: createRequestSignal() }
    )
    if (!verificationResponse.ok) return null

    const verification = (await verificationResponse.json().catch(() => null)) as {
      client_id?: unknown
      expires_in?: unknown
    } | null
    if (
      !verification ||
      verification.client_id !== channelId ||
      typeof verification.expires_in !== 'number' ||
      verification.expires_in <= 0
    ) {
      return null
    }

    const profileResponse = await fetch(LINE_PROFILE_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: createRequestSignal(),
    })
    if (!profileResponse.ok) return null

    const profile = (await profileResponse.json().catch(() => null)) as {
      userId?: unknown
      displayName?: unknown
    } | null
    if (!profile || typeof profile.userId !== 'string' || profile.userId.length === 0) {
      return null
    }

    return {
      lineUserId: profile.userId,
      displayName:
        typeof profile.displayName === 'string' ? profile.displayName : undefined,
    }
  } catch {
    return null
  }
}
