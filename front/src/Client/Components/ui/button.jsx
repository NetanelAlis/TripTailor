import React from 'react';

const buttonVariants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    ghost: 'bg-transparent hover:bg-slate-100',
    outline: 'border border-slate-300 bg-white hover:bg-slate-50',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
};

const buttonSizes = {
    sm: 'h-8 px-3 text-sm',
    default: 'h-10 px-4 py-2',
    lg: 'h-12 px-8 text-lg',
};

export function Button({
    children,
    variant = 'default',
    size = 'default',
    className = '',
    ...props
}) {
    const baseClasses =
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    const classes = `${baseClasses} ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`;

    return (
        <button className={classes} {...props}>
            {children}
        </button>
    );
}
