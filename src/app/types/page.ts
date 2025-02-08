type Tag = {
    key: string,
    value: string;
}

/**
 * List of known page kinds for edit dialog dropdown
 */
export const PageKinds = [
    { id: "markdown", label: "Markdown" },
    { id: "canvas", label: "Diagram" },
    { id: "code", label: "Code" },
    { id: "fetch", label: "Fetch" }
]
/**
 * All properties will trigger filesystem reflect updates.
 */
export type Page = {
    /**
     * unix-like directory the page exists in
     * should start and end with forward slashes.
     * e.g.
     * /project/goal/
     */
    path: string,
    /**
     * Filename in the FS. Can be interpreted from the label.
     */
    filename: string,
    /**
     * markdown => normal Stackedit markdown file (with
     *      partner json file)
     * raw => raw file. No additional features
     *      can be enabled on it.
     * canvas => WIP
     * code => any text file
     * fetch => postman-like interface
     */
    kind: "directory" |
          "markdown" |
          "raw" |
          "canvas" |
          "code" |
          "fetch";
    label?: string;
    autoLabel?: boolean;
    order?: number;
    expanded?: boolean;
    icon?: string; // mat icon
    color?: string; // color
    readonly?: boolean;
    bookmarked?: boolean;
    canDelete?: boolean;
    variables?: { [key: string]: string; };
    options?: { [key: string]: any; };
    tags?: Tag[];
    created: number;
    modified: number;
    deleted?: number;


    /**
     * Computed properties:
     * These shall not be saved to disk.
     */
    hasLoaded?: boolean;
    content?: string;
    children?: Page[];
    /**
     * If the tab is being previewed (not completely added to tab list)
     */
    isPreviewTab?: true;
};

