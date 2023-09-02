import katexPlugin from './extensions/katexExtension'; // install shit
import markdownPlugin from './extensions/markdownExtension'; // install shit
import mermaidPlugin from './extensions/mermaidExtension'; // install shit
import emojiPlugin from './extensions/emojiExtension'; // install shit
// import store from '../store.1';


const getOptionsListeners = [];
const initConverterListeners = [];
const sectionPreviewListeners = [];

const extensionSvc = {
    onGetOptions(listener) {
        getOptionsListeners.push(listener);
    },

    onInitConverter(priority, listener) {
        initConverterListeners[priority] = listener;
    },

    onSectionPreview(listener) {
        sectionPreviewListeners.push(listener);
    },

    getOptions(properties, isCurrentFile?) {
        return getOptionsListeners.reduce((options, listener) => {
            listener(options, properties, isCurrentFile);
            return options;
        }, {});
    },

    initConverter(markdown, options) {
        // Use forEach as it's a sparsed array
        initConverterListeners.forEach((listener) => {
            listener(markdown, options);
        });
    },

    sectionPreview(elt, options, isEditor) {
        sectionPreviewListeners.forEach((listener) => {
            listener(elt, options, isEditor);
        });
    },
}

katexPlugin(extensionSvc);
markdownPlugin(extensionSvc);
mermaidPlugin(extensionSvc);
emojiPlugin(extensionSvc);


export default extensionSvc;


