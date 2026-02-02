import React, { useMemo } from 'react';
import { makeMarkdown } from '../lib/markdown';

const md = makeMarkdown();

export default function MarkdownDisplay({ content, className = '' }) {
    const html = useMemo(() => md.render(content || ''), [content]);

    return (
        <div
            className={`prose ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
