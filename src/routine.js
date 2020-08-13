const search = require("./routine/routineSearch");

module.exports = {
    async get(params, qs, body) {
        if(!qs.hasOwnProperty("multi") || qs.multi === "false") {
            if (!qs.hasOwnProperty("from") || !qs.hasOwnProperty("to")) throw {
                code: 400,
                description: "Invalid Arguments"
            };

            if (qs.from.length !== 2 && qs.to.length !== 2) throw {
                code: 400,
                description: "From and to should be coordinates"
            };

            return await search([
                [Number.parseFloat(qs.from[0]), Number.parseFloat(qs.from[1])],
                [Number.parseFloat(qs.to[0]), Number.parseFloat(qs.to[1])]]
            )
        } else {
            if(!qs.hasOwnProperty("POI") || !qs.POI[0] || qs.POI[0].length !== 2) throw {
                code: 400,
                description: "Invalid Arguments"
            };

            let POI = [];
            qs.POI.forEach((i) => {
                POI.push([
                    Number.parseFloat(i[0]), Number.parseFloat(i[1])
                ])
            });

            return await search(POI);
        }
    }
};