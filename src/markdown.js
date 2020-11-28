const markTwain = require("mark-twain");

function toUriPath(path) {
  return path.replace(/\\/g, "/");
}

module.exports = function (filename, fileContent) {
  const markdown = markTwain(fileContent);
  markdown.meta.filename = toUriPath(filename);
  return markdown;
};
