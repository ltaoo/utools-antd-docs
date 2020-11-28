const path = require("path");
const fs = require("fs");

const R = require("ramda");
const ReactDOMServer = require("react-dom/server");
const toReactElement = require("jsonml-to-react-element");
const { getChildren } = require("jsonml.js/lib/utils");
const rimraf = require("rimraf");
const less = require("less");

// const markdownTransformer = require("./markdown");
const generate = require("./generateFilesPath");
const markdown = require("./markdown");

const PROJECT_ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = "./public";
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
// console.log(markdowns);
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
  } = markdown;
  if (title === "Button") {
    console.log(content);
  }
  const reactElement = toReactElement(content);
  const apiElement = toReactElement(
    [
      "section",
      {
        className: "markdown api-container",
      },
    ].concat(getChildren(api || ["placeholder"]))
  );
  // API 部分单独拿出来处理了
  const htmlElement = ReactDOMServer.renderToString(reactElement);
  const apiHTMLElement = ReactDOMServer.renderToString(apiElement);

  return `<html>
  <head>
    <title>${subtitle}</title>
    <link rel="stylesheet" href="./assets/index.css">
  </head>
  <body>
    <section class="main-container main-container-component">
      <article>
        <section class="markdown">
          <h1>${title}<span class="subtitle">${subtitle}</span></h1>
          ${htmlElement}
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
      // use: markdownTransformer,
    },
  ];
  // 所有 markdown 文件树，在 bisheng 中，就这就是路由，或者说用来生成路由的对象
  // 而在我们这，需要一个一个读取解析
  const filesTree = generate(doc, transformers);

  // 先忽略 demo 文件夹里的内容
  const componentNames = Object.keys(filesTree);

  const markdowns = componentNames.map((componentName) => {
    const componentIndexFilePath = filesTree[componentName].index["zh-CN"];
    const content = fs.readFileSync(componentIndexFilePath, "utf-8");
    //   const markdownContent = markdown(`${componentName}/index`, content);
    const markdownContent = markdown(`${componentName}/index`, content);

    // console.log(markdownContent);
    // 其实这里就可以生成 html 文件了
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
