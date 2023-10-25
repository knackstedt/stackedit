import { Editor, SectionDesc } from '../editor';

export class SectionDimension {
    height: number;
    constructor(public startOffset: number, public endOffset: number) {
        this.height = endOffset - startOffset;
    }
}

const dimensionNormalizer = dimensionName => (editorSvc) => {
    const dimensionList = editorSvc.previewCtx.sectionDescList
        .map(sectionDesc => sectionDesc[dimensionName]);

    for (let i = 0; i < dimensionList.length; i += 1) {
        let dimension = dimensionList[i];
        if (dimension.height) {
            let j;
            for (j = i + 1; j < dimensionList.length && dimensionList[j].height === 0; j += 1) {
                // Loop
            }
            const normalizeFactor = j - i;
            if (normalizeFactor !== 1) {
                const normalizedHeight = dimension.height / normalizeFactor;
                dimension.height = normalizedHeight;
                dimension.endOffset = dimension.startOffset + dimension.height;
                for (j = i + 1; j < i + normalizeFactor; j += 1) {
                    const startOffset = dimension.endOffset;
                    dimension = dimensionList[j];
                    dimension.startOffset = startOffset;
                    dimension.height = normalizedHeight;
                    dimension.endOffset = dimension.startOffset + dimension.height;
                }
                i = j - 1;
            }
        }
    }
};

const normalizeEditorDimensions = dimensionNormalizer('editorDimension');
const normalizePreviewDimensions = dimensionNormalizer('previewDimension');
const normalizeTocDimensions = dimensionNormalizer('tocDimension');

export default {
    measureSectionDimensions(editorSvc: Editor) {
        let editorSectionOffset = 0;
        let previewSectionOffset = 0;
        let tocSectionOffset = 0;
        let prevSectionDesc = editorSvc.previewCtx.sectionDescList[0];
        let nextSectionDesc: SectionDesc;

        let i = 0;
        for (; i < editorSvc.previewCtx.sectionDescList.length; i++) {
            nextSectionDesc = editorSvc.previewCtx.sectionDescList[i];

            // Measure editor section
            let newEditorSectionOffset = nextSectionDesc.editorElt.offsetTop;

            // console.log({ e: nextSectionDesc.editorElt, editorSectionOffset })

            newEditorSectionOffset = Math.max(newEditorSectionOffset, editorSectionOffset);
            prevSectionDesc.editorDimension = new SectionDimension(
                // 0,
                newEditorSectionOffset,
                nextSectionDesc.editorElt.offsetTop +
                nextSectionDesc.editorElt.offsetHeight
                // newEditorSectionOffset,
            );
            editorSectionOffset = newEditorSectionOffset;

            // Measure preview section
            let newPreviewSectionOffset = nextSectionDesc.previewElt
                ? nextSectionDesc.previewElt.offsetTop
                : previewSectionOffset;
            newPreviewSectionOffset = Math.max(newPreviewSectionOffset, previewSectionOffset);
            prevSectionDesc.previewDimension = new SectionDimension(
                previewSectionOffset,
                newPreviewSectionOffset,
            );
            previewSectionOffset = newPreviewSectionOffset;

            // Measure TOC section
            let newTocSectionOffset = nextSectionDesc.tocElt
                ? nextSectionDesc.tocElt.offsetTop + (nextSectionDesc.tocElt.offsetHeight / 2)
                : tocSectionOffset;
            newTocSectionOffset = Math.max(newTocSectionOffset, tocSectionOffset);

            prevSectionDesc.tocDimension = new SectionDimension(tocSectionOffset, newTocSectionOffset);
            tocSectionOffset = newTocSectionOffset;


            // console.log({ editor: editorSectionOffset, preview: previewSectionOffset, toc: tocSectionOffset })

            prevSectionDesc = nextSectionDesc;
        }

        // Last section
        prevSectionDesc = editorSvc.previewCtx.sectionDescList[i - 1];
        if (prevSectionDesc) {
            prevSectionDesc.editorDimension = new SectionDimension(
                editorSectionOffset,
                editorSvc['editorElt'].scrollHeight,
            );
            prevSectionDesc.previewDimension = new SectionDimension(
                previewSectionOffset,
                editorSvc['previewElt'].scrollHeight,
            );
            prevSectionDesc.tocDimension = new SectionDimension(
                tocSectionOffset,
                editorSvc['tocElt'].scrollHeight,
            );
        }

        normalizeEditorDimensions(editorSvc);
        normalizePreviewDimensions(editorSvc);
        normalizeTocDimensions(editorSvc);
    },
};
