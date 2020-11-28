window.exports = {
  antd: {
    // 注意：键对应的是plugin.json中的features.code
    mode: "doc", // 文档模式
    args: {
      indexes: require("./antd/indexes.json"),
      placeholder: "搜索",
    },
  },
};
