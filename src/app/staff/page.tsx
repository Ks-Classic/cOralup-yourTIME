import { redirect } from 'next/navigation'

/**
 * Keep the short staff URL usable when it is shared or entered manually.
 * Authentication and browser handoff are handled by the LIFF login page.
 */
export default function StaffEntryPage() {
  redirect('/staff/liff-login')
}
