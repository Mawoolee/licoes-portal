import * as React from 'react'

type ButtonVariant = 'default' | 'outline' | 'destructive' | 'ghost' | 'secondary'
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-[var(--brand-400)] text-white hover:bg-[var(--brand-500)]',
  outline: 'border border-[var(--brand-100)] bg-white hover:bg-[var(--brand-50)] text-[var(--text-primary)]',
  destructive: 'bg-[var(--brand-600)] text-white hover:bg-[var(--brand-500)]',
  ghost: 'bg-transparent hover:bg-[var(--brand-50)] text-[var(--text-primary)]',
  secondary: 'bg-[var(--brand-50)] text-[var(--text-primary)] hover:bg-[var(--brand-100)]',
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 py-2 px-4 text-sm',
  sm: 'h-8 py-1.5 px-3 text-xs',
  lg: 'h-12 py-3 px-6 text-base',
  icon: 'h-10 w-10 p-0',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
