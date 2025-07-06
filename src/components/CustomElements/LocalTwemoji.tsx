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

    let processedChildren = children;
    if (typeof children === "string") {
        // Special case for LOLCAT flag
        processedChildren = children.split("🏳️‍🇱‍🇴‍🇱‍‍").map((part, i, arr) =>
            i < arr.length - 1
                ? [part.split("🏳️‍🇪‍🇳‍🇬‍‍").map((part, i, arr) =>
                    i < arr.length - 1
                        ? [part, (
                            <img
                                key={"inteng-" + i}
                                draggable="false"
                                className={(options as any)?.className}
                                alt="🏳️‍🇪‍🇳‍🇬‍‍"
                                src={process.env.PUBLIC_URL + "/twemoji/svg/1f3f3-fe0f-200d-1f1ea-200d-1f1f3-200d-1f1ec-200d.svg"}
                            />
                        )]
                        : part
                ), (
                    <img
                        key={"lolcat-" + i}
                        draggable="false"
                        className={(options as any)?.className}
                        alt="🏳️‍🇱‍🇴‍🇱‍‍"
                        src={process.env.PUBLIC_URL + "/twemoji/svg/1f3f3-fe0f-200d-1f1f1-200d-1f1f4-200d-1f1f1-200d.svg"}
                    />
                )]
                : part.split("🏳️‍🇪‍🇳‍🇬‍‍").map((part, i, arr) =>
                    i < arr.length - 1
                        ? [part, (
                            <img
                                key={"inteng-" + i}
                                draggable="false"
                                className={(options as any)?.className}
                                alt="🏳️‍🇪‍🇳‍🇬‍‍"
                                src={process.env.PUBLIC_URL + "/twemoji/svg/1f3f3-fe0f-200d-1f1ea-200d-1f1f3-200d-1f1ec-200d.svg"}
                            />
                        )]
                        : part
                )
        );
    }

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
            {processedChildren}
        </Twemoji>
    );
};

export default LocalTwemoji;