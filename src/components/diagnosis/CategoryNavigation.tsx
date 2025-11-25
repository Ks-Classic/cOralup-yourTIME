'use client'

import { cn } from '@/utils'

interface CategoryNavigationProps {
    categories: string[]
    activeCategory: string
    onCategoryChange: (category: string) => void
    categoryProgress?: Record<string, number>
}

export function CategoryNavigation({
    categories,
    activeCategory,
    onCategoryChange,
    categoryProgress = {}
}: CategoryNavigationProps) {
    return (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
            <div className="overflow-x-auto">
                <div className="flex gap-1 p-2 min-w-max">
                    {categories.map((category) => {
                        const progress = categoryProgress[category] || 0
                        const isActive = category === activeCategory

                        return (
                            <button
                                key={category}
                                onClick={() => onCategoryChange(category)}
                                className={cn(
                                    'relative px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                                    isActive
                                        ? 'bg-coral-500 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                )}
                            >
                                <span>{category}</span>
                                {progress > 0 && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 rounded-b-lg overflow-hidden">
                                        <div
                                            className="h-full bg-white transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
