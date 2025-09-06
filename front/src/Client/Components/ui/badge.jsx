import React from 'react';

const badgeVariants = {
    default: 'bg-slate-900 text-white',
    secondary: 'bg-slate-100 text-slate-900',
    outline: 'border border-slate-300 text-slate-700',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    destructive: 'bg-red-100 text-red-800',
};

export function Badge({
    children,
    variant = 'default',
    className = '',
    ...props
}) {
    const baseClasses =
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
    const classes = `${baseClasses} ${badgeVariants[variant]} ${className}`;

    return (
        <span className={classes} {...props}>
            {children}
        </span>
    );
}
