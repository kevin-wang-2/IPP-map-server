// 初始化配置文件
const config = require("./utils/config").readConfigSync();
const authority = require("./config/authority");

const axios = require("axios");

// 初始化Express服务器
const express= require("express");
let app = express();

// 使用bodyparser处理POST请求
const bodyparser = require("body-parser");
app.use(bodyparser.urlencoded({extended: true}));
app.use(bodyparser.json());

// 允许跨域请求
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Access-Control-Allow-Methods", "PUT,PATCH,POST,GET,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    if(req.path === "/favicon.ico"){
        res.replSetGetStatus(404);
    } else {
        next();
    }
});

// 权限管理
app.use(async (req, res, next) => {
    let arrPath = req.path.split("/");
    if(arrPath[0] === '') arrPath.shift();
    let cpyAuth = authority;
    for(let i = 0; i < arrPath.length; i++) {
        if(cpyAuth.hasOwnProperty(arrPath[i]))
            cpyAuth = cpyAuth[arrPath[i]];
        else break;
    }
    if(cpyAuth.hasOwnProperty(req.method.toLowerCase())) {
        let authReq = cpyAuth[req.method.toLowerCase()];
        if(authReq > -1) {
            if(req.query.token) {
                req.headers.authorization = req.headers.token;
            }
            req.headers.authorization = req.headers.authorization || "";
            let ip =  req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.connection.socket.remoteAddress;
            let result = await axios({
                method: "GET",
                headers: {authorization: req.headers.authorization},
                url: "http://" + config.auth.ip + ":" + config.auth.port.toString() + "/auth?json=true&authority=" + authReq.toString() + "&origin=" + ip
            });
            if(!result.data.token)  {
                res.sendStatus(401);
                res.end(JSON.stringify({error: "Not enough authority"}));
                return;
            }
        }
    }
    next();
});

app.use((req, res, next) => {
    if (req.method.toLowerCase() === 'options') {
        res.sendStatus(200);  // 让options尝试请求快速结束
    } else {
        next();
    }
});

const router = require("./core/router");
router(app);

// 未经过任何路由，返回404同时返回错误信息

app.use((req, res) => {
    res.status(404);
    res.end(JSON.stringify({
        error: "No Matching API."
    }));
});

// 监听
app.listen(config.port);
