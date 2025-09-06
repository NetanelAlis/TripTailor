import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button.jsx';
import { Send, Map } from 'lucide-react';

const ChatInput = ({
    onSendMessage,
    disabled = false,
    placeholder = 'Where would you like to go?',
    onViewHistory,
    canViewHistory = true,
}) => {
    const [message, setMessage] = useState('');
    const textareaRef = useRef(null);
    const containerRef = useRef(null);
    const sidebarRef = useRef(null);

    const computeDesiredWidth = () => {
        const vw = window.innerWidth || 0;
        const isMobile = vw < 768; // Tailwind md breakpoint
        if (isMobile) {
            return vw - 16; // slight padding on mobile
        }
        const aside = sidebarRef.current || document.querySelector('aside');
        const sidebarWidth = aside ? aside.offsetWidth || 0 : 0;
        const desired = Math.max(320, (vw - sidebarWidth) * 0.6);
        return desired;
    };

    const updateLayoutVars = () => {
        const desired = computeDesiredWidth();
        document.documentElement.style.setProperty(
            '--tt-chatinput-max-width',
            `${desired}px`
        );

        if (containerRef.current) {
            containerRef.current.style.width = `${desired}px`;
            containerRef.current.style.maxWidth = `${desired}px`;
            const h = containerRef.current.offsetHeight || 0;
            document.documentElement.style.setProperty(
                '--tt-chatinput-height',
                `${h}px`
            );
        }
    };

    useEffect(() => {
        sidebarRef.current = document.querySelector('aside');
        updateLayoutVars();

        const onResize = () => updateLayoutVars();
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onResize);

        let ro;
        if ('ResizeObserver' in window && sidebarRef.current) {
            ro = new ResizeObserver(() => updateLayoutVars());
            ro.observe(sidebarRef.current);
        }

        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
            if (ro && sidebarRef.current) {
                ro.unobserve(sidebarRef.current);
            }
        };
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim() && !disabled) {
            onSendMessage(message.trim());
            setMessage('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
            requestAnimationFrame(updateLayoutVars);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleTextareaChange = (e) => {
        setMessage(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(
                textareaRef.current.scrollHeight,
                120
            )}px`;
        }
        requestAnimationFrame(updateLayoutVars);
    };

    return (
        <div
            ref={containerRef}
            className="sticky bottom-3 sm:bottom-4 h-full-screen w-full mt-3 sm:mt-4 mx-auto z-10"
            style={{
                width: 'var(--tt-chatinput-max-width, 56rem)',
                maxWidth: 'var(--tt-chatinput-max-width, 56rem)',
            }}
        >
            <form
                onSubmit={handleSubmit}
                className="relative bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-lg transition-all duration-300 focus-within:ring-4 focus-within:ring-teal-500/30 focus-within:border-teal-400"
            >
                <div className="flex items-end gap-2 p-2">
                    {onViewHistory && canViewHistory && (
                        <Button
                            type="button"
                            variant="ghost"
                            className="rounded-2xl h-13 w-13 flex-shrink-0 text-slate-600 hover:text-slate-800 px-0 py-0"
                            onClick={() => onViewHistory?.()}
                            aria-label="View in Trip History"
                        >
                            <Map className="w-6 h-6" />
                        </Button>
                    )}
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={handleTextareaChange}
                        onKeyPress={handleKeyPress}
                        placeholder={placeholder}
                        disabled={disabled}
                        className="w-full bg-transparent border-none rounded-2xl px-2 py-2.5 text-sm md:text-base text-slate-700 placeholder-slate-400 resize-none focus:outline-none focus:ring-0"
                        style={{ minHeight: '44px', maxHeight: '120px' }}
                        rows={1}
                    />
                    <Button
                        type="submit"
                        disabled={!message.trim() || disabled}
                        className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white rounded-2xl h-11 w-11 flex-shrink-0 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default ChatInput;
