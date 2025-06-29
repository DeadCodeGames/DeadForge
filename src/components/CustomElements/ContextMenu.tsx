import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import React from "react"

// Basic types for menu structure
export interface MenuItem {
  id: string
  icon?: string | { default: string; hover?: string }
  label: string | React.ReactNode | { default: React.ReactNode; hover?: React.ReactNode }
  onClick?: () => void
  disabled?: boolean
  type?: 'item'
  className?: string
  keepOpen?: boolean
}

export interface MenuDivider {
  id: string
  type: 'divider'
}

export interface MenuSubmenu {
  id: string
  icon?: string
  label: React.ReactNode
  items: (MenuItem | MenuDivider | MenuSubmenu | MenuCustom)[]
  type: 'submenu'
  className?: string
}

export interface MenuCustom {
  id: string
  type: 'custom'
  content: React.ReactNode
  className?: string
}

export type MenuItemType = MenuItem | MenuDivider | MenuSubmenu | MenuCustom

export interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  items: MenuItemType[]
  header?: {
    title: React.ReactNode
    icon?: string
  }
  className?: string
  extraFocusRefs?: React.RefObject<HTMLElement | null>[]
}

interface SubmenuState {
  id: string
  x: number
  y: number
  placement: 'right' | 'left'
  positionStrategy: 'top' | 'bottom'
}

interface Position {
  left?: number
  right?: number
  top?: number
  bottom?: number
}

