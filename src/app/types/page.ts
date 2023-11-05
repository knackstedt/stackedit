type Tag = {
    key: string,
    value: string;
}

export const PageKinds = [
    { id: "markdown", label: "Markdown" },
    // { id: "canvas", label: "Canvas -- WIP" },
    { id: "code", label: "Code" },
    { id: "fetch", label: "Fetch" }
]
/**
 * All properties will trigger filesystem reflect updates.
 */
export type Page = {
    path: string,
    /**
     * markdown => normal Stackedit markdown file (with
     *      partner json file)
     * markdown-raw => raw markdown file. No additional features
     *      can be enabled on it.
     *      - Exclusive to Tauri mode
     * canvas => WIP
     * code => any text file
     * fetch => postman-like interface
     */
    kind: "markdown" |
          "markdown-raw" |
          "canvas" |
          "code" |
          "fetch";
    name?: string;
    autoName?: boolean;
    content: string;
    order?: number;
    expanded?: boolean;
    icon?: string; // mat icon
    color?: string; // color
    readonly?: boolean;
    bookmarked?: boolean;
    canDelete?: boolean;
    variables?: { [key: string]: string; };
    options?: { [key: string]: string; };
    tags?: Tag[];
    created: number;
    modified: number;
    deleted?: number;
    children?: Page[];
};

