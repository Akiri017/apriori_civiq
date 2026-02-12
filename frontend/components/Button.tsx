'use client'

import React from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  onPress?: () => void
  children: React.ReactNode
  className?: string
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  onPress,
  children,
  className = '',
}) => {
  const baseStyles = 'px-6 py-2 rounded-lg font-semibold transition-all duration-200 cursor-pointer'
  const variants = {
    primary: 'bg-civiq-purple text-white hover:bg-opacity-90 shadow-lg',
    secondary: 'bg-white text-civiq-purple border-2 border-civiq-purple hover:bg-opacity-90',
  }

  return (
    <button
      onClick={onPress}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
