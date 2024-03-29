const config = require("../config/db.config.js");
const {response} = require("express");
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
    return null;
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
 * Return a list of all cards with a name containing the substring.
 * @param card_name
 * @returns {*[]}
 */
function searchScryfallCard(card_name) {
    let card_data = [];
    for (let card of scryfalldata) {
        if (card.name.toLowerCase().includes(card_name.toLowerCase())) {
            card_data.push(card);
        }
    }
    return card_data;
}

function autocompleteScryfallCard(card_name, options) {
    if (card_name == null || card_name === '' || card_name === ' ') {
        return [];
    }
    let card_data = [];
    for (let card of scryfalldata) {
        if (card.name.toLowerCase().includes(card_name.toLowerCase())) {
            if(!card_data.includes(card.name)) {
                if (options && options.nontoken) {
                    let types = card.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element);
                    if (!types.includes('Token')) {
                        card_data.push(card.name);
                    }
                }
                else {
                    card_data.push(card.name);
                }
            }
        }
    }
    card_data.sort((a, b) => (a > b)? 1: -1);
    if (options && options.max_length) {
        if (card_dara.length > options.max_length) {
            card_data = card_data.slice(0, options.max_length);
        }
    }
    return card_data;
}

function getAllOfCardFormatted(card_name, search) {
    let card_data = [];
    for (let card of scryfalldata) {
        if (
            (!search && card.name.toLowerCase() === card_name.toLowerCase()) ||
            (search && card.name.toLowerCase().includes(card_name.toLowerCase()))
        ) {
            card_data.push({
                name: card.name,
                image: card.image_uris != null && card.image_uris.png != null? card.image_uris.png: null,
                types: card.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element),
                power: card.power != null && card.power !== '*'? Number(card.power): card.power === '*'? 0: null,
                toughness: card.toughness != null && card.toughness !== '*'? Number(card.toughness): card.toughness === '*'? 0: null,
                oracle_text: card.oracle_text,
                date: card.released_at,
                set_name: card.set_name,
                colors: card.colors
            });
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
 * @param options options object. nontoken only supported value.
 * @returns {any}
 */
function getFormattedScryfallCard(card_name, options) {
    for (let card of scryfalldata) {
        if (card.name.toLowerCase() === card_name.toLowerCase()) {
            if (options && options.nontoken) {
                let types = card.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element);
                if (!types.includes('Token')) {
                    return formatScryfallCard(card);
                }
            }
            else {
                return formatScryfallCard(card);
            }
        }
    }
    return {};
}

function formatScryfallCard(card) {
    let out_card = {};
    out_card.images = [];
    out_card.back_images = [];
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
        out_card.defense = card.card_faces[0].defense != null ? Number(card.card_faces[0].defense): null;
        out_card.back_defense = card.card_faces[1].defense != null ? Number(card.card_faces[1].defense): null;
        out_card.legality = card.legalities.commander === 'legal';
        out_card.default_image = card.card_faces[0].image_uris != null && card.card_faces[0].image_uris.png != null? card.card_faces[0].image_uris.png: null
        out_card.default_back_image = card.card_faces[1].image_uris != null && card.card_faces[1].image_uris.png != null? card.card_faces[1].image_uris.png: null
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
        out_card.defense = card.defense != null ? Number(card.defense): null;
        out_card.back_defense = null;
        out_card.legality = card.legalities.commander === 'legal';
        out_card.default_image = card.image_uris != null && card.image_uris.png != null? card.image_uris.png: null
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
                        image: token_data.image_uris != null && token_data.image_uris.png != null? token_data.image_uris.png: null
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

function getStickers(options) {
    let stickers = [];
    for (let card of scryfalldata) {
        if (card.type_line) {
            let types = card.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element);
            if (types.includes('Stickers')) {
                if (options != null && options.legal) {
                    if (card.legalities.commander === 'legal') {
                        let out_card = formatScryfallCard(card)
                        out_card.image = card.image_uris != null && card.image_uris.png != null? card.image_uris.png: null;
                        stickers.push(out_card);
                    }
                }
                else {
                    let out_card = formatScryfallCard(card)
                    out_card.image = card.image_uris != null && card.image_uris.png != null? card.image_uris.png: null;
                    stickers.push(out_card);
                }
            }
        }
    }
    return stickers;
}

function getAttractions(options) {
    let attractions = [];
    for (let card of scryfalldata) {
        if (card.type_line) {
            let types = card.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element);
            if (types.includes('Attraction')) {
                if (options != null && options.legal) {
                    if (card.legalities.commander === 'legal') {
                        let out_card = formatScryfallCard(card)
                        out_card.image = card.image_uris != null && card.image_uris.png != null? card.image_uris.png: null;
                        attractions.push(out_card);
                    }
                }
                else {
                    let out_card = formatScryfallCard(card)
                    out_card.image = card.image_uris != null && card.image_uris.png != null? card.image_uris.png: null;
                    attractions.push(out_card);
                }
            }
        }
    }
    return attractions;
}

