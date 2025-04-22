import React from 'react';

export default function FlipSwitch({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {

    props.id = props.id || `flip-switch-${Math.random().toString(36).substring(2, 9)}`

    return (
        <div className={`inline-flex items-center ${props.disabled ? 'text-gray-300 dark:text-gray-600' : ''} ${className || ''}`}>
            <input
                type="checkbox"
                className="sr-only peer disabled:opacity-50"
                id={props.id}
                {...props}
            />
            <label
                htmlFor={props.id}
                className={`
                    relative w-11 h-6 bg-notQuiteBlack peer-checked:bg-purpleNotFound dark:bg-notQuiteWhite dark:peer-checked:bg-cornflowerBlue rounded-full peer-focus:outline-none peer-active:after:w-6
                    peer-checked:after:left-[calc(100%-20px)] peer-checked:active:after:left-[calc(100%-28px)] after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-fullMoon peer-checked:after:bg-fullMoon dark:after:bg-night after:rounded-full after:size-4 after:transition-all after:duration-200
                    opacity-50 peer-checked:opacity-100 transition-colors duration-200 cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-30 
                `}
            >
            </label>
        </div>
    );
};