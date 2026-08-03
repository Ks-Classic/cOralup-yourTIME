import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StaffWorkflowOverview } from '../StaffWorkflowOverview'

afterEach(cleanup)

describe('StaffWorkflowOverview', () => {
  it('診断を初期展開し、3段階を切り替えて確認できる', () => {
    render(<StaffWorkflowOverview />)

    expect(screen.getByRole('heading', { name: '診断の流れ' })).toBeTruthy()
    const visitorButton = screen.getByRole('button', { name: /来場者/ })
    const diagnosisButton = screen.getByRole('button', { name: /診断/ })
    const notificationButton = screen.getByRole('button', { name: /LINE通知/ })

    expect(diagnosisButton.getAttribute('aria-expanded')).toBe('true')
    expect(
      screen.getByRole('heading', { name: 'アプリで診断し、内容を確認' })
    ).toBeTruthy()
    expect(screen.getByText('AIの文案はスタッフが必ず確認します')).toBeTruthy()

    fireEvent.click(visitorButton)
    expect(visitorButton.getAttribute('aria-expanded')).toBe('true')
    expect(
      screen.getByRole('heading', { name: '問診に回答し、QRを提示' })
    ).toBeTruthy()

    fireEvent.click(notificationButton)
    expect(notificationButton.getAttribute('aria-expanded')).toBe('true')
    expect(
      screen.getByRole('heading', { name: '結果と次のご案内を2通配信' })
    ).toBeTruthy()
    expect(screen.getByText('撮影した写真3枚')).toBeTruthy()
    expect(screen.getByText('分析レポート')).toBeTruthy()
    expect(screen.getByText('個別相談')).toBeTruthy()
    expect(screen.getByText('SNS・相談用LINE')).toBeTruthy()
    expect(
      screen.getByText(
        'スタッフが担当するのは中央の「診断」です。続くアプリ登録とデモ練習を、当日までに完了してください。'
      )
    ).toBeTruthy()
  })
})
