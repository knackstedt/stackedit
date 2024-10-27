import markdownItEmoji from 'markdown-it-emoji';

export default {
    onGetOptions: ((options, properties) => {
        options.emoji = properties.extensions.emoji.enabled;
        options.emojiShortcuts = properties.extensions.emoji.shortcuts;
    }),
    onInitConverter: {
        priority: 1,
        handler: (markdown, options) => {
            if (options.emoji) {
                markdown.use(markdownItEmoji, options.emojiShortcuts ? {} : { shortcuts: {} });
            }
        }
    }
};
