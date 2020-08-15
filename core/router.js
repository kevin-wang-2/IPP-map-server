const register = require("./registration");

module.exports = (app) => {
    // 在这里写所有注册函数
    let zone = require("../src/zone");
    register(app, "post", "/map/zone", zone.post);
    register(app, "get", "/map/zone", zone.getall);
    register(app, "get", "/map/zone/:id", zone.get);
    register(app, "delete", "/map/zone/:id", zone.deleteid);
    register(app, "patch", "/map/zone/:id", zone.patch);

    let routine = require("../src/routine");
    register(app, "post", "/map/routine", routine.post);
    register(app, "get", "/map/routine/:id", routine.get);

    let pinpoint = require("../src/pinpoint");
    register(app, "post", "/map/pinpoint", pinpoint.post);
    register(app, "get", "/map/pinpoint", pinpoint.getall);
    register(app, "get", "/map/pinpoint/:id", pinpoint.get);
    register(app, "delete", "/map/pinpoint/:id", pinpoint.delete);
    register(app, "patch", "/map/pinpoint/:id", pinpoint.patch);

    let path = require("../src/path");
    register(app, "post", "/map/path", path.post);
    register(app, "get", "/map/path/:id", path.getallwith);
    register(app, "get", "/map/path/:id1/:id2", path.getundirected);
};