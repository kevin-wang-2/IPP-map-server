const {fork} = require("child_process");

const mongoClient = require("mongodb").MongoClient;
const config = require("../utils/config").readConfigSync();
const mongoPath = "mongodb://" + config["db"]["user"] + ":" + config["db"]["pwd"] + "@" + config["db"]["ip"] + ":" + config["db"]["port"] + "/" + config["db"]["db"];
const {ObjectID} = require("mongodb");

module.exports = {
    async post(params, qs, body) {
        if (!qs.hasOwnProperty("multi") || qs.multi === "false") {
            if (!body.hasOwnProperty("from") || !body.hasOwnProperty("to")) throw {
                code: 400,
                description: "Invalid Arguments"
            };

            if (body.from.length !== 2 && body.to.length !== 2) throw {
                code: 400,
                description: "From and to should be coordinates"
            };

            let db = await mongoClient.connect(mongoPath, {useUnifiedTopology: true});
            let col = db.db(config["db"]["db"]).collection("route");
            let result = await col.insertOne({
                status: "pending"
            });

            let id = result.insertedId;
            let cp = fork("./src/routine/routineSearch.js");
            cp.send({
                POIs: [
                    [Number.parseFloat(body.from[0]), Number.parseFloat(body.from[1])],
                    [Number.parseFloat(body.to[0]), Number.parseFloat(body.to[1])]],
                dbid: id,
                mongoPath
            });

            return {
                id
            };
        } else {
            if (!body.hasOwnProperty("POI") || !body.POI[0] || body.POI[0].length !== 2) throw {
                code: 400,
                description: "Invalid Arguments"
            };

            let POI = [];
            body.POI.forEach((i) => {
                POI.push([
                    Number.parseFloat(i[0]), Number.parseFloat(i[1])
                ])
            });

            let db = await mongoClient.connect(mongoPath, {useUnifiedTopology: true});
            let col = db.db(config["db"]["db"]).collection("route");
            let result = await col.insertOne({
                status: "pending"
            });
            await db.close();

            let id = result.insertedId;
            let cp = fork("./src/routine/routineSearch.js");
            cp.send({
                POIs: POI,
                dbid: id,
                mongoPath
            });

            return {
                id
            };
        }
    },
    async get(params) {
        if(!params.hasOwnProperty("id")) throw {
            code: 400,
            description: "Invalid Arguments"
        };

        let db = await mongoClient.connect(mongoPath, {useUnifiedTopology: true});
        let col = db.db(config["db"]["db"]).collection("route");
        let result = (await col.find({_id: ObjectID(params.id)}).toArray())[0];
        await db.close();

        return result;
    }
};