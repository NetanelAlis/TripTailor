export function createPageUrl(pageName) {
    const baseUrl = import.meta.env.BASE_URL || '';
    return `${baseUrl}/${pageName}`;
}
