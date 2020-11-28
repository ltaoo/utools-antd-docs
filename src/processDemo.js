const fs = require("fs");
const path = require("path");

const JsonML = require("jsonml.js/lib/utils");
const Prism = require("prismjs");
const { parseText } = require("sylvanas");

const transformer = require("bisheng-plugin-react/lib/transformer");

require("prismjs/components/prism-jsx");
require("prismjs/components/prism-tsx");

const PROD_RM_DEBUG = false;

const watchLoader = path.join(__dirname, "./loader/watch");

function isStyleTag(node) {
  return node && JsonML.getTagName(node) === "style";
}

function getCode(node) {
  return JsonML.getChildren(JsonML.getChildren(node)[0])[0];
}

function getChineseIntroStart(contentChildren) {
  return contentChildren.findIndex(
    (node) =>
      JsonML.getTagName(node) === "h2" &&
      JsonML.getChildren(node)[0] === "zh-CN"
  );
}

function getEnglishIntroStart(contentChildren) {
  return contentChildren.findIndex(
    (node) =>
      JsonML.getTagName(node) === "h2" &&
      JsonML.getChildren(node)[0] === "en-US"
  );
}

function getCodeIndex(contentChildren) {
  return contentChildren.findIndex(
    (node) =>
      JsonML.getTagName(node) === "pre" &&
      ["jsx", "tsx"].includes(JsonML.getAttributes(node).lang)
  );
}

function getCorrespondingTSX(filename) {
  return path.join(process.cwd(), filename.replace(/\.md$/i, ".tsx"));
}

function getSourceCodeObject(contentChildren, codeIndex) {
  if (codeIndex > -1) {
    return {
      isES6: true,
      code: getCode(contentChildren[codeIndex]),
      lang: JsonML.getAttributes(contentChildren[codeIndex]).lang,
    };
  }

  return {
    isTS: true,
  };
}

function getStyleNode(contentChildren) {
  return contentChildren.filter(
    (node) =>
      isStyleTag(node) ||
      (JsonML.getTagName(node) === "pre" &&
        JsonML.getAttributes(node).lang === "css")
  )[0];
}

function getHighlightCodes({ code, lang }) {
  let codes = {};
  codes[lang] = Prism.highlight(code, Prism.languages[lang]);
  if (lang === "tsx") {
    codes = {
      ...codes,
      ...getHighlightCodes({ code: parseText(code), lang: "jsx" }),
    };
  }
  return codes;
}

function addStyle(markdownData, contentChildren) {
  // Add style node to markdown data.
  const styleNode = getStyleNode(contentChildren);
  if (isStyleTag(styleNode)) {
    markdownData.style = JsonML.getChildren(styleNode)[0];
  } else if (styleNode) {
    const styleTag = contentChildren.filter(isStyleTag)[0];
    let originalStyle =
      getCode(styleNode) + (styleTag ? JsonML.getChildren(styleTag)[0] : "");
    markdownData.style = originalStyle;
    markdownData.highlightedStyle = JsonML.getAttributes(styleNode).highlighted;
  }
}

module.exports = ({
  markdownData,
  isBuild,
  noPreview,
  babelConfig,
  pxtorem,
  injectProvider,
}) => {
  const { meta } = markdownData;
  meta.id = meta.filename.replace(/\.md$/, "").replace(/\//g, "-");
  // Should throw debugging demo while publish.
  if (isBuild && meta.debug && PROD_RM_DEBUG) {
    return { meta: {} };
  }

  // Update content of demo.
  const contentChildren = JsonML.getChildren(markdownData.content);
  const chineseIntroStart = getChineseIntroStart(contentChildren);
  const englishIntroStart = getEnglishIntroStart(contentChildren);
  const codeIndex = getCodeIndex(contentChildren);
  const introEnd = codeIndex === -1 ? contentChildren.length : codeIndex;
  if (chineseIntroStart > -1 /* equal to englishIntroStart > -1 */) {
    markdownData.content = {
      "zh-CN": contentChildren.slice(chineseIntroStart + 1, englishIntroStart),
      "en-US": contentChildren.slice(englishIntroStart + 1, introEnd),
    };
  } else {
    markdownData.content = contentChildren.slice(0, introEnd);
  }

  const sourceCodeObject = getSourceCodeObject(contentChildren, codeIndex);
  if (sourceCodeObject.isES6) {
    markdownData.highlightedCode = contentChildren[codeIndex].slice(0, 2);
    markdownData.highlightedCodes = getHighlightCodes(sourceCodeObject);
    if (!noPreview) {
      markdownData.preview = {
        __BISHENG_EMBEDED_CODE: true,
        code: transformer(sourceCodeObject.code, babelConfig),
      };
    }
  } else {
    // TODO: use loader's `this.dependencies` to watch
    // const requireString = `require('!!babel!${watchLoader}!${getCorrespondingTSX(
    //   meta.filename
    // )}')`;
    // markdownData.highlightedCode = {
    //   __BISHENG_EMBEDED_CODE: true,
    //   code: `${requireString}.highlightedCode`,
    // };
    // markdownData.preview = {
    //   __BISHENG_EMBEDED_CODE: true,
    //   code: `${requireString}.preview`,
    // };
  }
  addStyle(markdownData, contentChildren);

  return markdownData;
};

module.exports.addStyle = addStyle;
