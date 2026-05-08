import 'highlight.js/styles/monokai-sublime.css';
import hightlight from 'highlight.js';
import { PropsWithChildren, useEffect, useRef } from 'react';

const CodeHighlight = ({ children }: PropsWithChildren) => {
    const highlightElement = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const pre = highlightElement?.current?.querySelector('pre');
        if (highlightElement?.current && pre) {
            hightlight.highlightElement(pre);
        }
    }, []);

    return (
        <div ref={highlightElement} className="highlight-el">
            {children}
        </div>
    );
};

export default CodeHighlight;
