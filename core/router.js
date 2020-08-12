const register = require("./registration");

const test = require("../src/test");

module.exports = (app) => {
    // 在这里写所有注册函数
    register(app, "get", "/test/:info/:id", test);
};