const markTwain = require("mark-twain");

const processor = require('./processor');

function toUriPath(path) {
  return path.replace(/\\/g, "/");
}

module.exports = function (filename, fileContent) {
  const markdown = markTwain(fileContent);
  // @ts-ignore
  markdown.meta.filename = toUriPath(filename);
  // 当 demo 里存在 style 标签时，可能有 [''] 这样的内容，导致 ReactDOMServer 报错
  markdown.content = markdown.content.filter((item) => item.length !== 1)
  processor(markdown);
  // if (markdown.meta.title === 'Button') {
  //   console.log(markdown);
  // }
  return markdown;
};
