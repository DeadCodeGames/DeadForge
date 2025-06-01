import React from 'react';
import ContextMenu, { MenuItemType } from '@/components/CustomElements/ContextMenu';

interface CollectionContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  collection: {
    id: string;
    name: string;
    isExpanded: boolean;
    isFavorites?: boolean;
    isUserDefined?: boolean;
  };
  // eslint-disable-next-line no-unused-vars
  onToggleExpand: (id: string) => void;
  // eslint-disable-next-line no-unused-vars
  onRename?: (id: string, name: string) => void;
  // eslint-disable-next-line no-unused-vars
  onDelete?: (id: string) => void;
  onClearFavorites?: () => void;
}

const CollectionContextMenu: React.FC<CollectionContextMenuProps> = ({
    x,
    y,
    onClose,
    collection,
    onToggleExpand,
    onRename,
    onDelete,
    onClearFavorites
}) => {
    // Prepare menu items array
    const menuItems: MenuItemType[] = [
    // Expand/Collapse - available for all collections
        {
            id: 'toggle-expand',
            icon: collection.isExpanded ? 'unfold_less' : 'unfold_more',
            label: collection.isExpanded ? 'Collapse' : 'Expand',
            onClick: () => onToggleExpand(collection.id)
        }
    ];

    // Add Clear Favorites option for the Favorites collection
    if (collection.isFavorites && onClearFavorites) {
        menuItems.push({
            id: 'divider-1',
            type: 'divider'
        });

        menuItems.push({
            id: 'clear-favorites',
            icon: 'delete_sweep',
            label: 'Clear Favorites',
            onClick: onClearFavorites,
            className: 'text-orange-400'
        });
    }

    // Add Rename and Delete options for user-defined collections
    if (collection.isUserDefined && !collection.isFavorites) {
        if (menuItems.length > 1) {
            // If we already added something after the first item, add another divider
            menuItems.push({
                id: 'divider-2',
                type: 'divider'
            });
        } else {
            // Otherwise add the first divider
            menuItems.push({
                id: 'divider-1',
                type: 'divider'
            });
        }

        // Add Rename option
        if (onRename) {
            menuItems.push({
                id: 'rename',
                icon: 'drive_file_rename_outline',
                label: 'Rename Collection',
                onClick: () => onRename(collection.id, collection.name)
            });
        }

        // Add Delete option
        if (onDelete) {
            menuItems.push({
                id: 'delete',
                icon: 'delete',
                label: 'Delete Collection',
                onClick: () => {
                    if (window.confirm(`Are you sure you want to delete "${collection.name}" collection?`)) {
                        onDelete(collection.id);
                    }
                },
                className: 'text-red-400'
            });
        }
    }

    return (
        <ContextMenu
            x={x}
            y={y}
            onClose={onClose}
            items={menuItems}
            header={{
                title: collection.name
            }}
        />
    );
};

export default CollectionContextMenu; 