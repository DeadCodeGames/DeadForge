import React, { useState, useRef, useEffect, ReactNode, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
type TooltipAlignment = 'start' | 'center' | 'end';

interface TooltipProps {
    children: ReactNode;
    content: ReactNode;
    position?: TooltipPosition;
    alignment?: TooltipAlignment;
    showDelay?: number;
    hideDelay?: number;
    maxWidth?: string;
    className?: string;
    containerClassName?: string;
    disabled?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
    children,
    content,
    position = 'top',
    alignment = 'center',
    showDelay = 300,
    hideDelay = 200,
    maxWidth = '20rem',
    className = '',
    containerClassName = '',
    disabled = false,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [tooltipStyles, setTooltipStyles] = useState({});
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const showTimeoutRef = useRef<number | null>(null);
    const hideTimeoutRef = useRef<number | null>(null);

    // Calculate positioning
    const updateTooltipPosition = () => {
        if (!triggerRef.current || !tooltipRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        // Default spacing between tooltip and trigger element
        const gap = 8;

        let top = 0;
        let left = 0;

        // Origin for transform
        let originX = '50%';
        let originY = '50%';

        // Calculate position based on the specified position prop
        switch (position) {
        case 'top':
            top = triggerRect.top + scrollY - tooltipRect.height - gap;
            originY = '100%';
            break;
        case 'bottom':
            top = triggerRect.bottom + scrollY + gap;
            originY = '0%';
            break;
        case 'left':
            left = triggerRect.left + scrollX - tooltipRect.width - gap;
            top = triggerRect.top + scrollY + (triggerRect.height / 2) - (tooltipRect.height / 2);
            originX = '100%';
            break;
        case 'right':
            left = triggerRect.right + scrollX + gap;
            top = triggerRect.top + scrollY + (triggerRect.height / 2) - (tooltipRect.height / 2);
            originX = '0%';
            break;
        default:
            break;
        }

        // Calculate alignment for top and bottom positions
        if (position === 'top' || position === 'bottom') {
            switch (alignment) {
            case 'start':
                left = triggerRect.left + scrollX;
                break;
            case 'center':
                left = triggerRect.left + scrollX + (triggerRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'end':
                left = triggerRect.right + scrollX - tooltipRect.width;
                break;
            default:
                break;
            }
        }

        // Calculate alignment for left and right positions
        if (position === 'left' || position === 'right') {
            switch (alignment) {
            case 'start':
                top = triggerRect.top + scrollY;
                break;
            case 'center':
                // Already calculated above
                break;
            case 'end':
                top = triggerRect.bottom + scrollY - tooltipRect.height;
                break;
            default:
                break;
            }
        }

        // Boundary checking to prevent tooltip from going off-screen
        const boundary = 10; // Minimum distance from screen edge

        // Horizontal boundaries
        if (left < boundary) {
            left = boundary;
        } else if (left + tooltipRect.width > window.innerWidth - boundary) {
            left = window.innerWidth - tooltipRect.width - boundary;
        }

        // Vertical boundaries
        if (top < boundary) {
            top = boundary;
        } else if (top + tooltipRect.height > window.innerHeight - boundary) {
            top = window.innerHeight - tooltipRect.height - boundary;
        }

        setTooltipStyles({
            position: 'absolute',
            top: `${top}px`,
            left: `${left}px`,
            maxWidth,
            zIndex: 9999,
            transformOrigin: `${originX} ${originY}`,
        });
    };

    const handleShowTooltip = () => {
        if (disabled) return;

        // Clear any existing timeout
        if (hideTimeoutRef.current) {
            window.clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }

        // Set a delay for showing the tooltip
        showTimeoutRef.current = window.setTimeout(() => {
            setIsVisible(true);
            updateTooltipPosition();
        }, showDelay);
    };

    const handleHideTooltip = () => {
        // Clear any existing timeout
        if (showTimeoutRef.current) {
            window.clearTimeout(showTimeoutRef.current);
            showTimeoutRef.current = null;
        }

        // Set a delay for hiding the tooltip
        hideTimeoutRef.current = window.setTimeout(() => {
            setIsVisible(false);
        }, hideDelay);
    };

    // Update position when tooltip visibility changes
    useEffect(() => {
        if (isVisible) {
            // Initial position update
            updateTooltipPosition();
            
            // Add a second update on the next frame to ensure accurate measurements
            requestAnimationFrame(() => {
                updateTooltipPosition();
            });
            
            window.addEventListener('scroll', updateTooltipPosition);
            window.addEventListener('resize', updateTooltipPosition);
        }

        return () => {
            window.removeEventListener('scroll', updateTooltipPosition);
            window.removeEventListener('resize', updateTooltipPosition);
        };
    }, [isVisible]);

    useLayoutEffect(() => {
        updateTooltipPosition();
    }, [content, children]);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (showTimeoutRef.current) {
                window.clearTimeout(showTimeoutRef.current);
            }
            if (hideTimeoutRef.current) {
                window.clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);

    // Generate tooltip classes based on position
    const getTooltipClasses = () => {
        const baseClasses = `
      transition-[opacity,transform,top,bottom,left,right] duration-200 ease-in-out rounded-md
      bg-fullMoon dark:bg-night text-notQuiteBlack dark:text-notQuiteWhite
      shadow-lg py-2 px-3 text-sm border border-solid border-notQuiteBlack/10 dark:border-notQuiteWhite/10
      ${className}
    `;

        return isVisible
            ? cn(baseClasses, 'opacity-100 scale-100')
            : cn(baseClasses, 'opacity-0 scale-95');
    };

    return (
        <>
            <div className={cn(containerClassName)}
                ref={triggerRef}
                onMouseEnter={handleShowTooltip}
                onMouseLeave={handleHideTooltip}
                onFocus={handleShowTooltip}
                onBlur={handleHideTooltip}
            >
                {children}
            </div>

            {createPortal(
                <div
                    ref={tooltipRef}
                    className={getTooltipClasses()}
                    onMouseEnter={handleShowTooltip}
                    onMouseLeave={handleHideTooltip}
                    style={{
                        ...tooltipStyles,
                        visibility: isVisible ? 'visible' : 'hidden'
                    }}
                    role="tooltip"
                    aria-live="polite"
                >
                    {content}
                </div>,
                document.body
            )}
        </>
    );
};

export default Tooltip;