import React, { useMemo } from 'react';
import Twemoji, { TwemojiProps } from 'react-twemoji';

type LocalTwemojiProps = TwemojiProps & {
    /** If true, assumes all emojis are controlled & available offline */
    controlled?: boolean;
    /** Local base URL for offline emoji loading (e.g. "/twemoji/") */
    localBaseUrl?: string;
    /** Optional override for the CDN base */
    baseUrl?: string;
};

const isPackaged = window.App?.isPackaged ?? false; // from preload

const LocalTwemoji: React.FC<LocalTwemojiProps> = ({
    controlled = false,
    localBaseUrl = process.env.PUBLIC_URL + '/twemoji/',
    baseUrl,
    options,
    children,
    ...rest
}) => {
    const actualBase = useMemo(() => {
        if (controlled && isPackaged) return localBaseUrl;
        if (baseUrl) return baseUrl;
        return undefined;
    }, [controlled, localBaseUrl, baseUrl]);

    return (
        <Twemoji
            options={{
                ...options,
                base: actualBase,
                folder: 'svg',
                ext: '.svg',
            }}
            {...rest}
        >
            {children}
        </Twemoji>
    );
};

export default LocalTwemoji;