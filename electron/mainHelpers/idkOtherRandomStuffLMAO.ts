export function getFriendlyOSName(osName: NodeJS.Platform) {
    switch (osName) {
        case 'darwin': return 'mac';
        case 'win32': return 'windows';
        default: return 'linux';
    }
}

export function maybeConvertArray(obj: any): any {
    if (!Object.keys(obj).length) { return obj; }
    if (
        obj &&
        typeof obj === "object" &&
        !Array.isArray(obj)
    ) {
        const keys = Object.keys(obj);
        if (keys.every(k => String(Number(k)) === k)) {
            const arr: any = [];
            for (const k of keys.sort((a, b) => Number(a) - Number(b))) {
                arr.push(maybeConvertArray(obj[k]));
            }
            return arr;
        } else {
            const helperObj: Record<string | number, any> = {}
            for (const key of keys) {
                helperObj[key] = maybeConvertArray(obj[key]);
            }
            return helperObj;
        }
    } else if (
        obj &&
        typeof obj === "object" &&
        Array.isArray(obj)
    ) {
        const arr: any = [];
        for (let i = 0; i < obj.length; i++) {
            arr[i] = maybeConvertArray(obj[i]);
        }
        return arr;
    }
    return obj;
}
