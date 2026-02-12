'use client'

import React from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  onPress?: () => void
  children: React.ReactNode
  className?: string
  fullWidth?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  onPress,
  children,
  className = '',
  fullWidth = false,
}) => {
  const baseStyles = 'rounded-[30px] px-6 py-3 font-semibold text-[15px] transition-all duration-200 cursor-pointer flex items-center justify-center'
  const variants = {
    primary: 'bg-civiq-purple text-white hover:bg-opacity-90 shadow-md hover:shadow-lg',
    secondary: 'bg-white text-civiq-purple border-2 border-civiq-purple hover:bg-opacity-90',
  }
  const widthStyle = fullWidth ? 'w-full' : ''

  return (
    <button
      onClick={onPress}
      className={`${baseStyles} ${variants[variant]} ${widthStyle} ${className}`}
    >
      {children}
    </button>
  )
}
