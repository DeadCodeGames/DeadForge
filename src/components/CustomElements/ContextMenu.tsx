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
    const menuObserver = useRef<MutationObserver | null>(null)

    // Function to check and update position to stay in viewport
    const updateMenuPosition = useCallback(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect()
            const viewportWidth = window.innerWidth
            const viewportHeight = window.innerHeight

            let newX = position.x
            let newY = position.y

            if (newX + rect.width > viewportWidth) {
                newX = Math.max(viewportWidth - rect.width - 10, 0)
            }

            if (newY + rect.height > viewportHeight) {
                newY = Math.max(viewportHeight - rect.height - 10, 0)
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
    }, [position.x, position.y, updateMenuPosition])

    useEffect(() => {
        updateMenuPosition()
    }, [position.x, position.y, updateMenuPosition])

    // Set up mutation observer to detect content changes and recheck positioning
    useEffect(() => {
        if (menuRef.current) {
            // Create mutation observer to detect when content changes
            menuObserver.current = new MutationObserver(() => {
                // Wait a short delay for the DOM to update
                requestAnimationFrame(() => {
                    updateMenuPosition();
                    
                    // Also update any active submenu position
                    if (activeSubmenu) {
                        const submenuEl = document.getElementById(`submenu-${activeSubmenu.id}`);
                        if (submenuEl) {
                            const rect = submenuEl.getBoundingClientRect();
                            const viewportWidth = window.innerWidth;
                            const viewportHeight = window.innerHeight;
                            
                            // Adjust if the submenu extends beyond viewport
                            if (rect.right > viewportWidth) {
                                submenuEl.style.left = `${Math.max(10, viewportWidth - rect.width - 10)}px`;
                            }
                            
                            if (rect.bottom > viewportHeight) {
                                if (activeSubmenu.positionStrategy === 'top') {
                                    submenuEl.style.top = `${Math.max(10, viewportHeight - rect.height - 10)}px`;
                                } else {
                                    submenuEl.style.bottom = `${Math.max(10, viewportHeight - rect.height - 10)}px`;
                                }
                            }
                        }
                    }
                });
            });

            // Observe for changes in the menu and its children
            menuObserver.current.observe(menuRef.current, {
                childList: true, 
                subtree: true,
                attributes: true,
                characterData: true
            });
        }

        return () => {
            if (menuObserver.current) {
                menuObserver.current.disconnect();
            }
        };
    }, [updateMenuPosition, activeSubmenu]);

    // Set up window resize listener to reposition menu
    useEffect(() => {
        const handleResize = () => {
            requestAnimationFrame(() => {
                // Update main context menu position
                updateMenuPosition();
                
                // Also adjust any active submenu
                if (activeSubmenu) {
                    const submenuEl = document.getElementById(`submenu-${activeSubmenu.id}`);
                    if (submenuEl) {
                        const rect = submenuEl.getBoundingClientRect();
                        const viewportWidth = window.innerWidth;
                        const viewportHeight = window.innerHeight;
                        
                        if (rect.right > viewportWidth) {
                            submenuEl.style.left = `${Math.max(10, viewportWidth - rect.width - 10)}px`;
                        }
                        
                        if (rect.bottom > viewportHeight) {
                            if (activeSubmenu.positionStrategy === 'top') {
                                submenuEl.style.top = `${Math.max(10, viewportHeight - rect.height - 10)}px`;
                            } else {
                                submenuEl.style.bottom = `${Math.max(10, viewportHeight - rect.height - 10)}px`;
                            }
                        }
                    }
                }
            });
        };

        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [updateMenuPosition, activeSubmenu]);

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

    // Watch for active submenu changes and set up observer for the submenu
    useEffect(() => {
        if (activeSubmenu) {
            // After a short delay to allow the submenu to render
            const timerId = setTimeout(() => {
                const submenuEl = document.getElementById(`submenu-${activeSubmenu.id}`);
                
                if (submenuEl && menuObserver.current) {
                    // Observe the submenu for content changes
                    menuObserver.current.observe(submenuEl, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        characterData: true
                    });
                }
            }, 50);
            
            return () => {
                clearTimeout(timerId);
            };
        }
    }, [activeSubmenu]);

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
      
            // Check if there's enough space to the right for the submenu
            const spaceToRight = viewportWidth - rect.right - 10 // 10px padding
            const submenuEstimatedWidth = 200 // Estimate of the submenu width
      
            // Calculate the optimal horizontal position
            let placement: 'right' | 'left' = 'right'
            let posX = rect.right
      
            if (spaceToRight < submenuEstimatedWidth) {
                // Not enough space to the right, place to the left
                placement = 'left'
                posX = rect.left - submenuEstimatedWidth
            }
      
            // Determine if we should position from top or bottom
            let positionStrategy: 'top' | 'bottom' = 'top'
            let posY = rect.top
      
            // Check if there's enough space below
            const spaceBelow = viewportHeight - rect.top
            const submenuEstimatedHeight = 200 // Estimate - adjust based on average submenu height
      
            if (spaceBelow < submenuEstimatedHeight) {
                // Not enough space below, use bottom positioning
                positionStrategy = 'bottom'
                posY = viewportHeight - rect.bottom - 9
            }
      
            setActiveSubmenu({ 
                id, 
                x: posX, 
                y: posY, 
                placement,
                positionStrategy 
            })
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

        // Calculate submenu position based on current viewport
        const calculateSubmenuPosition = () => {
            const viewportWidth = window.innerWidth;
            
            // Only need viewportWidth for initial calculation
            let posX = activeSubmenu.x;
            const posY = activeSubmenu.y;
            
            // Basic positioning based on viewport edges
            // We can't know exact submenu dimensions yet, but we can make reasonable estimates
            const estimatedWidth = 240; // Estimated submenu width
            
            if (posX + estimatedWidth > viewportWidth) {
                // Not enough space on right, try to position left
                const leftPosition = posX - estimatedWidth;
                if (leftPosition > 0) {
                    posX = leftPosition;
                } else {
                    // Not enough space left either, center as best we can
                    posX = Math.max(10, viewportWidth - estimatedWidth - 10);
                }
            }
            
            return {
                left: posX,
                top: activeSubmenu.positionStrategy === 'top' ? posY : undefined,
                bottom: activeSubmenu.positionStrategy === 'bottom' ? posY : undefined
            };
        };
        
        // Get the initial position
        const submenuPosition = calculateSubmenuPosition();

        return createPortal(
            <div
                id={`submenu-${submenu.id}`}
                className={`fixed bg-fullMoon/95 dark:bg-night/95 text-black dark:text-white z-50 rounded-lg shadow-xl border border-solid border-black/20 dark:border-white/20 min-w-48 max-w-80 backdrop-blur-md ${
                    activeSubmenu.placement === 'left' ? 'mr-3' : 'ml-3'
                }`}
                style={submenuPosition}
                onMouseEnter={handleSubmenuContainerMouseEnter}
                onMouseLeave={() => handleSubmenuMouseLeave(submenu.id)}
                ref={(el) => {
                    // Once the element is rendered, we can make final position adjustments
                    if (el) {
                        const rect = el.getBoundingClientRect();
                        const viewportWidth = window.innerWidth;
                        const viewportHeight = window.innerHeight;
                        const mainMenuRect = menuRef.current?.getBoundingClientRect() || { width: 0, x: viewportWidth, right: 0 };
                        console.log(mainMenuRect, rect)
                        // Adjust if the submenu extends beyond viewport
                        if (rect.right > viewportWidth) {
                            el.style.right = `${rect.width + mainMenuRect.width + (viewportWidth - mainMenuRect.right)}px`;
                            el.style.left = 'auto';
                        }
                        
                        if (rect.bottom > viewportHeight) {
                            if (activeSubmenu.positionStrategy === 'top') {
                                el.style.top = `${Math.max(10, viewportHeight - rect.height - 10)}px`;
                            } else {
                                el.style.bottom = `${Math.max(10, viewportHeight - rect.height - 10)}px`;
                            }
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
                            className={`px-2 py-1.5 flex items-center gap-2 hover:bg-black/25 dark:hover:bg-white/25 rounded relative transition-colors duration-200 cursor-pointer after:content-[''] after:absolute after:left-full after:top-0 after:w-4 after:h-full after:bg-transparent ${submenu.className || ''}`}
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