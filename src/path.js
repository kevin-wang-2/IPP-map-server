/**
 * 节点间路径
 */
const mongoClient = require("mongodb").MongoClient;
const config = require("../utils/config").readConfigSync();
const mongoPath = "mongodb://" + config["db"]["user"] + ":" + config["db"]["pwd"] + "@" + config["db"]["ip"] + ":" + config["db"]["port"] + "/" + config["db"]["db"];
const {ObjectID} = require("mongodb");

module.exports = {
    async post(params, qs, body) {
        if(!body.hasOwnProperty("routine") || !body.hasOwnProperty("from") || !body.hasOwnProperty("to")) throw {
            code: 400,
            description: "Invalid Arguments"
        };

        let db = await mongoClient.connect(mongoPath, {useUnifiedTopology: true});

        let pinCol = db.db(config["db"]["db"]).collection("pinpoint");
        let fromRec = await pinCol.find({_id: ObjectID(body.from)}).count();
        let toRec = await pinCol.find({_id: ObjectID(body.to)}).count();
        if(fromRec === 0 || toRec === 0) throw {
            code: 400,
            description: "Points doesn't exist"
        };

        let routeCol = db.db(config["db"]["db"]).collection("routine");
        let updateResult = await routeCol.updateOne({_id: ObjectID(body.routine)}, {
            $set: {temporary: false}
        });
        if(updateResult.result.matchedCount === 0) throw {
            code: 400,
            description: "Routine doesn't exist"
        };

        let col = db.db(config["db"]["db"]).collection("path");
        let preResult = await db.find({$and: [{terminal: ObjectID(body.from)}, {terminal: ObjectID(body.to)}]}).count();
        if(preResult !== 0) throw {
            code: 400,
            description: "Path already exist"
        };
        let result = await col.insertOne({
            routine: ObjectID(body.routine),
            terminal: [ObjectID(body.from), ObjectID(body.to)],
        });

        await db.close();
        return result;
    },
    async getallwith(params) {
        if(!params.hasOwnProperty("id")) throw {
            code: 400,
            description: "Invalid Arguments"
        };

        let db = await mongoClient.connect(mongoPath, {useUnifiedTopology: true});
        let col = db.db(config["db"]["db"]).collection("path");
        let result = await col.find({terminal: ObjectID(params.id)}).toArray();

        await db.close();
        return result;
    },
    async getundirected(params) {
        if(!params.hasOwnProperty("id1") || !params.hasOwnProperty("id2")) throw {
            code: 400,
            description: "Invalid Arguments"
        };

        let db = await mongoClient.connect(mongoPath, {useUnifiedTopology: true});
        let col = db.db(config["db"]["db"]).collection("path");
        let result = await col.find({$and: [{terminal: ObjectID(params.id1)}, {terminal: ObjectID(params.id2)}]}).toArray();

        await db.close();
        return result[0];
    }
};