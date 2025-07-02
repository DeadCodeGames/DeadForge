import React, { useState } from 'react';
import { GameNote } from '@/types';
import { cn } from '@/lib/utils';
import Tooltip from '@/components/CustomElements/Tooltip';
import Spoiler from '@/components/CustomElements/Spoiler';
import MarkdownText from '@/components/CustomElements/MarkdownText';

interface GameWarningProps {
    note: GameNote;
    className?: string;
}

const GameWarning: React.FC<GameWarningProps> = ({ note, className }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Function to process description and handle spoiler tags
    const processDescription = (text: string) => {
        // Split on spoiler tags, keeping the tags in the result
        const parts = text.split(/(<spoiler>[\s\S]*?<\/spoiler>)/);
        return parts.map((part, index) => {
            if (part.startsWith('<spoiler>')) {
                // Remove the opening and closing tags to get just the content
                const content = part.slice(9, -10); // Remove <spoiler> and </spoiler>
                return <Spoiler key={index} className="my-4"><MarkdownText>{content}</MarkdownText></Spoiler>;
            }
            return <MarkdownText key={index}>{part}</MarkdownText>;
        });
    };

    const getWarningIcon = () => {
        switch (note.type) {
            case 'security_warning':
                return 'security';
            case 'compatibility_warning':
                return 'warning';
            case 'content_warning':
                return 'content_warning';
            default:
                return 'info';
        }
    };

    const getSeverityColor = () => {
        switch (note.severity) {
            case 'high':
                return 'text-red-500 dark:text-red-400';
            case 'medium':
                return 'text-yellow-500 dark:text-yellow-400';
            case 'low':
                return 'text-blue-500 dark:text-blue-400';
            default:
                return 'text-neutral-500 dark:text-neutral-400';
        }
    };

    return (
        <div className={cn(
            "rounded-lg border border-neutral-200 dark:border-neutral-700",
            "bg-white dark:bg-neutral-800",
            "shadow-sm hover:shadow-md transition-shadow duration-200",
            className
        )}>
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className={cn(
                        "flex-shrink-0 rounded-full px-2 py-1 aspect-square",
                        getSeverityColor(),
                        "bg-opacity-10 dark:bg-opacity-10"
                    )}>
                        <Tooltip content={`${note.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} - ${note.severity.toUpperCase()}`}>
                            <span className="material-symbols text-2xl">
                                {getWarningIcon()}
                            </span>
                        </Tooltip>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                <MarkdownText>{note.title}</MarkdownText>
                            </h3>
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="flex-shrink-0 p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
                            >
                                <span className={cn(
                                    "material-symbols transition-transform duration-200 block",
                                    isExpanded && "rotate-180"
                                )}>
                                    expand_more
                                </span>
                            </button>
                        </div>
                        <div className={cn(
                            "mt-1 pr-6 text-sm text-neutral-600 dark:text-neutral-300",
                            !isExpanded && "line-clamp-2"
                        )}>
                            {processDescription(note.description)}
                        </div>
                        {isExpanded && note.recommendation && (
                        <div className="pb-4 pr-6">
                            <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3">
                                <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                                    Recommendations
                                </h4>
                                <div className="text-sm text-neutral-600 dark:text-neutral-300">
                                    <MarkdownText>{note.recommendation}</MarkdownText>
                                </div>
                            </div>
                        </div>
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameWarning; 