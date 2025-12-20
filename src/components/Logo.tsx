'use client'

import Image from 'next/image'

interface LogoProps {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    className?: string
    showText?: boolean
}

const sizeMap = {
    xs: { width: 20, height: 20 },
    sm: { width: 24, height: 24 },
    md: { width: 32, height: 32 },
    lg: { width: 48, height: 48 },
    xl: { width: 64, height: 64 },
}

export function Logo({ size = 'md', className = '', showText = false }: LogoProps) {
    const dimensions = sizeMap[size]

    return (
        <Image
            src="/logo.png"
            alt="cOral up"
            width={dimensions.width}
            height={dimensions.height}
            className={className}
            priority
        />
    )
}

// 小さいアイコン用（絵文字のような使い方）
export function LogoIcon({ size = 'sm', className = '' }: Omit<LogoProps, 'showText'>) {
    const dimensions = sizeMap[size]

    return (
        <Image
            src="/logo.png"
            alt="cOral up"
            width={dimensions.width}
            height={dimensions.height}
            className={`inline-block ${className}`}
            priority
        />
    )
}
