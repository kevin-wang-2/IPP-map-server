const mongoClient = require("mongodb").MongoClient;
const config = require("../../utils/config").readConfigSync();
const mongoPath = "mongodb://" + config["db"]["user"] + ":" + config["db"]["pwd"] + "@" + config["db"]["ip"] + ":" + config["db"]["port"] + "/" + config["db"]["db"];

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
        if ((vertex[1] - coordinate[1]) * (nextVertex[1] - coordinate[1]) >= 0) return; // 边端点在线段同侧，交于延长线，不计
        let x0 = vertex[0] + (vertex[0] - nextVertex[0]) / (vertex[1] - nextVertex[1]) * (coordinate[1] - vertex[1]);
        if (x0 > coordinate[0]) {
            cnt++;
        }
    });

    return cnt % 2 === 1;
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

/**
 * 生成一个点的相邻点集
 * @param p
 * @returns {Array}
 */
function generateNeighbours(p, polygons) {
    let neighbours = [];
    let pp = {
        x: Math.floor(p.x),
        y: Math.floor(p.y),
        h : Math.floor(p.h)
    };
    for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
            for (let dh = -50; dh <= 50; dh += 50) {
                if (dx === 0 && dy === 0 && dh === 0) continue;
                if (pp.h + dh < 0) continue;
                if (isValid({
                    x: pp.x + dx,
                    y: pp.y + dy,
                    h: pp.h + dh
                }, polygons)) neighbours.push({
                    x: pp.x + dx,
                    y: pp.y + dy,
                    h: pp.h + dh,
                    G: 0
                });
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
    for(let i = 0; i < list.length; i++) {
        if(list[i].x === point.x && list[i].y === point.y) return i;
    }
    return -1;
}

module.exports = async (from, to) => {
    let routine = [],
        height = [],
        cost = 0;

    // 1. 获取所有多边形
    let db = await mongoClient.connect(mongoPath, {useUnifiedTopology: true});
    let col = db.db(config["db"]["db"]).collection("zone");
    let polygons = await col.find({type: 0}).toArray();

    // 2. 采用A* 算法

    /**
     * 采用A*算法，分辨率为1m，
     * 两格点间距离由max(abs(50*Δh), distance(p1, p2))表示（因为上升速度较慢，这个值可以之后再调试）
     * 所以与目标的估值h(p')由max(50*h[p'], distance(p', t))给出
     * 从p移动到p'的开销在
     * 1. abs(h[p']-h[p])>1 时约等于50*abs(h[p']-h[p])
     * 2. h[p']=h[p] 时等于distance(p, p'), 在高纬下距离变小
     *
     */

    const ascendTime = 0.5;

    ///// 距离函数 /////

    const h = (p) => {
        return Math.max(Math.abs(ascendTime * p.h), distance([p.x, p.y], to));
    };

    const g = (p, pp) => {
        return 50 * Math.abs(p.h - pp.h) + distance([p.x, p.y], [pp.x, pp.y]);
    };

    const objTo = {
        x: Math.floor(to[0]),
        y: Math.floor(to[1]),
        h: 0
    };

    let open = [],
        close = [],
        result = [],
        resultIndex = -1;

    open.push({
        x: from[0],
        y: from[1],
        h: 0,
        parent: null,
        G: 0
    });

    do {
        let cur = open.pop();
        close.push(cur);
        let neighbours = generateNeighbours(cur, polygons);
        neighbours.forEach((p) => {
            let G = cur.G + g(cur, p);
            if(exists(p, open) === -1) {
                p.H = h(p);
                p.G = G;
                p.F = p.H + G;
                p.parent = cur;
                open.push(p);
            } else {
                let index = exists(p, open);
                if(G < open[index].G) {
                    open[index].parent = cur;
                    open[index].G = G;
                    open[index].F = G + open[index].H + G;
                }
            }
        });
        if(open.length === 0) break;
        open.sort((a, b) => { return b.F - a.F; });
    } while((resultIndex = exists(objTo, open)) === -1);

    if(resultIndex !== -1)  {
        let cur = open[resultIndex];
        do {
            routine.unshift([cur.x, cur.y]);
            height.unshift(cur.h);
            cur = cur.parent;
        } while(cur.parent);
    }

    return {
        routine: routine,
        height: height,
        cost: cost
    }
};