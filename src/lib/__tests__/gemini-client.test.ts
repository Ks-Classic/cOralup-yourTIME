const mockGenerateContent = jest.fn()

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation((apiKey: string) => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: (input: unknown) => mockGenerateContent(apiKey, input),
    })),
  })),
}))

import { generateText } from '../gemini-client'

describe('Gemini API key failover', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.GEMINI_API_KEY = 'key-1'
    process.env.GEMINI_API_KEY_2 = 'key-2'
    process.env.GEMINI_API_KEY_3 = 'key-3'
  })

  afterAll(() => {
    process.env = originalEnv
  })

  test('403で同じキーを再試行せず次のキーへ切り替える', async () => {
    mockGenerateContent.mockImplementation((apiKey: string) => {
      if (apiKey === 'key-1') {
        return Promise.reject(
          Object.assign(new Error('Your project has been denied access'), {
            status: 403,
          })
        )
      }

      return Promise.resolve({ response: { text: () => 'success' } })
    })

    await expect(generateText('prompt')).resolves.toBe('success')
    expect(mockGenerateContent).toHaveBeenCalledTimes(2)
    expect(mockGenerateContent.mock.calls.map(([apiKey]) => apiKey)).toEqual([
      'key-1',
      'key-2',
    ])
  })

  test('1本目と2本目が拒否された場合は3本目を使用する', async () => {
    mockGenerateContent.mockImplementation((apiKey: string) => {
      if (apiKey !== 'key-3') {
        return Promise.reject(
          Object.assign(new Error('PERMISSION_DENIED'), { status: 403 })
        )
      }

      return Promise.resolve({ response: { text: () => 'third-key-success' } })
    })

    await expect(generateText('prompt')).resolves.toBe('third-key-success')
    expect(mockGenerateContent.mock.calls.map(([apiKey]) => apiKey)).toEqual([
      'key-1',
      'key-2',
      'key-3',
    ])
  })
})
