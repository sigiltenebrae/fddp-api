const config = require("../config/db.config.js");
const Pool = require('pg').Pool
const pool = new Pool({
    user: config.USER,
    host: config.HOST,
    database: config.DB,
    password: config.PASSWORD,
    port: 5432,
});

let scryfalldata = null;
let commanderdata = null;
let scryfalldata_cheap = null;
let commanderdata_cheap = null;

function getScryfallData() {
    return scryfalldata;
}

function setScryfallData(data) {
    scryfalldata = data;
}

function getCommanderData() {
    return commanderdata;
}

function getCheapData() {
    return scryfalldata_cheap;
}

function getCheapCommanderData() {
    return commanderdata_cheap;
}

/**
 * Loads a commanderdata array of all legal commanders found in the scryfalldata array
 */
function loadCommanderData() {
    commanderdata = [];
    for (let card of scryfalldata) {
        let toAdd = false;
        if (card.type_line != null && card.type_line.includes("Legendary") && card.type_line.includes("Creature")) {
            toAdd = true;
        }
        else if (card.type_line != null && card.type_line.includes("Background")) {
            toAdd = true;
        }
        else if (card.card_faces != null && card.card_faces.length > 0 && card.card_faces[0].type_line != null &&
            card.card_faces[0].type_line.includes("Legendary") && card.card_faces[0].type_line.includes("Creature")) {
            toAdd = true;
        }
        else if (card.oracle_text != null && card.oracle_text.includes("can be your commander")) {
            toAdd = true;
        }
        else if (card.card_faces != null && card.card_faces.length > 0 && card.card_faces[0].oracle_text != null &&
            card.card_faces[0].oracle_text.includes("can be your commander")) {
            toAdd = true;
        }
        if (toAdd) {
            const inArray = commanderdata.some(element => {
                return element.name === card.name;
            });
            if (!inArray) {
                commanderdata.push(card);
            }
        }
    }
}

/**
 * Loads a scryfalldata_cheap array of all cards with a sale price below the given value
 */
function loadCheapData(max_cost) {
    scryfalldata_cheap = [];
    for (let card of scryfalldata) {
        if (card.prices != null && card.prices) {
            let cheapest = 5000;
            cheapest = card.prices.usd != null && Number(card.prices.usd) > 0 && Number(card.prices.usd) < cheapest ? Number(card.prices.usd) : cheapest
            cheapest = card.prices.usd_foil != null && Number(card.prices.usd_foil) > 0 && Number(card.prices.usd_foil) < cheapest ? Number(card.prices.usd_foil) : cheapest
            cheapest = card.prices.usd_etched != null && Number(card.prices.usd_etched) > 0 && Number(card.prices.usd_etched) < cheapest ? Number(card.prices.usd_etched) : cheapest
            if (cheapest > 0 && cheapest < max_cost) {
                const inArray = scryfalldata_cheap.some(element => {
                    return element.name === card.name;
                });
                if (!inArray) {
                    if (card.legalities != null && card.legalities.commander != null && card.legalities.commander === 'legal') {
                        scryfalldata_cheap.push(card);
                    }
                }
            }
        }
    }
}

/**
 * Loads a commanderdata_cheap array of all legal commanders found in the scryfalldata_cheap array
 */
function loadCheapCommanders() {
    commanderdata_cheap = [];
    for (let card of scryfalldata_cheap) {
        if (card.type_line != null && card.type_line.includes("Legendary") && card.type_line.includes("Creature")) {
            commanderdata_cheap.push(card);
        }
        else if (card.type_line != null && card.type_line.includes("Background")) {
            commanderdata_cheap.push(card);
        }
        else if (card.card_faces != null && card.card_faces.length > 0 && card.card_faces[0].type_line != null &&
            card.card_faces[0].type_line.includes("Legendary") && card.card_faces[0].type_line.includes("Creature")) {
            commanderdata_cheap.push(card);
        }
        else if (card.oracle_text != null && card.oracle_text.includes("can be your commander")) {
            commanderdata_cheap.push(card);
        }
        else if (card.card_faces != null && card.card_faces.length > 0 && card.card_faces[0].oracle_text != null &&
            card.card_faces[0].oracle_text.includes("can be your commander")) {
            commanderdata_cheap.push(card);
        }
    }
}

