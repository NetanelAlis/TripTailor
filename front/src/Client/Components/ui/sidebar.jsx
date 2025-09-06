import React, { createContext, useContext, useState } from 'react';

const SidebarContext = createContext();

export function SidebarProvider({ children, open = true, onOpenChange }) {
    const [collapsed, setCollapsed] = useState(false);

    const value = {
        open,
        collapsed,
        setCollapsed,
        onOpenChange,
    };

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}

export function Sidebar({ children, className = '', ...props }) {
    const { collapsed } = useSidebar();

    return (
        <aside
            className={`${className} ${
                collapsed ? 'w-20' : 'w-64'
            } transition-all duration-300`}
            {...props}
        >
            {children}
        </aside>
    );
}

export function SidebarHeader({ children, className = '', ...props }) {
    return (
        <div className={`${className}`} {...props}>
            {children}
        </div>
    );
}

export function SidebarContent({ children, className = '', ...props }) {
    return (
        <div className={`${className}`} {...props}>
            {children}
        </div>
    );
}

export function SidebarGroup({ children, className = '', ...props }) {
    return (
        <div className={`${className}`} {...props}>
            {children}
        </div>
    );
}

export function SidebarGroupLabel({ children, className = '', ...props }) {
    return (
        <div className={`${className}`} {...props}>
            {children}
        </div>
    );
}

export function SidebarGroupContent({ children, className = '', ...props }) {
    return (
        <div className={`${className}`} {...props}>
            {children}
        </div>
    );
}

export function SidebarMenu({ children, className = '', ...props }) {
    return (
        <div className={`${className}`} {...props}>
            {children}
        </div>
    );
}

export function SidebarMenuItem({ children, className = '', ...props }) {
    return (
        <div className={`${className}`} {...props}>
            {children}
        </div>
    );
}

export function SidebarMenuButton({
    children,
    asChild = false,
    className = '',
    ...props
}) {
    const Component = asChild ? 'div' : 'button';

    return (
        <Component className={`${className}`} {...props}>
            {children}
        </Component>
    );
}

export function SidebarTrigger({ children, className = '', ...props }) {
    const { setCollapsed, collapsed } = useSidebar();

    return (
        <button
            className={`${className}`}
            onClick={() => setCollapsed(!collapsed)}
            {...props}
        >
            {children}
        </button>
    );
}
