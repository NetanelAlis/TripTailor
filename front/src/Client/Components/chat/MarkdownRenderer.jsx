import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export default memo(function MarkdownRenderer({ children, className = '' }) {
    const text = typeof children === 'string' ? children : '';
    const normalized = text.replace(/\r\n/g, '\n').trim();

    return (
        <div
            className={`prose prose-slate max-w-none prose-headings:font-semibold prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-strong:text-slate-800 prose-li:my-0 ${className}`}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                disallowedElements={['img']}
                components={{
                    a: ({ node, ...props }) => (
                        <a {...props} target="_blank" rel="noreferrer" />
                    ),
                }}
            >
                {normalized}
            </ReactMarkdown>
        </div>
    );
});
