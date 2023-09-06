import dompurify from 'dompurify';

const aHrefSanitizationWhitelist = /^\s*(https?|ftp|mailto|tel|file):/;
const imgSrcSanitizationWhitelist = /^\s*((https?|ftp|file|blob):|data:image\/)/;

const urlParsingNode = window.document.createElement('a');

function sanitizeUri(uri, isImage) {
  const regex = isImage ? imgSrcSanitizationWhitelist : aHrefSanitizationWhitelist;
  urlParsingNode.setAttribute('href', uri);
  const normalizedVal = urlParsingNode.href;
  if (normalizedVal !== '' && !normalizedVal.match(regex)) {
    return `unsafe:${normalizedVal}`;
  }
  return uri;
}

export default {
    sanitizeHtml: (text => {
        return dompurify.sanitize(text, {
        });
    }),
    sanitizeUri
}
