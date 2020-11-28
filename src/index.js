const path = require("path");
const fs = require("fs");

const ReactDOMServer = require("react-dom/server");
const toReactElement = require("jsonml-to-react-element");
const { getChildren } = require("jsonml.js/lib/utils");
const rimraf = require("rimraf");
const less = require("less");

const generate = require("./generateFilesPath");
const markdown = require("./markdown");
const processDemo = require("./processDemo");

const DEBUG = false;
const DEBUG_COMPONENT = "button";
const DEBUG_DEMO = "basic";

const PROJECT_ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = "./package/public";
const ANTD_SOURCE_DIR = "ant-design";

function resolve(...paths) {
  return path.resolve(PROJECT_ROOT_DIR, ...paths);
}
function resolvePublic(pathname = "./") {
  return resolve(PUBLIC_DIR, pathname);
}
function resolveSource(...paths) {
  return resolve(ANTD_SOURCE_DIR, ...paths);
}

/**
 * type IContent = [string, IContent];
 * interface IMarkdown {
 *   content: IContent;
 *   meta: {
 *     title: string;
 *     subtitle: string;
 *     type: string;
 *     category: 'Components';
 *     filename: string;
 *     cover: string;
 *   };
 * }
 */
function createHTMLContent(markdown) {
  const {
    meta: { title, subtitle },
    content,
    api,
    demos,
    style: pageStyle,
  } = markdown;
  const locale = "zh-CN";
  const reactElement = toReactElement(content);
  const apiElement = toReactElement(
    [
      "section",
      {
        className: "markdown api-container",
      },
    ].concat(getChildren(api || ["placeholder"]))
  );
  const htmlElement = ReactDOMServer.renderToString(reactElement);
  // API 部分单独拿出来处理了
  const apiHTMLElement = ReactDOMServer.renderToString(apiElement);

  const demosHTMLElement = Object.keys(demos)
    .filter((name) => {
      if (DEBUG === false) {
        return true;
      }
      return name === DEBUG_DEMO;
    })
    .map((demoName) => {
      const demoMarkdown = demos[demoName];
      const {
        meta,
        content,
        highlightedCode,
        highlightedCodes,
        preview,
        style,
      } = processDemo({ markdownData: demoMarkdown, isBuild: false });

      // console.log(style);

      let previewHTMLElement = "";
      if (preview) {
        const { code } = preview;
        // 这个方法应该是在页面中调用，但 doc 插件页面无法执行 js
        try {
          eval(code);
          const res = bishengPluginReactPreviewer();
          previewHTMLElement = ReactDOMServer.renderToString(res);
        } catch (err) {
          // ...
        }
        // console.log(res);
      }

      const codeLanguage = highlightedCode[1].lang;

      // content[locale 可能是 undefined
      const extraContents = ["section", ...(content[locale] || [])];
      const singleDemoContentHTMLElement = ReactDOMServer.renderToString(
        toReactElement(extraContents)
      );

      return `<h3>${meta.title[locale]}</h3>
<section>
  ${singleDemoContentHTMLElement}
  <section class="code-box" id="components-${title.toLowerCase()}-demo-${demoName}">
    <section class="code-box-demo">
      ${previewHTMLElement}
    </section>
  </section>
  <section class="highlight-wrapper highlight-wrapper-expand">
    <div class="highlight">
    <pre class="language-${codeLanguage}">
      <code>${highlightedCodes[codeLanguage]}</code>
    </pre>
    </div>
  </section>
</section>`;
    })
    .join("");

  return `<html>
  <head>
    <title>${subtitle}</title>
    <link rel="stylesheet" href="./assets/index.css">
    <style>
      ${pageStyle}
    </style>
  </head>
  <body>
    <section class="main-container main-container-component">
      <article>
        <section class="markdown">
          <h1>${title}<span class="subtitle">${subtitle}</span></h1>
          ${htmlElement}
          <h2>代码演示</h2>
          ${demosHTMLElement}
          ${apiHTMLElement}
        </section>
      </article>
    </section>
  </body>
</html>
`;
}

function createDocsConfig(markdowns) {
  const docsConfig = markdowns.map((markdown) => {
    const {
      meta: { title, subtitle },
      content,
    } = markdown;
    return {
      t: `${title} ${subtitle}`,
      d: content[1][1],
      p: `./public/${title}.html`,
    };
  });

  const config = JSON.stringify(docsConfig);
  fs.writeFileSync(resolvePublic("./indexes.json"), config);
}
function createPages(markdowns) {
  markdowns.forEach((markdown) => {
    const { meta } = markdown;
    const htmlContent = createHTMLContent(markdown);

    fs.writeFileSync(resolvePublic(`./${meta.title}.html`), htmlContent);
  });
}

function createMarkdowns() {
  const doc = resolveSource("./components");
  const transformers = [
    {
      test: /\.md$/,
    },
  ];
  // 所有 markdown 文件树，在 bisheng 中，就这就是路由，或者说用来生成路由的对象
  // 而在我们这，需要一个一个读取解析
  const filesTree = generate(doc, transformers);

  // 先忽略 demo 文件夹里的内容
  const componentNames = Object.keys(filesTree);

  const markdowns = componentNames
    .filter((name) => {
      if (DEBUG === false) {
        return true;
      }
      return name === DEBUG_COMPONENT;
    })
    .map((componentName) => {
      const { demo: demos, index } = filesTree[componentName];
      // console.log(componentName);
      // 中文内容
      const componentIndexFilePath = index["zh-CN"];
      const content = fs.readFileSync(componentIndexFilePath, "utf-8");
      const markdownContent = markdown(`${componentName}/index`, content);
      markdownContent.demos = markdownContent.demos || {};

      // demos
      if (demos !== undefined) {
        Object.keys(demos).map((demoName) => {
          const demoPath = demos[demoName];
          const content = fs.readFileSync(demoPath, "utf-8");
          const demoMarkdownContent = markdown(demoName, content);
          markdownContent.demos[demoName] = demoMarkdownContent;
        });
      }
      // console.log(markdownContent);

      return markdownContent;
    });
  return markdowns;
}

module.exports.clean = function clean() {
  rimraf.sync(resolvePublic());
  fs.mkdirSync(resolvePublic());
  fs.mkdirSync(resolvePublic("./assets"));
};
module.exports.buildPages = function buildPages() {
  const markdowns = createMarkdowns();
  createDocsConfig(markdowns);
  createPages(markdowns);
};
module.exports.buildStatic = function buildStatic() {
  const lessContent = fs.readFileSync(resolve("./src/index.less"), "utf-8");
  less.render(
    lessContent,
    {
      paths: [resolveSource("./site/theme/static")],
      javascriptEnabled: true,
    },
    (err, res) => {
      if (err) {
        console.log(err);
        return;
      }
      // console.log(res);
      fs.writeFileSync(resolvePublic("./assets/index.css"), res.css);
    }
  );
};
