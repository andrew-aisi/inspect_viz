export const isUrl = (value: string): boolean => {
    try {
        new URL(value);
        return true;
    } catch (e) {
        return false;
    }
};

export const isLinkableUrl = (value: string): boolean => {
    return isUrl(value) && value.startsWith('http');
};
