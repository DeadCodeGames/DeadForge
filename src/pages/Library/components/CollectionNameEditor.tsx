import React, { useEffect, useRef, useState } from 'react';

interface CollectionNameEditorProps {
  initialName: string;
  // eslint-disable-next-line no-unused-vars
  onSave: (newName: string) => void;
  onCancel: () => void;
}

const CollectionNameEditor: React.FC<CollectionNameEditorProps> = ({
    initialName,
    onSave,
    onCancel
}) => {
    const [name, setName] = useState(initialName);
    const inputRef = useRef<HTMLInputElement>(null);
  
    useEffect(() => {
    // Focus the input when the component mounts
        inputRef.current?.focus();
        // Select all text
        inputRef.current?.select();
    }, []);

    const handleSave = () => {
        const trimmedName = name.trim();
        if (trimmedName && trimmedName !== initialName) {
            onSave(trimmedName);
        } else {
            onCancel();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    };

    return (
        <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full bg-white/10 px-1 py-0 outline-none rounded font-medium"
            autoFocus
            maxLength={32}
        />
    );
};

export default CollectionNameEditor; 