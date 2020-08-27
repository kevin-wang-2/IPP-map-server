/**
 * 节点间路径
 */
const mongoClient = require("mongodb").MongoClient;
const config = require("../utils/config").readConfigSync();
const mongoPath = "mongodb://" + config["db"]["user"] + ":" + config["db"]["pwd"] + "@" + config["db"]["ip"] + ":" + config["db"]["port"] + "/" + config["db"]["db"]["map"];
const {ObjectID, DBRef} = require("mongodb");

module.exports = {
    async post(params, qs, body) {
        if(!body.hasOwnProperty("routine") || !body.hasOwnProperty("from") || !body.hasOwnProperty("to")) throw {
            code: 400,
            description: "Invalid Arguments"
        };

        let db = await mongoClient.connect(mongoPath, {useUnifiedTopology: true});

        let pinCol = db.db(config["db"]["db"]["map"]).collection("pinpoint");
        let fromRec = await pinCol.find({_id: ObjectID(body.from)}).count();
        let toRec = await pinCol.find({_id: ObjectID(body.to)}).count();
        if(fromRec === 0 || toRec === 0) throw {
            code: 400,
            description: "Points doesn't exist"
        };

        await pinCol.updateMany({$or: [{_id: ObjectID(body.from)}, {_id: ObjectID(body.to)}], new: true}, {$set: {new: false}});

        let col = db.db(config["db"]["db"]["map"]).collection("path");
        let routeCol = db.db(config["db"]["db"]["map"]).collection("routine");
        let updateResult = await routeCol.updateOne({_id: ObjectID(body.routine)}, {
            $set: {temporary: false}
        });
        if(updateResult.result.matchedCount === 0) throw {
            code: 400,
            description: "Routine doesn't exist"
        };

        let preResult = await col.find({$and: [{terminal: ObjectID(body.from)}, {terminal: ObjectID(body.to)}]}).toArray();
        if(preResult.length !== 0) {
            await col.deleteOne({$and: [{terminal: ObjectID(body.from)}, {terminal: ObjectID(body.to)}]});
            for(let i = 0; i < preResult.length; i++) {
                await routeCol.deleteOne({_id: preResult[i].routine});
            }
        }

        let result = await col.insertOne({
            routine: DBRef("routine", ObjectID(body.routine)),
            terminal: [DBRef("pinpoint", ObjectID(body.from)), DBRef("pinpoint", ObjectID(body.to))],
        });

        await db.close();
        return result.result;
    },
    async getallwith(params) {
        if(!params.hasOwnProperty("id")) throw {
            code: 400,
            description: "Invalid Arguments"
        };

        let db = await mongoClient.connect(mongoPath, {useUnifiedTopology: true});
        let col = db.db(config["db"]["db"]["map"]).collection("path");
        let result = await col.find({"terminal.$id": ObjectID(params.id)}).toArray();

        await db.close();
        return result;
    },
    async getundirected(params) {
        if(!params.hasOwnProperty("id1") || !params.hasOwnProperty("id2")) throw {
            code: 400,
            description: "Invalid Arguments"
        };

        let db = await mongoClient.connect(mongoPath, {useUnifiedTopology: true});
        let col = db.db(config["db"]["db"]["map"]).collection("path");
        let result = await col.find({$and: [{"terminal.$id": ObjectID(params.id1)}, {"terminal.$id": ObjectID(params.id2)}]}).toArray();

        await db.close();

        if(result.length === 0)  throw {
            code: 404,
            description: "No corresponding result"
        };

        return result[0];
    }
};