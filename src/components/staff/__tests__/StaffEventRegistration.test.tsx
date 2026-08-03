import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StaffEventRegistration } from '../StaffEventRegistration'

const event = {
  id: '5b11ebd8-0f54-45c7-a62b-66a30d454310',
  name: '8/2 YourTIME.8th 東京',
  startDate: '2026-08-02T01:30:00.000Z',
  endDate: '2026-08-02T07:30:00.000Z',
  venue: '東京流通センター 第1展示場C・D',
}

afterEach(() => {
  cleanup()
  jest.restoreAllMocks()
})

describe('StaffEventRegistration', () => {
  it('登録済みならオンボーディングからホームへ進める', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ events: [{ ...event, isRegistered: true }] }),
    }) as jest.MockedFunction<typeof fetch>

    render(<StaffEventRegistration onboarding />)

    expect(await screen.findByText('登録済み')).toBeTruthy()
    const homeLink = await screen.findByRole('link', {
      name: 'スタッフホームへ進む',
    })
    expect(homeLink.getAttribute('href')).toBe('/staff/home')
  })

  it('セッション切れなら生のunauthorizedではなく再ログイン導線を出す', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'unauthorized' }),
    }) as jest.MockedFunction<typeof fetch>

    render(<StaffEventRegistration onboarding />)

    expect(
      await screen.findByText(
        'ログイン状態を確認できませんでした。もう一度LINEログインしてください。'
      )
    ).toBeTruthy()
    const loginLink = await screen.findByRole('link', {
      name: 'LINEでログインし直す',
    })
    expect(loginLink.getAttribute('href')).toBe('/staff/liff-login')
  })

  it('未登録イベントを登録してからホームへ進める', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ events: [{ ...event, isRegistered: false }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ events: [{ ...event, isRegistered: true }] }),
      })
    global.fetch = fetchMock as jest.MockedFunction<typeof fetch>

    render(<StaffEventRegistration onboarding />)
    fireEvent.click(await screen.findByRole('button', { name: '参加登録' }))

    expect(
      await screen.findByRole('link', { name: 'スタッフホームへ進む' })
    ).toBeTruthy()
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/staff/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: event.id }),
    })
  })
})
