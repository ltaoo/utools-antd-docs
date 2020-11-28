const path = require("path");
const fs = require("fs");

const R = require("ramda");

function ensureToBeArray(maybeArray) {
  return Array.isArray(maybeArray) ? maybeArray : [maybeArray];
}
function shouldBeIgnore(filename) {
  const exclude = null;
  return exclude && exclude.test(filename);
}

const isValidFile = (transformers) => (filename) =>
  transformers.some(({ test }) => eval(test).test(filename));

function isDirectory(filename) {
  return fs.statSync(filename).isDirectory();
}

function findValidFiles(source, transformers) {
  // console.log('[]findValidFiles', source);
  const fn = R.pipe(
    R.reject(shouldBeIgnore),
    R.filter(R.either(isDirectory, isValidFile(transformers))),
    R.chain((filename) => {
      if (isDirectory(filename)) {
        const subFiles = fs
          .readdirSync(filename)
          .map((subFile) => path.join(filename, subFile));
        return findValidFiles(subFiles, transformers);
      }
      return [filename];
    })
  );
  return fn(source);
}

module.exports = function generate(source, transformers = []) {
  //   console.log("[]generate", source);
  if (source === null || source === undefined) {
    return {};
  }
  if (R.is(Object, source) && !Array.isArray(source)) {
    return R.mapObjIndexed((value) => generate(value, transformers), source);
  }
  // console.log(2);
  const sources = ensureToBeArray(source);
  const validFiles = findValidFiles(sources, transformers);
  //   console.log('[]generate - validatedFiles', validFiles);
  const filesTree = filesToTreeStructure(validFiles, sources);
  return filesTree;
};

function escapeWinPath(path) {
  return path.replace(/\\/g, "\\\\");
}
const rxSep = new RegExp(`[${escapeWinPath(path.sep)}.]`);
function getPropPath(filename, sources) {
  return sources
    .reduce(
      (f, source) => f.replace(source, ""),
      filename.replace(new RegExp(`${path.extname(filename)}$`), "")
    )
    .replace(/^\.?(?:\\|\/)+/, "")
    .split(rxSep);
}

function filesToTreeStructure(files, sources) {
  const cleanedSources = sources.map((source) =>
    source.replace(/^\.?(?:\\|\/)/, "")
  );
  const filesTree = files.reduce((subFilesTree, filename) => {
    const propLens = R.lensPath(getPropPath(filename, cleanedSources));
    return R.set(propLens, filename, subFilesTree);
  }, {});
  //   console.log('[]filesToTreeStructure', filesTree);
  return filesTree;
}
