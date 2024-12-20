import Prism from '../prism';
import markdownitAbbr from 'markdown-it-abbr';
import markdownitDeflist from 'markdown-it-deflist';
import markdownitFootnote from 'markdown-it-footnote';
import markdownitMark from 'markdown-it-mark';
// import markdownitImgsize from 'markdown-it-imsize';
import markdownitSub from 'markdown-it-sub';
import markdownitSup from 'markdown-it-sup';
import markdownitTasklist from './libs/markdownItTasklist';
import markdownitAnchor from './libs/markdownItAnchor';
import MarkdownIt from 'markdown-it';
import { Editor } from '../editor';

const coreBaseRules = [
    'normalize',
    'block',
    'inline',
    'linkify',
    'replacements',
    'smartquotes',
];
const blockBaseRules = [
    'code',
    'fence',
    'blockquote',
    'hr',
    'list',
    'reference',
    'heading',
    'lheading',
    'html_block',
    'table',
    'paragraph',
];
const inlineBaseRules = [
    'text',
    'newline',
    'escape',
    'backticks',
    'strikethrough',
    'emphasis',
    'link',
    'image',
    'autolink',
    'html_inline',
    'entity',
];
const inlineBaseRules2 = [
    'balance_pairs',
    'strikethrough',
    'emphasis',
    // 'text_collapse'
];
export default (editorSvc: Editor) => {
    // editorSvc.onGetOptions((options, properties) => Object
    //     .assign(options, properties.extensions.markdown));

    editorSvc.onInitConverter(0, (markdown: MarkdownIt, options) => {
        markdown.set({
            html: true,
            breaks: true,
            linkify: true,
            typographer: true,
            langPrefix: 'prism language-',
        });

        markdown.core.ruler.enable(coreBaseRules);

        const blockRules = blockBaseRules.slice();
        markdown.block.ruler.enable(blockRules);

        const inlineRules = inlineBaseRules.slice();
        const inlineRules2 = inlineBaseRules2.slice();
        markdown.inline.ruler.enable(inlineRules);
        markdown.inline.ruler2.enable(inlineRules2);

        if (options.imgsize) {
            // TODO: Restore this without having a stroke
            // >> Module not found: Error: Can't resolve 'fs' in '/home/knackstedt/source/@dotglitch/stackedit/node_modules/markdown-it-imsize/lib/imsize/types'
            // markdown.use(markdownitImgsize);
        }
        markdown.use(markdownitAbbr);
        markdown.use(markdownitDeflist);
        markdown.use(markdownitFootnote);
        markdown.use(markdownitMark);
        markdown.use(markdownitSub);
        markdown.use(markdownitSup);
        markdown.use(markdownitTasklist);
        markdown.use(markdownitAnchor);


        // Transform style into align attribute to pass the HTML sanitizer
        const textAlignLength = 'text-align:'.length;
        markdown.renderer.rules['td_open'] = (tokens, idx, opts) => {
            const token = tokens[idx];
            if (token.attrs && token.attrs.length && token.attrs[0][0] === 'style') {
                token.attrs = [
                    ['align', token.attrs[0][1].slice(textAlignLength)],
                ];
            }
            return markdown.renderer.renderToken(tokens, idx, opts);
        };
        markdown.renderer.rules['th_open'] = markdown.renderer.rules['td_open'];

        markdown.renderer.rules['footnote_ref'] = (tokens, idx) => {
            const n = `${Number(tokens[idx].meta.id + 1)}`;
            let id = `fnref${n}`;
            if (tokens[idx].meta.subId > 0) {
                id += `:${tokens[idx].meta.subId}`;
            }
            return `<sup class="footnote-ref"><a href="#fn${n}" id="${id}">${n}</a></sup>`;
        };
    });

    editorSvc.onSectionPreview((elt, options, isEditor) => {
        // Highlight with Prism
        elt.querySelectorAll('.prism').forEach((prismElt) => {
            if (!prismElt.$highlightedWithPrism) {
                Prism.highlightElement(prismElt);
                prismElt.$highlightedWithPrism = true;

                // Save as piktuuure
                if (prismElt.classList.contains("language-mermaid")) {
                    const copyButton = document.createElement('mat-icon');
                    copyButton.classList.add("material-icons");
                    copyButton.classList.add("copy-button");
                    copyButton.innerHTML = "download";
                    copyButton.onclick = () => {
                        const ulid = elt.getAttribute("ulid");
                        const diagram = editorSvc.previewElt.querySelector(`[ulid="${ulid}"] .language-mermaid svg`);
                        const svg = diagram.outerHTML
                            .replace(/<br>/g, '<br/>');

                        const blob = new Blob([svg], { type: 'image/svg+xml' });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);

                        a.download = `mermaid-diagram.svg`;
                        a.style.position = 'fixed';
                        a.style.left = '-1000vw';
                        a.target = '_blank';
                        a.setAttribute("rel", 'noopener');

                        document.body.appendChild(a);
                        a.click();
                        a.remove();

                    };
                    prismElt.parentElement.parentElement.append(copyButton);
                }
                else {
                    const copyButton = document.createElement('mat-icon');
                    copyButton.classList.add("material-icons");
                    copyButton.classList.add("copy-button");
                    copyButton.innerHTML = "content_copy";
                    copyButton.onclick = () => {
                        navigator.clipboard.writeText(prismElt.textContent);
                    };
                    prismElt.parentElement.append(copyButton);
                }
            }
        });

        // Transform task spans into checkboxes
        elt.querySelectorAll('.task-list-item-checkbox').forEach((spanElt: HTMLElement) => {
            const target = spanElt.parentElement as HTMLElement;
            const label = target.textContent.replace(/^[☑☐]\s?/, '');
            const isChecked = spanElt.getAttribute("checked") != null;

            target.innerHTML = `<input type="checkbox" ${isChecked ? 'checked="true"' : ''}><label> ${label}</label>`;
        });
    });
};