/**
 * Return the unformatted scryfall card object of the first instance of matching card name
 * @param card_name string name of the card to get
 * @returns {any}
 */
function getScryfallCard(card_name) {
    for (let card of scryfalldata) {
        if (card.name.toLowerCase() === card_name.toLowerCase()) {
            return card;
        }
    }
}

/**
 * Return the unformatted scryfall card object of the first instance matching card id
 * @param id int id of the card to get
 * @returns {any}
 */
function getScryfallCardById(id) {
    for (let card of scryfalldata) {
        if (card.id === id) {
            return card;
        }
    }
}

/**
 * Returns an array of card objects for all instances matching card name
 * @param card_name
 * @returns [{any}]
 */
function getAllOfCard(card_name) {
    let card_data = [];
    for (let card of scryfalldata) {
        if (card.name.toLowerCase() === card_name.toLowerCase()) {
            card_data.push(card);
        }
    }
    return card_data;
}

/**
 * Returns the cheapest cost in usd found for the given card name
 * @param card_name
 * @returns number
 */
function getCheapestCost(card_name) {
    let cards = getAllOfCard(card_name);
    let cheapest = 99999999;
    for (let card of cards) {
        cheapest = card.prices.usd != null && Number(card.prices.usd) > 0 && Number(card.prices.usd) < cheapest ? Number(card.prices.usd) : cheapest
        cheapest = card.prices.usd_foil != null && Number(card.prices.usd_foil) > 0 && Number(card.prices.usd_foil) < cheapest ? Number(card.prices.usd_foil) : cheapest
        cheapest = card.prices.usd_etched != null && Number(card.prices.usd_etched) > 0 && Number(card.prices.usd_etched) < cheapest ? Number(card.prices.usd_etched) : cheapest
    }
    return cheapest;
}

/**
 * Returns the formatted scryfall card object
 * @param card_name string name of the card to get
 * @returns {any}
 */
