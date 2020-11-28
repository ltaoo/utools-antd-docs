const JsonML = require("jsonml.js/lib/utils");

module.exports = (markdown) => {
  const { content } = markdown;
  const contentChildren = JsonML.getChildren(content);
  const apiStartIndex = contentChildren.findIndex(
    (node) =>
      JsonML.getTagName(node) === "h2" &&
      /^API/.test(JsonML.getChildren(node)[0])
  );

  if (apiStartIndex > -1) {
    const newContent = contentChildren.slice(0, apiStartIndex);
    markdown.content = ["section"].concat(newContent);

    const api = contentChildren.slice(apiStartIndex);
    markdown.api = ["section"].concat(api);
  }

  return markdown;
};
