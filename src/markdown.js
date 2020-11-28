const markTwain = require("mark-twain");

const processor = require('./processor');

function toUriPath(path) {
  return path.replace(/\\/g, "/");
}

module.exports = function (filename, fileContent) {
  const markdown = markTwain(fileContent);
  // console.log(markdown);
  markdown.meta.filename = toUriPath(filename);
  processor(markdown);
  // if (markdown.meta.title === 'Button') {
  //   console.log(markdown);
  // }
  return markdown;
};
