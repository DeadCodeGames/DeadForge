import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownTextProps {
    children: string;
    className?: string;
}

type TokenType = 'text' | 'bold' | 'italic' | 'strikethrough' | 'underline' | 'link';

interface Token {
    type: TokenType;
    content: string | Token[];
    url?: string;
}

const MarkdownText: React.FC<MarkdownTextProps> = ({ children, className }) => {
    const tokenize = (text: string): Token[] => {
        const tokens: Token[] = [];
        let currentText = '';
        let i = 0;

        const pushText = () => {
            if (currentText) {
                tokens.push({ type: 'text', content: currentText });
                currentText = '';
            }
        };

        const findClosingMarker = (marker: string, startIndex: number): number => {
            let depth = 1;
            let pos = startIndex;
            
            while (pos < text.length) {
                if (text.startsWith(marker, pos)) {
                    depth--;
                    if (depth === 0) {
                        return pos;
                    }
                    pos += marker.length;
                } else {
                    pos++;
                }
            }
            return -1;
        };

        while (i < text.length) {
            // Check for link pattern [text](url)
            if (text[i] === '[') {
                const closeBracket = text.indexOf(']', i);
                if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
                    const closeParens = text.indexOf(')', closeBracket);
                    if (closeParens !== -1) {
                        pushText();
                        const linkText = text.slice(i + 1, closeBracket);
                        const url = text.slice(closeBracket + 2, closeParens);
                        tokens.push({
                            type: 'link',
                            content: tokenize(linkText),
                            url
                        });
                        i = closeParens + 1;
                        continue;
                    }
                }
            }

            // Check for markdown patterns
            const patterns = [
                { marker: '**', type: 'bold' as const },
                { marker: '__', type: 'underline' as const },
                { marker: '~~', type: 'strikethrough' as const },
                { marker: '_', type: 'italic' as const }
            ];

            let matched = false;
            for (const { marker, type } of patterns) {
                if (text.startsWith(marker, i)) {
                    const closeIndex = findClosingMarker(marker, i + marker.length);
                    if (closeIndex !== -1) {
                        pushText();
                        const innerContent = text.slice(i + marker.length, closeIndex);
                        tokens.push({
                            type,
                            content: tokenize(innerContent)
                        });
                        i = closeIndex + marker.length;
                        matched = true;
                        break;
                    }
                }
            }

            if (!matched) {
                currentText += text[i];
                i++;
            }
        }

        pushText();
        return tokens;
    };

    const renderContent = (content: string | Token[]): React.ReactNode => {
        if (typeof content === 'string') {
            return content;
        }
        return renderTokens(content);
    };

    const renderTokens = (tokens: Token[]): React.ReactNode => {
        return (
            <React.Fragment>
                {tokens.map((token, index) => {
                    switch (token.type) {
                    case 'text':
                        return <React.Fragment key={index}>{renderContent(token.content)}</React.Fragment>;
                    case 'bold':
                        return <strong key={index}>{renderContent(token.content)}</strong>;
                    case 'italic':
                        return <em key={index}>{renderContent(token.content)}</em>;
                    case 'strikethrough':
                        return <del key={index}>{renderContent(token.content)}</del>;
                    case 'underline':
                        return <u key={index}>{renderContent(token.content)}</u>;
                    case 'link':
                        return (
                            <a 
                                key={index}
                                href={token.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 dark:text-blue-400 hover:underline m-0"
                            >
                                {renderContent(token.content)}
                            </a>
                        );
                    default:
                        return null;
                    }
                })}
            </React.Fragment>
        );
    };

    return (
        <span className={cn("whitespace-pre-wrap", className)}>
            {renderTokens(tokenize(children))}
        </span>
    );
};

export default MarkdownText; 