import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Coralup - 口腔育成診断システム',
  description: 'お子様の口腔・姿勢状態をAIで分析し、適切なアドバイスを提供します。',
  keywords: '口腔育成, 姿勢分析, 歯科衛生士, 問診票, 診断',
  authors: [{ name: 'Coralup Team' }],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  robots: 'noindex, nofollow', // 開発中は検索エンジンにインデックスさせない
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </body>
    </html>
  )
}