// Render single menu item
const MenuItemComponent: React.FC<MenuItem & { onMouseEnter?: () => void, onMouseLeave?: () => void }> = ({
    icon,
    label,
    onClick,
    className = "",
    disabled = false,
    onMouseEnter,
    onMouseLeave,
}) => {
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseEnter = () => {
        setIsHovered(true);
        onMouseEnter?.();
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        onMouseLeave?.();
    };

    const renderIcon = () => {
        if (!icon) return null;
        if (typeof icon === 'string') return icon;
        return isHovered && icon.hover ? icon.hover : icon.default;
    };

    const renderLabel = () => {
        if (typeof label === 'string' || React.isValidElement(label)) return label;
        if (!label || typeof label !== 'object') return null;
        const labelObj = label as { default: React.ReactNode; hover?: React.ReactNode };
        return isHovered && labelObj.hover ? labelObj.hover : labelObj.default;
    };

    return (
        <li
            className={`px-2 py-1.5 flex items-center gap-2 hover:bg-black/25 dark:hover:bg-white/25 rounded transition-colors duration-200 cursor-pointer ${disabled ? "opacity-50 !cursor-not-allowed hover:bg-transparent" : ""} ${className}`}
            onClick={disabled ? undefined : onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {icon && (
                <span className="material-symbols text-xl aspect-square w-5 flex-shrink-0">
                    {renderIcon()}
                </span>
            )}
            <span className="whitespace-nowrap max-w-[calc(100%-1.5rem)] overflow-hidden text-ellipsis">
                {renderLabel()}
            </span>
        </li>
    )
}

// Divider component
const MenuDividerComponent = () => <li className="h-px bg-black/20 dark:bg-white/20 m-2" />

// Utility function to calculate optimal submenu position
const calculateSubmenuPosition = (
    triggerRect: DOMRect,
    submenuWidth: number,
    submenuHeight: number,
    viewportWidth: number,
    viewportHeight: number
): { position: Position; placement: 'right' | 'left'; positionStrategy: 'top' | 'bottom' } => {
    const MARGIN = 10;
    const SUBMENU_OFFSET = 15; // Gap between main menu and submenu
    
    // Determine horizontal placement
    const spaceRight = viewportWidth - triggerRect.right;
    const spaceLeft = triggerRect.left;
    
    let placement: 'right' | 'left' = 'right';
    let left: number | undefined;
    let right: number | undefined;
    
    if (spaceRight >= submenuWidth + SUBMENU_OFFSET) {
        // Enough space on the right
        placement = 'right';
        left = triggerRect.right + SUBMENU_OFFSET;
    } else if (spaceLeft >= submenuWidth + SUBMENU_OFFSET) {
        // Not enough space on right, but enough on left
        placement = 'left';
        right = viewportWidth - triggerRect.left + SUBMENU_OFFSET;
    } else {
        // Not enough space on either side, position where there's more space
        if (spaceRight > spaceLeft) {
            placement = 'right';
            left = Math.max(MARGIN, Math.min(viewportWidth - submenuWidth - MARGIN, triggerRect.right + SUBMENU_OFFSET));
        } else {
            placement = 'left';
            left = Math.max(MARGIN, triggerRect.left - submenuWidth - SUBMENU_OFFSET);
        }
    }
    
    // Determine vertical placement
    const spaceBelow = viewportHeight - triggerRect.top;
    const spaceAbove = triggerRect.bottom;
    
    let positionStrategy: 'top' | 'bottom' = 'top';
    let top: number | undefined;
    let bottom: number | undefined;
    
    if (spaceBelow >= submenuHeight) {
        // Enough space below
        positionStrategy = 'top';
        top = triggerRect.top;
    } else if (spaceAbove >= submenuHeight) {
        // Not enough space below, but enough above
        positionStrategy = 'bottom';
        bottom = viewportHeight - triggerRect.bottom - 8;
    } else {
        // Not enough space in either direction, position where there's more space
        if (spaceBelow > spaceAbove) {
            positionStrategy = 'top';
            top = Math.max(MARGIN, Math.min(viewportHeight - submenuHeight - MARGIN, triggerRect.top));
        } else {
            positionStrategy = 'bottom';
            bottom = Math.max(MARGIN, viewportHeight - triggerRect.bottom);
        }
    }
    
    return {
        position: { left, right, top, bottom },
        placement,
        positionStrategy
    };
};

// Actual Context Menu component
const ContextMenu: React.FC<ContextMenuProps> = ({
    x,
    y,
    onClose,
    items,
    header,
    className = "",
    extraFocusRefs = [],
}) => {
    const menuRef = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState({ x, y })
    const [activeSubmenu, setActiveSubmenu] = useState<SubmenuState | null>(null)
    const submenuRefs = useRef<Record<string, HTMLLIElement | null>>({})
    const submenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Function to check and update position to stay in viewport
    const updateMenuPosition = useCallback(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect()
            const viewportWidth = window.innerWidth
            const viewportHeight = window.innerHeight
            const MARGIN = 10

            let newX = position.x
            let newY = position.y

            // Check right edge
            if (newX + rect.width > viewportWidth - MARGIN) {
                newX = Math.max(MARGIN, viewportWidth - rect.width - MARGIN)
            }

            // Check left edge
            if (newX < MARGIN) {
                newX = MARGIN
            }

            // Check bottom edge
            if (newY + rect.height > viewportHeight - MARGIN) {
                newY = Math.max(MARGIN, viewportHeight - rect.height - MARGIN)
            }

            // Check top edge
            if (newY < MARGIN) {
                newY = MARGIN
            }

            // Only update if position changed
            if (newX !== position.x || newY !== position.y) {
                setPosition({ x: newX, y: newY })
            }
        }
    }, [position.x, position.y])

    // Initial position setup
    useEffect(() => {
        setPosition({ x, y })
    }, [x, y])

    // Update position when component mounts or position changes
    useLayoutEffect(() => {
        updateMenuPosition()
    }, [updateMenuPosition])

    // Also update position when items change (which might change menu size)
    useEffect(() => {
        updateMenuPosition()
    }, [items, header, updateMenuPosition])

    // Set up window resize listener to reposition menu
    useEffect(() => {
        const handleResize = () => {
            requestAnimationFrame(() => {
                updateMenuPosition();
            });
        };

        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [updateMenuPosition]);

    // Set up mutation observer to detect content changes and recheck positioning
    useEffect(() => {
        if (menuRef.current) {
            const menuObserver = new MutationObserver(() => {
                requestAnimationFrame(() => {
                    updateMenuPosition();
                });
            });

            menuObserver.observe(menuRef.current, {
                childList: true, 
                subtree: true,
                attributes: true,
                characterData: true
            });

            return () => {
                menuObserver.disconnect();
            };
        }
    }, [updateMenuPosition]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current && 
                !menuRef.current.contains(event.target as Node) &&
                // Don't close if clicking inside an active submenu
                !(activeSubmenu && document.getElementById(`submenu-${activeSubmenu.id}`)?.contains(event.target as Node)) &&
                // Don't close if clicking on any of the extra focus refs
                !(extraFocusRefs?.some(ref => ref.current && ref.current.contains(event.target as Node)))
            ) {
                onClose()
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [onClose, activeSubmenu, extraFocusRefs])

    // Clear any submenu close timers on unmount
    useEffect(() => {
        return () => {
            if (submenuCloseTimerRef.current) {
                clearTimeout(submenuCloseTimerRef.current)
            }
        }
    }, [])

    // Handle submenu hover
    const handleSubmenuHover = useCallback((id: string) => {
        // Clear any pending close operations
        if (submenuCloseTimerRef.current) {
            clearTimeout(submenuCloseTimerRef.current)
            submenuCloseTimerRef.current = null
        }

        const element = submenuRefs.current[id]
        if (element) {
            const rect = element.getBoundingClientRect()
            const viewportWidth = window.innerWidth
            const viewportHeight = window.innerHeight

            // Use estimated dimensions for initial positioning
            const submenuEstimatedWidth = 240;
            const submenuEstimatedHeight = 200;
            
            const { position: calculatedPosition, placement, positionStrategy } = calculateSubmenuPosition(
                rect,
                submenuEstimatedWidth,
                submenuEstimatedHeight,
                viewportWidth,
                viewportHeight
            );

            setActiveSubmenu({
                id,
                x: calculatedPosition.left || 0,
                y: calculatedPosition.top || 0,
                placement,
                positionStrategy
            });
        }
    }, [])

    // Handle mouse leave for submenus with delay
    const handleSubmenuMouseLeave = useCallback((id: string) => {
        // Add a small delay before closing to give user time to move to the submenu
        submenuCloseTimerRef.current = setTimeout(() => {
            setActiveSubmenu((prev) => {
                if (prev?.id === id) {
                    return null
                }
                return prev
            })
        }, 100) // 100ms delay before closing
    }, [])

    // Handle mouse enter for the submenu container
    const handleSubmenuContainerMouseEnter = useCallback(() => {
        // Cancel any pending close timer
        if (submenuCloseTimerRef.current) {
            clearTimeout(submenuCloseTimerRef.current)
            submenuCloseTimerRef.current = null
        }
    }, [])

    // Render a submenu
    const renderSubmenu = (submenu: MenuSubmenu) => {
        if (activeSubmenu?.id !== submenu.id) return null

        const triggerElement = submenuRefs.current[submenu.id];
        if (!triggerElement) return null;

        return createPortal(
            <div
                id={`submenu-${submenu.id}`}
                className={`fixed bg-fullMoon/95 dark:bg-night/95 text-black dark:text-white z-50 rounded-lg shadow-xl border border-solid border-black/20 dark:border-white/20 min-w-60 max-w-80 backdrop-blur-md`}
                style={{
                    left: activeSubmenu.x,
                    top: activeSubmenu.y,
                }}
                onMouseEnter={handleSubmenuContainerMouseEnter}
                onMouseLeave={() => handleSubmenuMouseLeave(submenu.id)}
                ref={(el) => {
                    // Fine-tune position after render with actual dimensions
                    if (el) {
                        const rect = el.getBoundingClientRect();
                        const triggerRect = triggerElement.getBoundingClientRect();
                        const viewportWidth = window.innerWidth;
                        const viewportHeight = window.innerHeight;
                        
                        const { position: finalPosition } = calculateSubmenuPosition(
                            triggerRect,
                            rect.width,
                            rect.height,
                            viewportWidth,
                            viewportHeight
                        );
                        
                        // Apply final positioning
                        if (finalPosition.left !== undefined) {
                            el.style.left = `${finalPosition.left}px`;
                            el.style.right = '';
                        } else if (finalPosition.right !== undefined) {
                            el.style.right = `${finalPosition.right}px`;
                            el.style.left = '';
                        }
                        
                        if (finalPosition.top !== undefined) {
                            el.style.top = `${finalPosition.top}px`;
                            el.style.bottom = '';
                        } else if (finalPosition.bottom !== undefined) {
                            el.style.bottom = `${finalPosition.bottom}px`;
                            el.style.top = '';
                        }
                    }
                }}
            >
                <div>
                    {submenu.label && (
                        <div className="px-3 pt-2 font-semibold border-b border-black/20 dark:border-white/20">
                            <h3 className="font-semibold p-1">{submenu.label}</h3>
                        </div>
                    )}

                    <ul className="p-2 max-h-[345px] overflow-y-auto overflow-x-hidden *:text-ellipsis *:whitespace-nowrap">
                        {renderMenuItems(submenu.items)}
                    </ul>
                </div>
            </div>,
            document.body
        )
    }

    // Render menu items recursively
    const renderMenuItems = (menuItems: MenuItemType[]) => {
        return menuItems.map(item => {
            if (item.type === 'divider') {
                return <MenuDividerComponent key={item.id} />
            } else if (item.type === 'submenu') {
                const submenu = item as MenuSubmenu
                return (
                    <React.Fragment key={submenu.id}>
                        <li
                            ref={(el: HTMLLIElement | null) => {
                                submenuRefs.current[submenu.id] = el;
                            }}
                            className={`px-2 py-1.5 flex items-center gap-2 hover:bg-black/25 dark:hover:bg-white/25 rounded relative transition-colors duration-200 cursor-pointer ${submenu.className || ''}`}
                            onMouseEnter={() => handleSubmenuHover(submenu.id)}
                            onMouseLeave={() => handleSubmenuMouseLeave(submenu.id)}
                        >
                            {submenu.icon && <span className="material-symbols text-xl aspect-square w-5 flex-shrink-0">{submenu.icon}</span>}
                            <span className="whitespace-nowrap max-w-[calc(100%-1.5rem)] overflow-hidden text-ellipsis">{submenu.label}</span>
                            <span className="material-symbols text-sm ml-auto">arrow_right</span>
                        </li>
                        {renderSubmenu(submenu)}
                    </React.Fragment>
                )
            } else if (item.type === 'custom') {
                const customItem = item as MenuCustom
                return (
                    <li key={customItem.id} className={customItem.className || ''}>
                        {customItem.content}
                    </li>
                )
            } else {
                const menuItem = item as MenuItem
                return (
                    <MenuItemComponent
                        key={menuItem.id}
                        {...menuItem}
                        label={menuItem.label}
                        onClick={() => {
                            menuItem.onClick?.()
                            if (menuItem.onClick && !menuItem.keepOpen) {
                                onClose()
                            }
                        }}
                    />
                )
            }
        })
    }

    return createPortal(
        <div
            ref={menuRef}
            className={`fixed bg-fullMoon/95 dark:bg-night/95 text-black dark:text-white z-50 rounded-lg shadow-xl border border-solid border-black/20 dark:border-white/20 min-w-48 max-w-72 backdrop-blur-md ${className}`}
            style={{ left: position.x, top: position.y }}
        >
            <div>
                {header && (
                    <div className="px-3 pt-2 font-semibold border-b border-black/20 dark:border-white/20 flex items-center gap-2">
                        {header.icon && (
                            <img src={header.icon} alt="Icon" className="w-5 h-5 object-contain" />
                        )}
                        <span className="truncate">{header.title}</span>
                    </div>
                )}

                <ul className="p-2">
                    {renderMenuItems(items)}
                </ul>
            </div>
        </div>,
        document.body
    )
}

export default ContextMenu