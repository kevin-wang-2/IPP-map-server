const mongoClient = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
const config = require("../utils/config").readConfigSync();
const mongoPath = "mongodb://" + config["db"]["user"] + ":" + config["db"]["pwd"] + "@" + config["db"]["ip"] + ":" + config["db"]["port"] + "/" + config["db"]["db"]["map"];

// TODO: 这里没有鉴权！

module.exports = {
    async post(params, qs, body) {
        if(!body.hasOwnProperty("type") || !body.hasOwnProperty("vertex")) {
            throw {
                code: 400,
                description: "Invalid Arguments"
            }
        }

        try {
            if(body["vertex"][0].length !== 2) throw {};
        } catch(e) {
            throw {
                code: 400,
                description: "Invalid Arguments"
            }
        }

        let numVertex = [];
        body.vertex.forEach((item) => {
            numVertex.push([
                Number.parseFloat(item[0]),
                Number.parseFloat(item[1]),
            ])
        });

        let db, col, result;

        switch(body["type"]) {
            case "ban":
                db = await mongoClient.connect(mongoPath, { useUnifiedTopology: true });
                col = db.db(config["db"]["db"]["map"]).collection("zone");
                result = await col.insertOne({
                    type: 0,
                    minHeight: -1,
                    vertex: numVertex
                });
                await db.close();
                break;
            case "restriction":
                if(!body.hasOwnProperty("min-height")) throw {
                    code: 400,
                    description: "Invalid Arguments"
                };

                db = await mongoClient.connect(mongoPath, { useUnifiedTopology: true });
                col = db.db(config["db"]["db"]["map"]).collection("zone");
                result = await col.insertOne({
                    type: 0,
                    minHeight: Number.parseFloat(body["min-height"]),
                    vertex: numVertex
                });
                await db.close();
                break;
            case "garage":
                db = await mongoClient.connect(mongoPath, { useUnifiedTopology: true });
                col = db.db(config["db"]["db"]["map"]).collection("zone");
                result = await col.insertOne({
                    type: 1,
                    vertex: numVertex
                });
                break;
            default:
                throw {
                    code: 400,
                    description: "Invalid Zone Type"
                }
        }

        await db.close();

        return result.result;
    },
    async getall() {
        let db = await mongoClient.connect(mongoPath, { useUnifiedTopology: true });
        let col = db.db(config["db"]["db"]["map"]).collection("zone");
        let result = await col.find({}).toArray();
        await db.close();

        return result;
    },
    async get(params) {
        if(!params.id) throw {
            code: 400,
            description: "Invalid Arguments"
        };
        let db = await mongoClient.connect(mongoPath, { useUnifiedTopology: true });
        let col = db.db(config["db"]["db"]["map"]).collection("zone");
        let result = await col.find({_id: ObjectID(params.id)}).toArray();
        await db.close();

        if(result.length === 0)  throw {
            code: 404,
            description: "No corresponding result"
        };
        else return result[0];
    },
    async deleteid(params) {
        if(!params.id) throw {
            code: 400,
            description: "Invalid Arguments"
        };
        let db = await mongoClient.connect(mongoPath, { useUnifiedTopology: true });
        let col = db.db(config["db"]["db"]["map"]).collection("zone");
        let result = (await col.deleteOne({_id: ObjectID(params.id)})).result;
        await db.close();

        return result;
    },
    async patch(params, qs, body) {
        if(!params.id) throw {
            code: 400,
            description: "Invalid Arguments"
        };

        let db, col, result;

        if(body.hasOwnProperty("type")) {
            switch(body.type) {
                case "ban":
                    db = await mongoClient.connect(mongoPath, { useUnifiedTopology: true });
                    col = db.db(config["db"]["db"]["map"]).collection("zone");
                    result = await col.updateOne({_id: ObjectID(params.id)}, {$set: {type: 0, minHeight: -1}});
                    break;
                case "restriction":
                    if(!body.hasOwnProperty("min-height")) throw {
                        code: 400,
                        description: "Invalid Arguments"
                    };

                    db = await mongoClient.connect(mongoPath, { useUnifiedTopology: true });
                    col = db.db(config["db"]["db"]["map"]).collection("zone");
                    result = await col.updateOne({_id: ObjectID(params.id)}, {$set: {type: 0, minHeight:body["min-height"]}});
                    break;
                case "garage":
                    db = await mongoClient.connect(mongoPath, { useUnifiedTopology: true });
                    col = db.db(config["db"]["db"]["map"]).collection("zone");
                    result = await col.updateOne({_id: ObjectID(params.id)}, {$set: {type: 1}});
                    break;
                default:
                    throw {
                        code: 400,
                        description: "Invalid Zone Type"
                    }
            }
            await db.close();

            return result.result;
        } else throw {
            code: 304,
            description: "Not Modified"
        }
    }
};