function getContraptions(options) {
    let contraptions = [];
    for (let card of scryfalldata) {
        if (card.type_line) {
            let types = card.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element);
            if (types.includes('Contraption')) {
                let out_card = formatScryfallCard(card)
                out_card.image = card.image_uris != null && card.image_uris.png != null? card.image_uris.png: null;
                contraptions.push(out_card);
            }
        }
    }
    return contraptions;
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

let getAllOfCardApi = (request, response) => {
    const card_name = request.body.name;
    return response.json(getAllOfCard(card_name));
}

let searchCardApi = (request, response) => {
    const card_name = request.body.name;
    return response.json(searchScryfallCard(card_name));
}

let autocompleteApi = (request, response) => {
    const card_name = request.body.name;
    const options = request.body.options;
    return response.json(autocompleteScryfallCard(card_name, options));
}

let getUnformattedScryfallCardApi = (request, response) => {
    const card_name = request.body.name;
    return response.json(getScryfallCard(card_name))
}

let getScryfallCardApi = (request, response) => {
    const card_name = request.body.name;
    //return response.json(getScryfallCard(card_name));
    return response.json(getFormattedScryfallCard(card_name));
}

let getScryfallCardByIdApi = (request, response) => {
    const id = request.body.id;
    return response.json(formatScryfallCard(getScryfallCardById(id)));
}

let getCardImagesApi = (request, response) => {
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
        else if (card.name.toLowerCase() === card_name.toLowerCase() + ' // ' + card_name.toLowerCase()) { //weird special double side secret lairs
            out_card.name = card.name;
            if (card.card_faces[0].image_uris && card.card_faces[0].image_uris.png) {
                out_card.images.push({
                    image: card.card_faces[0].image_uris.png,
                    set_name: card.set_name,
                    date: card.released_at
                });
            }
            if (card.card_faces[1].image_uris && card.card_faces[1].image_uris.png) {
                out_card.images.push({
                    image: card.card_faces[1].image_uris.png,
                    set_name: card.set_name,
                    date: card.released_at
                });
            }
        }
        else if (card_name.toLowerCase() === card.name.toLowerCase().substring(0, card.name.indexOf(' //'))) { //tokens?
            if (card.card_faces[0].image_uris && card.card_faces[0].image_uris.png) {
                out_card.images.push({
                    image: card.card_faces[0].image_uris.png,
                    set_name: card.set_name,
                    date: card.released_at
                });
            }
        }
        else if (card_name.toLowerCase() === card.name.toLowerCase().substring(card.name.indexOf(' //') + 4)) {
            if (card.card_faces[1].image_uris && card.card_faces[1].image_uris.png) {
                out_card.images.push({
                    image: card.card_faces[1].image_uris.png,
                    set_name: card.set_name,
                    date: card.released_at
                });
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
let getAllOfTokenApi = (request, response) => {
    const card_name = request.body.name;
    const search = request.body.search != null? request.body.search: false;
    let card_data = getAllOfCardFormatted(card_name, search);
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

let getPlanesApi = (request, response) => {
    return response.json(getPlanes());
}

let getStickersApi = (request, response) => {
    return response.json(getStickers(null));
}

let getAttractionsApi = (request, response) => {
    return response.json(getAttractions(null));
}

let getContraptionsApi = (request, response) => {
    return response.json(getContraptions());
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
    getAllOfCardApi,
    searchCardApi,
    autocompleteApi,
    getScryfallCardById,
    getScryfallCardApi,
    getUnformattedScryfallCardApi,
    getScryfallCardByIdApi,
    getCardImagesApi,
    getAllOfTokenApi,
    getPlanesApi,
    getStickers,
    getStickersApi,
    getAttractions,
    getAttractionsApi,
    getContraptions,
    getContraptionsApi
}