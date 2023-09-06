const DIFF_DELETE = -1;
const DIFF_INSERT = 1;
const DIFF_EQUAL = 0;

let idCounter = 0;

export class Marker {
    id = idCounter++;
    constructor(public offset, public trailing) {
    }

    adjustOffset(diffs) {
        let startOffset = 0;
        diffs.forEach((diff) => {
            const diffType = diff[0];
            const diffText = diff[1];
            const diffOffset = diffText.length;
            switch (diffType) {
                case DIFF_EQUAL:
                    startOffset += diffOffset;
                    break;
                case DIFF_INSERT:
                    if (
                        this.trailing
                            ? this.offset > startOffset
                            : this.offset >= startOffset
                    ) {
                        this.offset += diffOffset;
                    }
                    startOffset += diffOffset;
                    break;
                case DIFF_DELETE:
                    if (this.offset > startOffset) {
                        this.offset -= Math.min(diffOffset, this.offset - startOffset);
                    }
                    break;
                default:
            }
        });
    }
}


