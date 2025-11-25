import { ReactNode } from 'react'

interface FormSectionProps {
  title: string
  description?: string
  children: ReactNode
  icon?: ReactNode
}

export function FormSection({ title, description, children, icon }: FormSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center space-x-3">
        {icon && <div className="text-2xl">{icon}</div>}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </section>
  )
}

