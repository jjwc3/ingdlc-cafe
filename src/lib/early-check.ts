/**
 * URL captured when the content script was injected at document_start.
 * SPA routing and redirects mutate `location` later, so snapshot it once.
 */
export const initialPathname = location.pathname;
export const initialSearch = location.search;
