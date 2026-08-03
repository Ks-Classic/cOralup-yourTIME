import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StaffQuickStartGuide } from '../StaffQuickStartGuide'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('StaffQuickStartGuide', () => {
  it('アプリ登録が全員必須の事前作業だと明示する', async () => {
    render(<StaffQuickStartGuide />)

    expect(
      await screen.findByRole('heading', { name: 'アプリ登録を完了してください' })
    ).toBeTruthy()
    expect(
      screen.getByText('下のどちらかを必ず選択して、登録作業を開始してください。')
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: /登録済みの方はこちら/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /初めて登録する方はこちら/ })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'ログインできない場合' })).toBeTruthy()
    expect(
      screen.getByText(/スタッフ用LINEを開いて「ヘルプ」と送信/)
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'スタッフ用LINEを開く' }).getAttribute('href')
    ).toBe('https://lin.ee/ZUvmToP')
  })

  it('登録状況を選ぶと必須の実行手順を表示する', async () => {
    render(<StaffQuickStartGuide />)

    fireEvent.click(
      await screen.findByRole('button', { name: /初めて登録する方はこちら/ })
    )

    expect(
      screen.getByRole('heading', { name: 'アプリ登録・動作確認' })
    ).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'スタッフ用LINEを追加' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'デモを最後までやってみる' })).toBeTruthy()
  })
})
