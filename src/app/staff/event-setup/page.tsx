import Image from 'next/image'
import { redirect } from 'next/navigation'
import { StaffEventRegistration } from '@/components/staff/StaffEventRegistration'
import { getStaffSession } from '@/lib/staff-auth'

export const dynamic = 'force-dynamic'

export default async function StaffEventSetupPage() {
  const session = await getStaffSession()

  if (!session) {
    redirect('/staff/liff-login')
  }

  return (
    <main className="min-h-screen bg-[#f0fbff] px-4 py-10 text-[#17333c]">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <Image
            src="/logo.png"
            alt="cOral up"
            width={52}
            height={52}
            className="mx-auto"
            priority
          />
          <p className="mt-4 text-xs font-bold tracking-[0.18em] text-[#4cb9a7]">
            LOGIN COMPLETE
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[#00536d]">
            あと1つで準備完了です
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#476771]">
            {session.staffName}さんが参加するYourTIMEを確認してください。
          </p>
        </div>

        <StaffEventRegistration onboarding />
      </div>
    </main>
  )
}
