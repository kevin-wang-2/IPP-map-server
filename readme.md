## 地图服务器

根目录: /map/

- 区域相关API

  - GET /map/zone 列出所有区域

    参数: 无

    返回: 区域数组，区域格式参考数据建模表

  - GET /map/zone/id 列出指定ID的区域

    参数: URL参数 id 必须为有效ObjectID

    返回: 若参数正确，则返回区域数据；若找不到区域，则返回404，{"error":"No corresponding result"}

  - POST /map/zone 新建区域

    参数: 请求体参数 type: ban/restriction/garage, vertex: 二维坐标数组; 若type为restriction要附加min-height参数表面最低高度 

    返回: 若参数正确，则返回{n: 1, ok: 1}

  - PATCH /map/zone/id 修改区域信息

    参数: URL参数 id 必须为有效ObjectID; 请求体参数 type: ban/restriction/garage; 若type为restriction要附加min-height参数表面最低高度 

    返回: 若参数正确，则返回{n: 1, nModified: x, ok: 1}若x为0则无修改内容，x为1则有修改内容

  - DELETE /map/zone/id 删除区域

    参数: URL参数 id 必须为有效ObjectID

    返回: 若参数正确，则返回{n: 1,ok: 1}

- 寻路相关API

  - GET /map/routine/id 列出指定ID的路径

    参数: URL参数 id 必须为有效ObjectID

    返回: 若参数正确，则返回路径数据；若找不到路径，则返回404，{"error":"No corresponding result"}

    注: 由于区域为异步运算，status为pending则表明运算未完成，为OK则表明运算完成，由于区域数据量大，不提供批量查找

  - POST /map/routine 新建路径

    参数: querystring参数 multi 若为true则进入多点模式，为false则进入单点模式; 多点模式下 请求体参数 POI为所有途径点的二或三维坐标数组（有序）; 单点模式下 请求体参数 from及to为起点与终点两个二或三维数组

    返回: {id: ObjectID}为创建路径的ID

    注: 该操作会开启寻路进程，若同时有很多寻路进程运行会及其影响性能

- 地图钉相关API

  - GET /map/pinpoint 列出所有地图钉

    参数: 无

    返回: 地图钉数组

  - GET /map/pinpoint/id 列出指定ID的地图钉

    参数: URL参数 id 必须为有效ObjectID

    返回: 若参数正确，则返回地图钉数据；若找不到地图钉，则返回404，{"error":"No corresponding result"}

  - POST /map/pinpoint 新建地图钉

    参数: 请求体参数 type: point/terminal, coordinate: 三维坐标 

    返回: 若参数正确，则返回{n: 1, ok: 1}

  - PATCH /map/pinpoint/id 修改地图钉信息

    参数: URL参数 id 必须为有效ObjectID; 请求体参数 type: point/terminal

    返回: 若参数正确，则返回{n: 1, nModified: x, ok: 1}若x为0则无修改内容，x为1则有修改内容

  - DELETE /map/pinpoint/id 删除地图钉

    参数: URL参数 id 必须为有效ObjectID

    返回: 若参数正确，则返回{n: 1, ok: 1}

- 关键路径相关API

  - GET /map/path/pin 列出与地图钉相连的所有关键路径

    参数: URL参数 pin 必须为有效ObjectID

    返回: 若参数正确，则返回关键点信息

  - GET /map/path/pin1/pin2 列出两点间的关键路径

    参数: URL参数 pin1, pin2 必须为有效ObjectID

    返回: 若参数正确，则返回关键点信息；若找不到路径，则返回404，{"error":"No corresponding result"}

  - POST /map/path 建立关键路径

    参数: 请求体参数 routine为寻路ID, from与to为地图钉ID

    返回: 若参数正确，则返回{n: 1, ok: 1}