function getFormattedScryfallCard(card_name) {
    let out_card = {};
    out_card.images = [];
    out_card.back_images = [];
    for (let card of scryfalldata) {
        if (card.name.toLowerCase() === card_name.toLowerCase()) {
            out_card.name = card.name;
            if (card.card_faces && card.card_faces.length === 2){
                out_card.back_face = true;
                out_card.mana_cost = card.card_faces[0].mana_cost != null? card.card_faces[0].mana_cost.replace(/[^a-zA-Z0-9 ]/g, '').split('').filter(element => element): null;
                out_card.color_identity = card.color_identity != null? card.color_identity.join('').replace(/[^a-zA-Z0-9 ]/g, '').split('').filter(element => element): null;
                out_card.back_mana_cost = card.card_faces[1].mana_cost != null ? card.card_faces[1].mana_cost.replace(/[^a-zA-Z0-9 ]/g, '').split('').filter(element => element): null;
                out_card.types = card.card_faces[0].type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element);
                out_card.back_types = card.card_faces[1].type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element);
                out_card.oracle_text = card.card_faces[0].oracle_text;
                out_card.back_oracle_text = card.card_faces[1].oracle_text;
                out_card.power = card.card_faces[0].power != null && card.card_faces[0].power !== '*' ? Number(card.card_faces[0].power): card.card_faces[0].power === '*'? 0: null;
                out_card.back_power = card.card_faces[1].power != null && card.card_faces[1].power !== '*' ? Number(card.card_faces[1].power): card.card_faces[1].power === '*'? 0: null;
                out_card.toughness = card.card_faces[0].toughness != null && card.card_faces[0].toughness !== '*' ? Number(card.card_faces[0].toughness): card.card_faces[0].toughness === '*'? 0: null;
                out_card.back_toughness = card.card_faces[1].toughness != null && card.card_faces[1].toughness !== '*' ? Number(card.card_faces[1].toughness): card.card_faces[1].toughness === '*' ? 0: null;
                out_card.loyalty = card.card_faces[0].loyalty != null ? Number(card.card_faces[0].loyalty): null;
                out_card.back_loyalty = card.card_faces[1].loyalty != null ? Number(card.card_faces[1].loyalty): null;
                out_card.legality = card.legalities.commander === 'legal';
                out_card.cheapest = getCheapestCost(card.name);
            }
            else{
                out_card.back_face = false;
                out_card.color_identity = card.color_identity != null? card.color_identity.join('').replace(/[^a-zA-Z0-9 ]/g, '').split('').filter(element => element): null;
                out_card.mana_cost = card.mana_cost != null ? card.mana_cost.replace(/[^a-zA-Z0-9 ]/g, '').split('').filter(element => element): null;
                out_card.back_mana_cost = null;
                out_card.types = card.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element);
                out_card.back_types = null;
                out_card.oracle_text = card.oracle_text;
                out_card.back_oracle_text = null;
                out_card.power = card.power != null && card.power !== '*' ? Number(card.power): card.power === '*' ? 0: null;
                out_card.back_power = null;
                out_card.toughness = card.toughness != null && card.toughness !== '*' ? Number(card.toughness): card.toughness === '*'? 0: null;
                out_card.back_toughness = null;
                out_card.loyalty = card.loyalty != null ? Number(card.loyalty): null;
                out_card.back_loyalty = null;
                out_card.legality = card.legalities.commander === 'legal';
                out_card.cheapest = getCheapestCost(card.name);
            }
            out_card.cmc = card.cmc;
            if (card.all_parts) {
                let tokens = [];
                for (let part of card.all_parts) {
                    if (part.component === 'token' || part.type_line.includes('Emblem')) {
                        //tokens.push({name: part.name, types: part.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element),})
                        let token_data = getScryfallCardById(part.id);
                        tokens.push(
                            {
                                name: token_data.name,
                                types: token_data.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element),
                                oracle_text: token_data.oracle_text,
                                power: token_data.power != null && token_data.power !== '*' ? Number(token_data.power) : token_data.power === '*'? 0: null,
                                toughness: token_data.toughness != null && token_data.toughness !== '*' ? Number(token_data.toughness) : token_data.toughness === '*'? 0: null,
                                colors: token_data.colors,
                                image: token_data.image_uris.png
                            }
                        )
                    }
                }
                if (tokens.length > 0) {
                    out_card.tokens = tokens;
                }
            }
            if (card.related_uris && card.related_uris.gatherer) {
                out_card.gatherer = card.related_uris.gatherer;
            }
            return out_card;
        }
    }
    return {};
}

/**
 * Returns an array of all cards in the db with the type 'Plane'
 * @returns [{any}]
 */
function getPlanes() {
    let planes = [];
    for (let card of scryfalldata) {
        if (card.type_line) {
            let types = card.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element);
            if (types.includes('Plane')) {
                planes.push(card.name);
            }
        }
    }
    return planes;
}

/**
 * Returns an array of all valid images for a given card name.
 * @param card_name
 * @returns [{any}]
 */
function getAllCardImages(card_name) {
    let images = [];
    for (let card of scryfalldata) {
        if (card_name.toLowerCase() === card.name.toLowerCase()) {
            if (card.image_uris && card.image_uris.png) {
                images.push(card.image_uris.png);
            }
        }
    }
    pool.query('SELECT * FROM custom_cards WHERE name = $1', [card_name], (error, results) => {
        if (error) {
            console.log('Error getting custom cards for ' + card_name);
            console.log(error);
            return images;
        }
        if (!results.rows || results.rows.length === 0) {
            return images;
        }
        else {
            results.rows.forEach((card) => {
                images.push(card.image);
            });
            return images;
        }
    })
    return images;
}

exports.getAllOfCardApi = (request, response) => {
    const card_name = request.body.name;
    response.json(getAllOfCard(card_name));
}

exports.getScryfallCardApi = (request, response) => {
    const card_name = request.body.name;
    response.json(getScryfallCard(card_name));
}

