module.exports = {
    async get(params, qs, body) {
        if(!qs.hasOwnProperty("from") || !qs.hasOwnProperty("to")) throw {
            code: 400,
            description: "Invalid Arguments"
        };

        if(qs.from.length !== 2 && qs.to.length !== 2) throw {
            code: 400,
            description: "From and to should be coordinates"
        };

        return await require("./routine/routineSearch")(
            [Number.parseFloat(qs.from[0]), Number.parseFloat(qs.from[1])],
            [Number.parseFloat(qs.to[0]), Number.parseFloat(qs.to[1])]
        )
    }
};