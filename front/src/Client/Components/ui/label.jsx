import React from 'react';

const labelVariants = {
    default: 'text-slate-700',
    error: 'text-red-600',
};

const labelSizes = {
    sm: 'text-sm',
    default: 'text-sm font-medium',
    lg: 'text-base font-medium',
};

export function Label({
    children,
    variant = 'default',
    size = 'default',
    className = '',
    ...props
}) {
    const baseClasses =
        'block leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';

    const classes = `${baseClasses} ${labelVariants[variant]} ${labelSizes[size]} ${className}`;

    return (
        <label className={classes} {...props}>
            {children}
        </label>
    );
}
