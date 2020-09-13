const mongoClient = require("mongodb").MongoClient;
const config = require("../../utils/config").readConfigSync();
const mongoPath = "mongodb://" + config["db"]["user"] + ":" + config["db"]["pwd"] + "@" + config["db"]["ip"] + ":" + config["db"]["port"] + "/" + config["db"]["db"]["map"];
const {BigInteger} = require("jsbn")

let polygons;

/**
 * 判断点是否在多边形内部
 * 算法: 从coordinate出发作X轴的平行射线，与多边形边的交点为奇数
 * @param polygon 多边形
 * @param coordinate 点
 */
function contains(polygon, coordinate) {
    let cnt = 0;
    polygon.forEach((vertex, index) => {
        let nextVertex = polygon[(index + 1) % polygon.length];

        /**
         * 由vertex与nextVertex组成一条边，有三种情况：
         * 1. 若边与X轴平行，不计入相交
         * 2. 若边的顶点都在射线同侧，必不相交
         * 3. 若边的顶点在射线异侧，计算边与X轴交点
         * 由边方程 k*(x-x1)=y-y1 可知当 y=y0 , x=x1+(1/k)*y1=x1-(x1-x2)/(y1-y2)*(y0-y1)
         */

        if (vertex[1] === nextVertex[1]) return; // 高度相等，不计入相交
        if ((vertex[1] - coordinate[1]) * (nextVertex[1] - coordinate[1]) >= 0 || (vertex[0] < coordinate[0] && nextVertex[0] < coordinate[0])) return; // 边端点在线段同侧，交于延长线，不计
        let x0 = vertex[0] + (vertex[0] - nextVertex[0]) / (vertex[1] - nextVertex[1]) * (coordinate[1] - vertex[1]);
        if (x0 > coordinate[0]) {
            cnt++;
        }
    });

    return cnt % 2 === 1;
}

function cp(p1, p2, p3) {
    return (p2[0] - p1[0]) * (p3[1] - p1[1]) + (p2[1] - p1[1]) * (p3[0] - p1[0]);
}

/**
 * 判断两线段是否相交，若相交返回交点
 * @param p1
 * @param p2
 * @param p3
 * @param p4
 */
function intersects([x1, y1], [x2, y2], [x3, y3], [x4, y4]) {
    /**
     * 两点式由 y-y1=k(x-x1) (x1 < x < x2)得出
     * 所以
     * y-y1=k1(x-x1),y-y3=k2(x-x3)可以解得
     * y1-y3=k2(x-x3)-k1(x-x1) => x=(y1-y3+k2x3-k1x1)/(k2-k1)
     * 若x1 < x < x2 && x3 < x < x4则存在交点(x,k1*(x-x1)+y1)，否则不存在
     */
    if((y1 - y2) * (x4 - x3) === (y3 - y4) * (x2 - x1)) {
        return x2*(y1 - y2) - y2*(x1 - x2) === x4*(y3 - y4) - y4*(x3 - x4) &&
               [Math.max(Math.min(x1, x2), Math.min(x3, x4)), ((x1 < x2) ? Math.min : Math.max)((x1 < x2) ? y1 : y2, (x3 < x4) ? y3 : y4)]
    }

    let x0, y0;
    /**
     * 这里由于javascript运算的锅，在正数运算时会被自动取整，导致40m级别的误差，不要自动重构！
     */
    if(x1 > x3) {
        x0 = (x1 * x3 * y2 - x2 * x3 * y1 - x1 * x4 * y2 + x2 * x4 * y1 - x1 * x3 * y4 + x1 * x4 * y3 + x2 * x3 * y4 - x2 * x4 * y3) / (x1 * y3 - x3 * y1 - x1 * y4 - x2 * y3 + x3 * y2 + x4 * y1 + x2 * y4 - x4 * y2);
        y0 = (x1 * y2 * y3 - x2 * y1 * y3 - x1 * y2 * y4 + x2 * y1 * y4 - x3 * y1 * y4 + x4 * y1 * y3 + x3 * y2 * y4 - x4 * y2 * y3) / (x1 * y3 - x3 * y1 - x1 * y4 - x2 * y3 + x3 * y2 + x4 * y1 + x2 * y4 - x4 * y2);
    } else {
        x0 = (x3 * x1 * y4 - x4 * x1 * y3 - x3 * x2 * y4 + x4 * x2 * y3 - x3 * x1 * y2 + x3 * x2 * y1 + x4 * x1 * y2 - x4 * x2 * y1) / (x3 * y1 - x1 * y3 - x3 * y2 - x4 * y1 + x1 * y4 + x2 * y3 + x4 * y2 - x2 * y4);
        y0 = (x3 * y4 * y1 - x4 * y3 * y1 - x3 * y4 * y2 + x4 * y3 * y2 - x1 * y3 * y2 + x2 * y3 * y1 + x1 * y4 * y2 - x2 * y4 * y1) / (x3 * y1 - x1 * y3 - x3 * y2 - x4 * y1 + x1 * y4 + x2 * y3 + x4 * y2 - x2 * y4);

    }
    return Math.min(x1, x2) <= x0 && x0 <= Math.max(x1, x2) &&
        [x0, y0];
}

