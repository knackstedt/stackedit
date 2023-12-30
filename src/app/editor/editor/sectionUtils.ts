import { Editor } from '../editor';

export class SectionDimension {
    constructor(
        public topOffset: number,
        public height: number
    ) {
    }
}

export default {
    measureSectionDimensions(editorSvc: Editor) {
        const firstSectionDesc = editorSvc.previewCtx.sectionDescList?.[0];

        if (!firstSectionDesc) return;

        firstSectionDesc.editorDimension = new SectionDimension(
            0,
            firstSectionDesc.editorElt.offsetHeight
        );

        firstSectionDesc.previewDimension = new SectionDimension(
            0,
            firstSectionDesc.previewElt.offsetHeight
        );

        firstSectionDesc.tocDimension = new SectionDimension(
            0,
            firstSectionDesc.tocElt.offsetHeight
        );

        for (let i = 1; i < editorSvc.previewCtx.sectionDescList.length-1; i++) {
            const nextSectionDesc = editorSvc.previewCtx.sectionDescList[i];

            nextSectionDesc.editorDimension = new SectionDimension(
                nextSectionDesc.editorElt.offsetTop,
                nextSectionDesc.editorElt.offsetHeight
            );

            nextSectionDesc.previewDimension = new SectionDimension(
                nextSectionDesc.previewElt.offsetTop,
                nextSectionDesc.previewElt.offsetHeight
            );

            nextSectionDesc.tocDimension = new SectionDimension(
                nextSectionDesc.tocElt.offsetTop,
                nextSectionDesc.tocElt.offsetHeight
            );
        }
    }
};
