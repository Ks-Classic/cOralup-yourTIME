import type { Metadata } from 'next'
import { StaffQuickStartGuide } from '@/components/staff/StaffQuickStartGuide'

export const metadata: Metadata = {
  title: 'スタッフ事前準備 | cOral up YourTIME',
  description: '8/2 YourTIME.8th 東京に向けたスタッフ登録とデモ確認',
  robots: { index: false, follow: false },
}

export default function StaffGuidePage() {
  return <StaffQuickStartGuide />
}
