import { verifyLineAccessToken, verifyLineIdToken } from '../line-id-token'

const CHANNEL_ID = '1234567890'
const VALID_TOKEN = 'valid.id.token'

function mockFetchResponse(ok: boolean, body: unknown): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    json: async () => body,
  }) as unknown as typeof fetch
}

describe('verifyLineIdToken', () => {
  const originalChannelId = process.env.LINE_STAFF_LOGIN_CHANNEL_ID

  beforeEach(() => {
    process.env.LINE_STAFF_LOGIN_CHANNEL_ID = CHANNEL_ID
  })

  afterEach(() => {
    process.env.LINE_STAFF_LOGIN_CHANNEL_ID = originalChannelId
    jest.restoreAllMocks()
  })

  test('throws when channel id is not configured (fail-closed)', async () => {
    delete process.env.LINE_STAFF_LOGIN_CHANNEL_ID
    await expect(verifyLineIdToken(VALID_TOKEN)).rejects.toThrow(
      'LINE_STAFF_LOGIN_CHANNEL_ID'
    )
  })

  test('returns null for a non-string token', async () => {
    expect(await verifyLineIdToken(undefined)).toBeNull()
    expect(await verifyLineIdToken('')).toBeNull()
    expect(await verifyLineIdToken('   ')).toBeNull()
  })

  test('returns null when LINE verify responds non-ok (invalid/expired token)', async () => {
    mockFetchResponse(false, { error: 'invalid_request' })
    expect(await verifyLineIdToken(VALID_TOKEN)).toBeNull()
  })

  test('returns null when sub is missing', async () => {
    mockFetchResponse(true, { aud: CHANNEL_ID })
    expect(await verifyLineIdToken(VALID_TOKEN)).toBeNull()
  })

  test('returns null when aud does not match the channel id (defense in depth)', async () => {
    mockFetchResponse(true, { sub: 'Uabc', aud: 'other-channel' })
    expect(await verifyLineIdToken(VALID_TOKEN)).toBeNull()
  })

  test('returns null when fetch throws (network failure rejects the login)', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network')) as unknown as typeof fetch
    expect(await verifyLineIdToken(VALID_TOKEN)).toBeNull()
  })

  test('returns null when response.json() itself rejects', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('broken json')
      },
    }) as unknown as typeof fetch
    expect(await verifyLineIdToken(VALID_TOKEN)).toBeNull()
  })

  test('omits displayName when name is absent', async () => {
    mockFetchResponse(true, { sub: 'Uverified123', aud: CHANNEL_ID })
    const result = await verifyLineIdToken(VALID_TOKEN)
    expect(result).toEqual({
      lineUserId: 'Uverified123',
      displayName: undefined,
    })
  })

  test('returns the verified identity on a valid token', async () => {
    mockFetchResponse(true, {
      sub: 'Uverified123',
      aud: CHANNEL_ID,
      name: 'スタッフ太郎',
    })
    const result = await verifyLineIdToken(VALID_TOKEN)
    expect(result).toEqual({
      lineUserId: 'Uverified123',
      displayName: 'スタッフ太郎',
    })
  })

  test('sends id_token and client_id to the LINE verify endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sub: 'Uverified123', aud: CHANNEL_ID }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    await verifyLineIdToken(VALID_TOKEN)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.line.me/oauth2/v2.1/verify')
    const params = init.body as URLSearchParams
    expect(params.get('id_token')).toBe(VALID_TOKEN)
    expect(params.get('client_id')).toBe(CHANNEL_ID)
  })
})

describe('verifyLineAccessToken', () => {
  const originalChannelId = process.env.LINE_STAFF_LOGIN_CHANNEL_ID

  beforeEach(() => {
    process.env.LINE_STAFF_LOGIN_CHANNEL_ID = CHANNEL_ID
  })

  afterEach(() => {
    process.env.LINE_STAFF_LOGIN_CHANNEL_ID = originalChannelId
    jest.restoreAllMocks()
  })

  test('returns null for an empty token', async () => {
    expect(await verifyLineAccessToken(undefined)).toBeNull()
    expect(await verifyLineAccessToken('')).toBeNull()
  })

  test('rejects a token issued to another channel', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ client_id: 'other-channel', expires_in: 3600 }),
    }) as unknown as typeof fetch

    expect(await verifyLineAccessToken('access-token')).toBeNull()
  })

  test('returns the verified LINE profile', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ client_id: CHANNEL_ID, expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ userId: 'Uverified456', displayName: '確認 花子' }),
      })
    global.fetch = fetchMock as unknown as typeof fetch

    await expect(verifyLineAccessToken('access-token')).resolves.toEqual({
      lineUserId: 'Uverified456',
      displayName: '確認 花子',
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1]?.headers).toEqual({
      Authorization: 'Bearer access-token',
    })
  })

  test('returns null when profile lookup fails', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ client_id: CHANNEL_ID, expires_in: 3600 }),
      })
      .mockResolvedValueOnce({ ok: false }) as unknown as typeof fetch

    expect(await verifyLineAccessToken('access-token')).toBeNull()
  })
})
