const path = require("path");
const fs = require("fs");

const R = require("ramda");
const ReactDOMServer = require("react-dom/server");
const toReactElement = require("jsonml-to-react-element");
const rimraf = require("rimraf");
const less = require("less");

// const markdownTransformer = require("./markdown");
const generate = require("./generateFilesPath");
const markdown = require("./markdown");

const PROJECT_ROOT_DIR = path.resolve(__dirname, "..");

function resolve(pathname) {
  return path.resolve(PROJECT_ROOT_DIR, pathname);
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
  } = markdown;
  if (title === 'Button') {
    console.log(content);
  }
  const reactElement = toReactElement(content);
  // API 部分单独拿出来处理了
  const htmlElement = ReactDOMServer.renderToString(reactElement);

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
    } = markdown;
    return {
      t: `${title} ${subtitle}`,
      d: subtitle,
      p: `antd/${title}.html`,
    };
  });

  const config = JSON.stringify(docsConfig);
  fs.writeFileSync(resolve("./antd/indexes.json"), config);
}
function createPages(markdowns) {
  markdowns.forEach((markdown) => {
    const { meta } = markdown;
    const htmlContent = createHTMLContent(markdown);

    fs.writeFileSync(resolve(`./antd/${meta.title}.html`), htmlContent);
  });
}

function createMarkdowns() {
  const doc = resolve("./components");
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
  rimraf.sync(resolve("./antd"));
  fs.mkdirSync(resolve("./antd"));
  fs.mkdirSync(resolve("./antd/assets"));
};
module.exports.buildPages = function buildPages() {
  const markdowns = createMarkdowns();
  createDocsConfig(markdowns);
  createPages(markdowns);
};
module.exports.buildStatic = function buildStatic() {
  console.log(resolve("./site/theme/static/index.less"));
  const lessContent = fs.readFileSync(
    resolve("./site/theme/static/index.less"),
    "utf-8"
  );
  less.render(
    lessContent,
    {
      paths: [resolve("./site/theme/static")],
      javascriptEnabled: true,
    },
    (err, res) => {
      if (err) {
        console.log(err);
        return;
      }
      // console.log(res);
      fs.writeFileSync(resolve("./antd/assets/index.css"), res.css);
    }
  );
};
