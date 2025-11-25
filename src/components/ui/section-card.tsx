import { ReactNode } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './card'

interface SectionCardProps {
  icon?: ReactNode
  title: string
  description?: string
  children: ReactNode
  headerExtra?: ReactNode
}

export function SectionCard({ icon, title, description, children, headerExtra }: SectionCardProps) {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-xl flex items-center space-x-2">
            {icon && <span className="text-2xl">{icon}</span>}
            <span>{title}</span>
          </CardTitle>
          {description && (
            <CardDescription className="text-sm text-gray-600">
              {description}
            </CardDescription>
          )}
        </div>
        {headerExtra && <div className="flex-shrink-0">{headerExtra}</div>}
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  )
}

