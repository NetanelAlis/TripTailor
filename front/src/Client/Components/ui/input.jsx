import React from 'react';

const inputVariants = {
    default: 'border-slate-300 focus:border-blue-500 focus:ring-blue-500',
    error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
};

const inputSizes = {
    sm: 'h-8 px-3 text-sm',
    default: 'h-10 px-3',
    lg: 'h-12 px-4 text-lg',
};

export function Input({
    variant = 'default',
    size = 'default',
    className = '',
    ...props
}) {
    const baseClasses =
        'flex w-full rounded-lg border bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

    const classes = `${baseClasses} ${inputVariants[variant]} ${inputSizes[size]} ${className}`;

    return <input className={classes} {...props} />;
}
