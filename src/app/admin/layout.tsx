import AdminLayoutClient from './layout-client'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 認証はmiddleware.tsで処理済み
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
