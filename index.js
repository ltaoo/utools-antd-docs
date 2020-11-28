const { clean, updatePackageReadme, buildPages, buildStatic } = require('./src/index');


clean();

buildPages();
buildStatic();

updatePackageReadme();