/**
 * 判断多边形是否与线段相交
 * @param polygon
 * @param p1
 * @param p2
 */
function poly_intersects(polygon, p1, p2) {
    /**
     * 遍历多边形的线段
     */
    let points = [];
    for (let i = 0; i < polygon.length; i++) {
        let p = intersects(polygon[i], polygon[(i + 1) % polygon.length], p1, p2);
        if (p) points.push(p);
    }
    return points || false;
}

/**
 * 判断多边形柱体与线段是否相交
 * @param polygon
 * @param height
 * @param p1
 * @param p2
 */
function polycy_intersects(polygon, height, p1, p2) {
    /**
     * 线段方向向量由(x1 - x2, y1 - y2, h1 - h2)给出，因此我们有
     * （x-x1)/m=(y-y1)/n=(h - h1)/p已知x和y，我们可以求出z
     * h = h1 + p/m * (x-x1) = h1 + (h1 - h2) / (x1 - x2) * (x - x1)
     */

    for (let i = 0; i < polygon.length; i++) {
        let p = intersects(polygon[i], polygon[(i + 1) % polygon.length], p1, p2);
        p && console.log(p);
        if (p) {
            if (height === -1) return true;
            let h = p1[2] + (p1[2] - p2[2]) / (p1[0] - p2[0]) * (p[0] - p1[0]);
            if (h < height) return true;
        }
    }
    return false;
}

/**
 * 判断点是否合法
 * @param p 点
 * @param polygons 所有带高度限制的区域
 */
function isValid(p, polygons) {
    for (let i = 0; i < polygons.length; i++) {
        if (polygons[i].minHeight !== -1 && p.h >= polygons[i].minHeight) continue;
        if (contains(polygons[i].vertex, [p.x, p.y])) {
            return false;
        }
    }
    return true;
}

function routeValid(p1, p2, polygons) {
    for (let i = 0; i < polygons.length; i++) {
        if (polycy_intersects(polygons[i].vertex, polygons[i].minHeight, [p1.x, p1.y, p1.h], [p2.x, p2.y, p2.h])) {
            return false;
        }
    }
    return true;
}

/**
 * 生成一个点的相邻点集
 * @param p
 * @param polygons
 * @param precision
 * @returns {Array}
 */
function generateNeighbours(p, polygons, precision = 1) {
    let neighbours = [];
    for (let dx = -precision; dx <= precision; dx += precision)
        for (let dy = -precision; dy <= precision; dy += precision)
            for (let dh = -50; dh <= 50; dh += 50) {
                if (dx === 0 && dy === 0 && dh === 0) continue;
                if (p.h + dh < 0) continue;
                let tentative = {
                    x: p.x + dx,
                    y: p.y + dy,
                    h: p.h + dh,
                    G: 0
                };
                if (isValid(tentative, polygons) && routeValid(p, tentative, polygons)) neighbours.push(tentative);
            }
    return neighbours;
}

/**
 * 墨卡托投影下的距离公式
 * @param p1 第一个点
 * @param p2 第二个点
 */
function distance(p1, p2) {
    let R = 6378137;
    p1 = {
        x: p1[0] * Math.PI / 20037508.3427892,
        y: p1[1] * Math.PI / 20037508.3427892
    };
    p2 = {
        x: p2[0] * Math.PI / 20037508.3427892,
        y: p2[1] * Math.PI / 20037508.3427892
    };

    let p1ll = {
            lambda: p1.x,
            phi: Math.atan(Math.sinh(p1.y))
        },
        p2ll = {
            lambda: p2.x,
            phi: Math.atan(Math.sinh(p2.y))
        };

    let C = Math.cos(p1ll.phi) * Math.cos(p2ll.phi) * Math.cos(p1ll.lambda - p2ll.lambda) + Math.sin(p1ll.phi) * Math.sin(p2ll.phi);
    return R * Math.acos(C);
}

function exists(point, list) {
    for (let i = 0; i < list.length; i++) {
        if (list[i].x === point.x && list[i].y === point.y && list[i].h === point.h) return i;
    }
    return -1;
}

function estimate(point, list, precision) {
    for (let i = 0; i < list.length; i++) {
        if (Math.abs(list[i].x - point[0]) < precision && Math.abs(list[i].y - point[1]) < precision && Math.abs(list[i].h - point[2]) < 50) return i;
    }
    return -1;
}

