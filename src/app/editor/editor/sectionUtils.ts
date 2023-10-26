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
        for (let i = 0; i < editorSvc.previewCtx.sectionDescList.length; i++) {
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