exports.getCardImagesApi = (request, response) => {
    const card_name = request.body.name;
    console.log('Getting images for: ' + card_name);
    let out_card = {};
    out_card.images = [];
    out_card.back_images = [];
    for (let card of scryfalldata) {
        if (card.name.toLowerCase() === card_name.toLowerCase()) {
            out_card.name = card.name;
            if (card.image_uris && card.image_uris.png) {
                out_card.images.push(
                    {
                        image: card.image_uris.png,
                        set_name: card.set_name,
                        date: card.released_at
                    });
            }
            else if (card.card_faces && card.card_faces.length === 2) {
                if (card.card_faces[0].image_uris && card.card_faces[0].image_uris.png) {
                    out_card.images.push({
                        image: card.card_faces[0].image_uris.png,
                        set_name: card.set_name,
                        date: card.released_at
                    });
                }
                if (card.card_faces[1].image_uris && card.card_faces[1].image_uris.png) {
                    out_card.back_images.push({
                        image: card.card_faces[1].image_uris.png,
                        set_name: card.set_name,
                        date: card.released_at
                    });
                }
            }
        }
    }
    pool.query('SELECT * FROM custom_cards WHERE name = $1', [card_name], (error, results) => {
        if (error) {
            console.log('Error getting custom cards for ' + card_name);
            console.log(error);
            out_card.images.sort((a, b) => (a.date < b.date) ? 1: -1);
            out_card.back_images.sort((a, b) => (a.date < b.date) ? 1: -1);
            return response.json(out_card);
        }
        if (!results.rows || results.rows.length === 0) {
            out_card.images.sort((a, b) => (a.date < b.date) ? 1: -1);
            out_card.back_images.sort((a, b) => (a.date < b.date) ? 1: -1);
            return response.json(out_card);
        }
        else {
            results.rows.forEach((card) => {
                out_card.images.push({
                    image: card.image,
                    set_name: "Custom",
                    date: "9999999999999"
                });
                if (out_card.back_images.length > 0) {
                    out_card.back_images.push({
                        image: card.image,
                        set_name: "Custom",
                        date: "99999999999999"
                    });
                }
            });
            out_card.images.sort((a, b) => (a.date < b.date) ? 1: -1);
            out_card.back_images.sort((a, b) => (a.date < b.date) ? 1: -1);
            return response.json(out_card);
        }
    })

}

/**
 * Gets all instances of a token in Scryfall and the local db
 */
exports.getAllOfTokenApi = (request, response) => {
    const card_name = request.body.name;
    let card_data = getAllOfCardFormatted(card_name);
    pool.query("SELECT * FROM custom_tokens WHERE name LIKE '" + card_name + "'", (error, results) => {
        if (error) {
            console.log('Error getting custom cards for ' + card_name);
            console.log(error);
            card_data.sort((a, b) => (a.date < b.date) ? 1: -1);
            return response.json(card_data);
        }
        if (!results.rows || results.rows.length === 0) {
            card_data.sort((a, b) => (a.date < b.date) ? 1: -1);
            return response.json(card_data);
        }
        else {
            results.rows.forEach((card) => {
                let colors = [];
                if (card.w) { colors.push("W")}
                if (card.u) { colors.push("U")}
                if (card.b) { colors.push("B")}
                if (card.r) { colors.push("R")}
                if (card.g) { colors.push("G")}
                card_data.push(
                    {
                        name: card.name,
                        image: card.image,
                        types: card.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element),
                        power: card.power != null && card.power !== '*'? Number(card.power): card.power === '*' ? 0: null,
                        toughness: card.toughness != null && card.toughness !== '*'? Number(card.toughness): card.toughness === '*' ? 0: null,
                        oracle_text: card.oracle_text,
                        date: "99999999999",
                        set_name: "Custom",
                        colors: colors
                    }
                );
            });
            card_data.sort((a, b) => (a.date < b.date) ? 1: -1);
            return response.json(card_data);
        }
    });
}

exports.getPlanesApi = (request, response) => {
    return response.json(getPlanes());
}



module.exports = {
    loadCommanderData,
    loadCheapCommanders,
    loadCheapData,
    getScryfallData,
    setScryfallData,
    getCommanderData,
    getCheapData,
    getCheapCommanderData,
    getFormattedScryfallCard,
    getAllCardImages,
}