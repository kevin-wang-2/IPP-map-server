const mongoClient = require("mongodb").MongoClient;
const config = require("../utils/config").readConfigSync();
const mongoPath = "mongodb://" + config["db"]["user"] + ":" + config["db"]["pwd"] + "@" + config["db"]["ip"] + ":" + config["db"]["port"] + "/" + config["db"]["db"]["map"];
const {ObjectID} = require("mongodb");

module.exports = {
    async post(params, qs, body) {
        if(!body.hasOwnProperty("coordinate") || !body.coordinate[0] || !body.coordinate[1] ||
            !body.hasOwnProperty("type") || (body.type !== "point" && body.type !== "terminal")) throw {
            code: 400,
            description: "Invalid Arguments"
        };

        let db = await mongoClient.connect(mongoPath, {useUnifiedTopology: true});
        let col = db.db(config["db"]["db"]["map"]).collection("pinpoint");
        let result = await col.insertOne({coordinate: [
            parseFloat(body.coordinate[0]), parseFloat(body.coordinate[1]), body.coordinate[2] ? parseFloat(body.coordinate[2]) : 0
            ], type: body.type});
        await db.close();

        return result.result;
    },
    async getall() {
        let db = await mongoClient.connect(mongoPath, {useUnifiedTopology: true});
        let col = db.db(config["db"]["db"]["map"]).collection("pinpoint");
        let result = await col.find({}).toArray();
        await db.close();

        return result;
    },
    async get(params) {
        if(!params.hasOwnProperty("id")) throw {
            code: 400,
            description: "Invalid Arguments"
        };

        let db = await mongoClient.connect(mongoPath, {useUnifiedTopology: true});
        let col = db.db(config["db"]["db"]["map"]).collection("pinpoint");
        let result = await col.find({_id: ObjectID(params.id)}).toArray();
        await db.close();

        if(result.length === 0) throw {
            code: 404,
            description: "No corresponding result"
        };
        else return result[0];
    },
    async delete(params) {
        if(!params.hasOwnProperty("id")) throw {
            code: 400,
            description: "Invalid Arguments"
        };

        let db = await mongoClient.connect(mongoPath, {useUnifiedTopology: true});
        let col = db.db(config["db"]["db"]["map"]).collection("pinpoint");
        let result = await col.deleteOne({_id: ObjectID(params.id)});

        let pathCol = db.db(config["db"]["db"]["map"]).collection("path");
        let routineCol = db.db(config["db"]["db"]["map"]).collection("routine");
        let pathRec = await pathCol.find({terminal: ObjectID(params.id)}).toArray();
        for(let i = 0; i < pathRec.length; i++)
            await routineCol.deleteOne({_id: pathRec[i].routine});
        await pathCol.deleteMany({terminal: ObjectID(params.id)});

        await db.close();

        return result.result;
    },
    async patch(params, qs, body) {
        if(!params.hasOwnProperty("id")) throw {
            code: 400,
            description: "Invalid Arguments"
        };

        let changelist = {};

        if(body.hasOwnProperty("type") && (body.type === "point" || body.type === "terminal"))
            changelist.type = body.type;

        if(!changelist) throw {
            code: 304,
            description: "Not Modified"
        };

        let db = await mongoClient.connect(mongoPath, {useUnifiedTopology: true});
        let col = db.db(config["db"]["db"]["map"]).collection("pinpoint");
        let result = await col.updateOne({_id: ObjectID(params.id)}, {$set: changelist});
        await db.close();

        return result.result;
    }
};