async function ASwithPrecision(from, to, precision = 1) {
    let routine = [],
        height = [],
        cost = 0;

    /**
     * 采用A*算法，分辨率为1m，
     * 两格点间距离由max(abs(50*Δh), distance(p1, p2))表示（因为上升速度较慢，这个值可以之后再调试）
     * 所以与目标的估值h(p')由max(50*h[p'], distance(p', t))给出
     * 从p移动到p'的开销在
     * 1. abs(h[p']-h[p])>1 时约等于50*abs(h[p']-h[p])
     * 2. h[p']=h[p] 时等于distance(p, p'), 在高纬下距离变小
     *
     */

    const ascendTime = 1;
    const disturbance = 2;

    ///// 距离函数 /////

    const h = (p) => {
        let res = Math.sqrt(Math.pow((ascendTime * Math.abs(p.h)), 2) + Math.pow(distance([p.x, p.y], to), 2));
        return res;
    };

    const g = (p, pp) => {
        return Math.sqrt(Math.pow((ascendTime * Math.abs(p.h - pp.h)), 2) + Math.pow(distance([p.x, p.y], [pp.x, pp.y]), 2));
    };

    let fx = from[0], fy = from[1], tx = to[0], ty = to[1];

    let open = [],
        close = [],
        resultIndex = -1;

    open.push({
        x: Math.floor(fx / precision) * precision,
        y: Math.floor(fy / precision) * precision,
        h: from[2] || 0,
        parent: null,
        G: 0
    });

    do {
        let cur = open.pop();
        close.push(cur);
        let neighbours = generateNeighbours(cur, polygons, precision);
        neighbours.forEach((p) => {
            let G = cur.G + g(cur, p);
            if (exists(p, close) !== -1) return;
            if (exists(p, open) === -1) {
                p.H = h(p);
                p.G = G;
                p.F = p.H + G;
                p.parent = cur;
                open.push(p);
            } else {
                let index = exists(p, open);
                if (G < open[index].G) {
                    open[index].parent = cur;
                    open[index].G = G;
                    open[index].F = G + open[index].H;
                }
            }
        });
        if (open.length === 0) break;
        open.sort((a, b) => {
            return b.F - a.F;
        });
    } while ((resultIndex = estimate(to, open, precision)) === -1);

    if (resultIndex !== -1) {
        let cur = open[resultIndex];
        cost = cur.G;
        do {
            routine.unshift([cur.x, cur.y]);
            height.unshift(cur.h);
            cur = cur.parent;
        } while (cur.parent);
    }

    return {
        routine: routine,
        height: height,
        cost: cost
    }
}

function optimizeRoutine(POI, height) {
    let routineTable = new Array(POI.length).fill([]);
    let weights = new Array(POI.length).fill(0);
    for (let i = 0; i < POI.length; i++) {
        for (let j = i + 1; j < POI.length; j++) {
            let dist = distance(POI[i].concat([height[i]]), POI[j].concat([height[j]]));
            if (routeValid(POI[i].concat([height[i]]), POI[j].concat([height[j]]), polygons) && (weights[j] === 0 || weights[j] >= (weights[i] + dist))) {
                weights[j] = weights[i] + dist;
                routineTable[j] = routineTable[i].concat([i]);
            }
        }
    }

    return routineTable[POI.length - 1].concat([POI.length - 1]);
}

async function generateRoute(POIs) {
    // 1. 获取所有多边形
    let db = await mongoClient.connect(mongoPath, {useUnifiedTopology: true});
    let col = db.db(config["db"]["db"]["map"]).collection("zone");
    polygons = await col.find({type: 0}).toArray();
    await db.close();

    let routine = [], height = [], cost = 0;
    for (let i = 0; i < POIs.length - 1; i++) {
        let part = await ASwithPrecision(POIs[i], POIs[i + 1], 1);
        console.log("---");
        let optRoutine = optimizeRoutine(part.routine, part.height);
        routine = [];
        height = [];
        for (let i = 0; i < optRoutine.length; i++) {
            routine.push(part.routine[optRoutine[i]]);
            height.push(part.height[optRoutine[i]]);
        }
        cost += part.cost;
    }
    return {routine, height, cost};
}

module.exports = generateRoute;

/**
 * 用于单独进程运行的部分
 */

if (require.main === module) {
    const {ObjectID} = require("mongodb");

    let cnt = -1, POIs = [], dbid = "";
    process.on("message", (msg) => {
        POIs = msg.POIs;
        dbid = msg.dbid;
        generateRoute(POIs).then(async (data) => {
            if (dbid) {
                let db = await mongoClient.connect(mongoPath, {useUnifiedTopology: true});
                let col = db.db(config["db"]["db"]["map"]).collection("routine");
                await col.updateOne({_id: ObjectID(dbid)}, {
                    $set: {
                        routine: data.routine,
                        height: data.height,
                        laneHeight: Math.max.apply(null, data.height),
                        cost: data.cost,
                        POI: POIs,
                        status: "OK",
                        temporary: true,
                        create: Date.now()
                    }
                });
                await db.close();
            } else process.exit(0);
        }).then(() => {
            process.exit(0);
        })
    });
}
