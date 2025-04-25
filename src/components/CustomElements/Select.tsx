import React, { useState, useRef, useEffect } from "react";

type SelectOptionProps = {
  value: string;
  children: React.ReactNode;
  selected?: boolean;
  onClick?: (value: string) => void;
  measuringRef?: React.Ref<HTMLDivElement>;
};

export const SelectOption: React.FC<SelectOptionProps> = ({ value, children, selected, onClick, measuringRef }) => {
  return (
    <div
      ref={measuringRef}
      className={`p-2 cursor-pointer flex items-center justify-between w-[calc(100%-16px)] hover:bg-opacity-10 hover:bg-notQuiteBlack dark:hover:bg-opacity-10 dark:hover:bg-notQuiteWhite ${selected ? 'bg-opacity-20 bg-notQuiteBlack dark:bg-opacity-20 dark:bg-notQuiteWhite' : ''}`}
      onClick={() => onClick && onClick(value)}
    >
      {children}
    </div>
  );
};

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  placeholder?: string;
};

export const Select: React.FC<SelectProps> = ({ value, onChange, children, className = "", placeholder = "Select an option" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [minWidth, setMinWidth] = useState<number>(0);
  const selectRef = useRef<HTMLDivElement>(null);
  const [initialRender, setInitialRender] = useState(true);
  
  const selectedChild = React.Children.toArray(children).find(
    (child: any) => React.isValidElement(child) && (child.props as any).value === value
  );
  
  const displayValue = selectedChild && React.isValidElement(selectedChild)
    ? (selectedChild.props as any).children
    : placeholder;
  
  useEffect(() => {
    if (initialRender) {
      setInitialRender(false);
      
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.visibility = 'hidden';
      tempContainer.style.pointerEvents = 'none';
      tempContainer.style.zIndex = '-1000';
      document.body.appendChild(tempContainer);
      
      let maxWidth = 0;
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
          const optionDiv = document.createElement('div');
          optionDiv.style.display = 'inline-block';
          optionDiv.style.padding = '8px'; // p-2
          
          const childContent = (child.props as any).children;
          if (typeof childContent === 'string') {
            optionDiv.textContent = childContent;
          } else if (React.isValidElement(childContent)) {
            const tempContent = document.createElement('div');
            tempContent.style.display = 'flex';
            tempContent.style.justifyContent = 'space-between';
            tempContent.style.width = 'fit-content';
            tempContent.textContent = 'Placeholder for complex content';
            optionDiv.appendChild(tempContent);
          }
          
          tempContainer.appendChild(optionDiv);
          maxWidth = Math.max(maxWidth, optionDiv.offsetWidth + 40);
        }
      });
      
      document.body.removeChild(tempContainer);
      
      setMinWidth(Math.max(maxWidth, 120));
    }
  }, [children, initialRender]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };
  
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        ...(child.props as any),
        onClick: handleOptionClick,
        selected: (child.props as any).value === value
      });
    }
    return child;
  });
  
  return (
    <div 
      ref={selectRef} 
      className={`relative ${className}`} 
      style={{ minWidth: minWidth > 0 ? `${minWidth}px` : 'auto' }}
    >
      <div
        className="p-2 rounded-lg dark:bg-night bg-fullMoon border border-notQuiteBlack dark:border-notQuiteWhite cursor-pointer flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-grow min-w-0">{displayValue}</div>
        <span className={`material-symbols ml-2 flex-shrink-0 transition-transform duration-200 ${isOpen ? '-scale-y-100' : 'scale-y-100'}`}>
          expand_more
        </span>
      </div>
      
      {isOpen && (
        <div 
          className="absolute z-10 mt-6 rounded-lg dark:bg-night bg-fullMoon border border-notQuiteBlack dark:border-notQuiteWhite shadow-lg max-h-60 -translate-y-2 -translate-x-2 overflow-x-hidden overflow-y-auto"
          style={{ minWidth: '100%', width: 'max-content' }}
        >
          <div className="w-full">
            {enhancedChildren}
          </div>
        </div>
      )}
    </div>
  );
};