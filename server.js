const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const https = require("https");
const fs = require('fs');
const axios = require('axios');

const config = require('./config/db.config');
const Pool = require('pg').Pool
const pool = new Pool({
    user: config.USER,
    host: config.HOST,
    database: config.DB,
    password: config.PASSWORD,
    port: 5432,
});

const decksdb = require('./interfaces/decks');
const gamesdb = require('./interfaces/games');
const usersdb = require('./interfaces/users');
const customsdb = require('./interfaces/custom_cards');
const bansdb = require('./interfaces/ban_list');
const authdb = require('./interfaces/auth');

const {request, response} = require("express");

const app = express();
const port = 2999;
app.use(cors({
    origin: '*'
}));

app.use(bodyParser.json())
app.use(
    bodyParser.urlencoded({
        extended: true,
    }));

app.post('/', (request, response) => {
    response.json({ info: 'API endpoint for EDFDDP' });
});


let scryfalldata = null;
let cheapdata = null;
let cheap_commanders_list = null;

function updateDB() {
    return new Promise ((resolve) => {
            axios.get('https://api.scryfall.com/bulk-data').then( res => {
                let update_url = '';
                for (let bulk of res.data.data) {
                    if (bulk.type === 'default_cards') {
                        update_url = bulk.download_uri;
                        break;
                    }
                }
                if (update_url !== '') {
                    if (!fs.existsSync('assets')){
                        fs.mkdirSync('assets');
                    }
                    const update_file = fs.createWriteStream("assets/default-cards.json");
                    const update_request = https.get(update_url, function(response) {
                        response.pipe(update_file);
                        update_file.on("finish", () => {
                            update_file.close();
                            console.log('scryfall update downloaded');
                            rawscryfalldata = fs.readFileSync('assets/default-cards.json');
                            scryfalldata = JSON.parse(rawscryfalldata);
                            cheapdata = getCheapCardsList();
                            cheap_commanders_list = loadCheapCommanders();
                            resolve();
                        });
                    });
                }
            }).catch(function (error) {
                console.log('error updating the local scryfall db');
                resolve();
            });
        });
}

function getCheapCardsList() {
    let cheaps = [];
    for (let card of scryfalldata) {
        if (card.prices != null && card.prices) {
            let cheapest = 5000;
            cheapest = card.prices.usd != null && Number(card.prices.usd) > 0 && Number(card.prices.usd) < cheapest ? Number(card.prices.usd) : cheapest
            cheapest = card.prices.usd_foil != null && Number(card.prices.usd_foil) > 0 && Number(card.prices.usd_foil) < cheapest ? Number(card.prices.usd_foil) : cheapest
            cheapest = card.prices.usd_etched != null && Number(card.prices.usd_etched) > 0 && Number(card.prices.usd_etched) < cheapest ? Number(card.prices.usd_etched) : cheapest
            if (cheapest > 0 && cheapest < 0.5) {
                const inArray = cheaps.some(element => {
                    return element.name === card.name;
                });
                if (!inArray) {
                    if (card.legalities != null && card.legalities.commander != null && card.legalities.commander === 'legal') {
                        cheaps.push(card);
                    }
                }
            }
        }
    }
    return cheaps;
}

function loadCheapCommanders() {
    let commanders = [];
    for (let card of cheapdata) {
        if (card.type_line != null && card.type_line.includes("Legendary") && card.type_line.includes("Creature")) {
            commanders.push(card);
        }
        else if (card.type_line != null && card.type_line.includes("Background")) {
            commanders.push(card);
        }
        else if (card.card_faces != null && card.card_faces.length > 0 && card.card_faces[0].type_line != null &&
            card.card_faces[0].type_line.includes("Legendary") && card.card_faces[0].type_line.includes("Creature")) {
            commanders.push(card);
        }
        else if (card.oracle_text != null && card.oracle_text.includes("can be your commander")) {
            commanders.push(card);
        }
        else if (card.card_faces != null && card.card_faces.length > 0 && card.card_faces[0].oracle_text != null &&
            card.card_faces[0].oracle_text.includes("can be your commander")) {
            commanders.push(card);
        }
    }
    return commanders;
}

function getRandomCardsForCommander(commander, commander2) {
    let deck = [];
    let size = commander2 == null? 59: 58;
    while (deck.length < size) {
        let random_card = cheapdata[Math.floor(Math.random() * cheapdata.length)];
        if (random_card.color_identity != null) {
            let bad_card = false;
            for (let color of random_card.color_identity) {
                if (commander2 == null && !commander.color_identity.includes(color)) {
                    bad_card = true;
                    break;
                }
                else if (commander2 != null && !commander.color_identity.includes(color) && !commander2.color_identity.includes(color)) {
                    bad_card = true;
                    break;
                }
            }
            if (!bad_card) {
                if (random_card.type_line != null && !random_card.type_line.includes("Land")) {
                    const inArray = deck.some(element => {
                        return element.name === random_card.name;
                    });
                    if (!inArray) {
                        //let formatted_card = formatRandomCardData(random_card.name);
                        deck.push(random_card);
                    }
                }
            }
        }
    }
    return deck;
}

function formatRandomCardData(card_name) {
    let card_data = getCardScryfallData(card_name);
    let random_card_images = getAllCardImages(card_name);
    card_data.image = random_card_images[Math.floor(Math.random() * random_card_images.length)];
    card_data.power = card_data.power != null && card_data.power !== '*' ? Number(card_data.power): card_data.power === '*' ? 0: null;
    card_data.back_power = card_data.back_power != null && card_data.back_power !== '*' ? Number(card_data.back_power): card_data.back_power === '*'? 0: null;
    card_data.toughness = card_data.toughness != null && card_data.toughness !== '*' ? Number(card_data.toughness): card_data.toughness === '*'? 0: null;
    card_data.back_toughness = card_data.back_toughness != null && card_data.back_toughness !== '*'? Number(card_data.back_toughness): card_data.back_toughness === '*' ? 0:  null;
    card_data.loyalty = card_data.loyalty != null ? Number(card_data.loyalty): null;
    card_data.back_loyalty = card_data.back_loyalty != null ? Number(card_data.back_loyalty): null;
    card_data.cmc = card_data.cmc != null ? Number(card_data.cmc): null;
    card_data.count = 1;
    card_data.iscommander = false;
    return card_data;
}

function getRandomLandsForCommander(commander, commander2) {
    let land_list = [];
    let random_lands = [];
    for (let card of cheapdata) {
        if (card.type_line != null && card.type_line.includes("Land")  && !card.type_line.includes("Basic")) {
            land_list.push(card);
        }
    }
    while (random_lands.length < 10) {
        let random_land = land_list[Math.floor(Math.random() * land_list.length)];
        if (random_land.color_identity != null) {
            let bad_card = false;
            for (let color of random_land.color_identity) {
                if (commander2 == null && !commander.color_identity.includes(color)) {
                    bad_card = true;
                    break;
                }
                else if (commander2 != null && !commander.color_identity.includes(color) && !commander2.color_identity.includes(color)) {
                    bad_card = true;
                    break;
                }
            }
            if (!bad_card) {
                const inArray = random_lands.some(element => {
                    return element.name === random_land.name;
                });
                if (!inArray) {
                    //let formatted_land = formatRandomCardData(random_land.name);
                    random_lands.push(random_land);
                }
            }
        }
    }
    return random_lands;
}

function getBasicsForDeck(deck) {
    let basics = [];
    let w_count = 0;
    let u_count = 0;
    let b_count = 0;
    let r_count = 0;
    let g_count = 0;
    for (let card of deck) {
        if (card.mana_cost != null) {
            w_count += (card.mana_cost.match(/{W}/g) || []).length;
            u_count += (card.mana_cost.match(/{U}/g) || []).length;
            b_count += (card.mana_cost.match(/{B}/g) || []).length;
            r_count += (card.mana_cost.match(/{R}/g) || []).length;
            g_count += (card.mana_cost.match(/{G}/g) || []).length;
        }
    }
    let total_count = w_count + u_count + b_count + r_count + g_count;
    if (w_count > 0) {
        //let plains = justGetCard('plains');
        let plains = formatRandomCardData('Plains');
        if (Math.floor(Math.random() * 100) > 75) {
            plains = formatRandomCardData('Snow-Covered Plains');
        }
        for (let i = 0; i < Math.floor((w_count / total_count) * 30); i++) {
            basics.push(plains);
        }
    }
    if (u_count > 0) {
        //let island = justGetCard('island');
        let island = formatRandomCardData('Island');
        if (Math.floor(Math.random() * 100) > 75) {
            island = formatRandomCardData('Snow-Covered Island');
        }
        for (let i = 0; i < Math.floor((u_count / total_count) * 30); i++) {
            basics.push(island);
        }
    }
    if (b_count > 0) {
        //let swamp = justGetCard('swamp');
        let swamp = formatRandomCardData('Swamp');
        if (Math.floor(Math.random() * 100) > 75) {
            swamp = formatRandomCardData('Snow-Covered Swamp');
        }
        for (let i = 0; i < Math.floor((b_count / total_count) * 30); i++) {
            basics.push(swamp);
        }
    }
    if (r_count > 0) {
        //let mountain = justGetCard('mountain');
        let mountain = formatRandomCardData('Mountain');
        if (Math.floor(Math.random() * 100) > 75) {
            mountain = formatRandomCardData('Snow-Covered Mountain');
        }
        for (let i = 0; i < Math.floor((r_count / total_count) * 30); i++) {
            basics.push(mountain);
        }
    }
    if (g_count > 0) {
        //let forest = justGetCard('forest');
        let forest = formatRandomCardData('Forest');
        if (Math.floor(Math.random() * 100) > 75) {
            forest = formatRandomCardData('Snow-Covered Forest');
        }
        for (let i = 0; i < Math.floor((g_count / total_count) * 30); i++) {
            basics.push(forest);
        }
    }
    if (basics.length < 30) {
        //let wastes = justGetCard('wastes');
        let wastes = formatRandomCardData('Wastes');
        for (let i = basics.length; i < 30; i++) {
            basics.push(wastes);
        }
    }
    return basics;
}

function getPartnersFromCommanders() {
    let partners = [];
    for (let card of cheap_commanders_list) {
        if (card.keywords && card.keywords.includes("Partner")) {
            partners.push(card);
        }
    }
    return partners;
}

function getPartnerWithsFromCommanders() {
    let partners = [];
    for (let card of cheap_commanders_list) {
        if (card.keywords && card.keywords.includes("Partner with")) {
            partners.push(card);
        }
    }
    return partners;
}

function getFriendsForeverCommanders() {
    let comms = [];
    for (let card of cheap_commanders_list) {
        if (card.oracle_text && card.oracle_text.includes("Friends forever")) {
            comms.push(card);
        }
    }
    return comms;
}

function getCommandersForBackgrounds() {
    let comms = [];
    for (let card of cheap_commanders_list) {
        if (card.oracle_text && card.oracle_text.includes("Choose a Background")) {
            comms.push(card);
        }
    }
    return comms;
}

function getBackgroundsForCommander() {
    let backs = [];
    for (let card of cheap_commanders_list) {
        if (card.type_line && card.type_line.includes("Background")) {
            backs.push(card);
        }
    }
    return backs;
}

function getRandomDeck() {
    let random_commander = cheap_commanders_list[Math.floor(Math.random() * cheap_commanders_list.length)];
    //let p_list = getPartnersFromCommanders(commanders_list);
    //let random_commander = p_list[Math.floor(Math.random() * p_list.length)];
    //let pw_list = getPartnerWithsFromCommanders(commanders_list);
    //let random_commander = pw_list[Math.floor(Math.random() * pw_list.length)];
    //let chooser_list = getCommandersForBackgrounds(commanders_list);
    //let random_commander = chooser_list[Math.floor(Math.random() * chooser_list.length)];
    //let background_list = getBackgroundsForCommander(commanders_list);
    //let random_commander = background_list[Math.floor(Math.random() * background_list.length)];
    //let random_commander = getAllOfCard("Faceless One")[0];
    //let ff_list = getFriendsForeverCommanders(commanders_list);
    //let random_commander = ff_list[Math.floor(Math.random() * ff_list.length)];


    if (random_commander.name === "Faceless One" || random_commander.name === "The Prismatic Piper") {
        let colors = ["W", "U", "B", "R", "G"];
        random_commander.color_identity = [colors[Math.floor(Math.random() * colors.length)]];
    }

    let random_commander_2 = null;

    if (random_commander.keywords && random_commander.keywords.includes("Partner")) {
        let partners = getPartnersFromCommanders();
        if (random_commander.keywords.includes("Partner with")) {
            if (random_commander.all_parts != null && random_commander.all_parts.length > 0) {
                for (let part of random_commander.all_parts) {
                    if (part.id !== random_commander.id) {
                        let temp_partner = getCardById(part.id);
                        if (temp_partner.keywords && temp_partner.keywords.includes("Partner with")) {
                            let cheapest = 200;
                            cheapest = temp_partner.prices.usd != null && Number(temp_partner.prices.usd) > 0 && Number(temp_partner.prices.usd) < cheapest ? Number(temp_partner.prices.usd) : cheapest
                            cheapest = temp_partner.prices.usd_foil != null && Number(temp_partner.prices.usd_foil) > 0 && Number(temp_partner.prices.usd_foil) < cheapest ? Number(temp_partner.prices.usd_foil) : cheapest
                            cheapest = temp_partner.prices.usd_etched != null && Number(temp_partner.prices.usd_etched) > 0 && Number(temp_partner.prices.usd_etched) < cheapest ? Number(temp_partner.prices.usd_etched) : cheapest
                            if (cheapest > 0 && cheapest < 0.5) {
                                random_commander_2 = temp_partner;
                            }
                            break;
                        }
                    }
                }
            }
        }
        else {
            random_commander_2 = partners[Math.floor(Math.random() * partners.length)];
        }
    }
    else if (random_commander.oracle_text && random_commander.oracle_text.includes("Friends forever")) {
        let ff_list = getFriendsForeverCommanders();
        random_commander_2 = ff_list[Math.floor(Math.random() * ff_list.length)];
    }
    else if (random_commander.oracle_text && random_commander.oracle_text.includes("Choose a Background") && random_commander.name !== "Faceless One") {
        let backgrounds = getBackgroundsForCommander();
        random_commander_2 = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    }
    else if (random_commander.type_line && random_commander.type_line.includes("Background") && random_commander.name !== "Faceless One") {
        let choosers = getCommandersForBackgrounds();
        random_commander_2 = choosers[Math.floor(Math.random() * choosers.length)];
    }
    else if (random_commander.name === "Faceless One") {
        if (Math.floor(Math.random() * 100) > 50) {
            let backgrounds = getBackgroundsForCommander();
            random_commander_2 = backgrounds[Math.floor(Math.random() * backgrounds.length)];
        }
        else {
            let choosers = getCommandersForBackgrounds();
            random_commander_2 = choosers[Math.floor(Math.random() * choosers.length)];
        }
    }
    if (random_commander_2 != null) {
        if (random_commander_2.name === "Faceless One" || random_commander_2.name === "The Prismatic Piper") {
            let colors = ["W", "U", "B", "R", "G"];
            random_commander_2.color_identity = [colors[Math.floor(Math.random() * colors.length)]];
        }
    }

    let random_deck = getRandomCardsForCommander(random_commander, random_commander_2);
    let random_lands = getRandomLandsForCommander(random_commander, random_commander_2);
    for (let land of random_lands) {
        random_deck.push(land);
    }
    let basic_lands = getBasicsForDeck(random_deck);
    let final_random_deck = [];
    for (let card of random_deck) {
        final_random_deck.push(formatRandomCardData(card.name));
    }
    for (let land of basic_lands) {
        final_random_deck.push(land);
    }
    if (random_commander_2 != null) {
        let randomc2 = formatRandomCardData(random_commander_2.name);
        randomc2.iscommander = true;
        final_random_deck.unshift(randomc2);
    }
    let randomc1 = formatRandomCardData(random_commander.name)
    randomc1.iscommander = true;
    final_random_deck.unshift(randomc1);
    return final_random_deck;
}


/**
 * The outer function to generate a random cheap deck.
 * @returns {{}}
 */
function getRandomDeckForPlay() {
    let random_cards = getRandomDeck();
    let random_deck = {};
    random_deck.id = -1;
    random_deck.name = "Random Deck"
    random_deck.owner = -1;
    random_deck.sleeves = "";
    random_deck.cards = random_cards;
    random_deck.tokens = [];
    return random_deck;
}

function format_deck(deck) {
    let card_list = [];
    for (let card of deck) {
        card_list.push(card.name);
    }
    return card_list;
}

getCheapCards = (request, response) => {
    response.json(cheapdata);
}

getCheapCommanders = (request, response) => {
    response.json(getCommandersFromList(cheapdata));
}

getCheapDeck = (request, response) => {
    response.json(getRandomDeckForPlay());
}

getCheapDeckList = (request, response) => {
    response.json(format_deck(getRandomDeck()));
}

function getAllOfCard(card_name) {
    let card_data = [];
    for (let card of scryfalldata) {
        if (card.name.toLowerCase() === card_name.toLowerCase()) {
            card_data.push(card);
        }
    }
    return card_data;
}

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

function getAllOfCardFormatted(card_name) {
    let card_data = [];
    for (let card of scryfalldata) {
        if (card.name.toLowerCase() === card_name.toLowerCase()) {
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
 * Gets all instances of a token in Scryfall and the local db
 */
getAllOfToken = (request, response) => {
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

function justGetCard(card_name) {
    for (let card of scryfalldata) {
        if (card.name.toLowerCase() === card_name.toLowerCase()) {
            return card;
        }
    }
}

debugGetCard = (request, response) => {
    const card_name = request.body.name;
    response.json(getAllOfCard(card_name));
}

getCardInfo = (request, response) => {
    const card_name = request.body.name;
    response.json(getCardScryfallData(card_name));
}

getPlanesApi = (request, response) => {
    return response.json(getPlanes());
}

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

getCardImages = (request, response) => {
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

function getPlanes() {
    console.log('getting planes');
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

function getCardById(id) {
    for (let card of scryfalldata) {
        if (card.id === id) {
            return card;
        }
    }
}



getDecksForUserBasic = (request, response) => {
    let userid = null
    if (request.params.id) {
        userid = parseInt(request.params.id);
        console.log('getting decks for user: ' + userid)
    }
    else {
        console.log('getting all decks');
    }

    let errors = [];
    let decks = [];
    pool.query('SELECT * FROM decks' + (userid == null ? '': ' WHERE owner = ' + userid),
        (error, results) => {
            if (error) {
                console.log('Error getting decks for user: ' + userid);
                console.log(error);
                return response.json({decks: [], errors: [error]});
            } else {
                if (results.rows && results.rows.length > 0) {
                    let deck_data_promises = []
                    for (let deck_data of results.rows) {
                        deck_data_promises.push(new Promise((resolve, reject) => {
                            pool.query('SELECT * FROM deck_cards WHERE deckid = $1 AND iscommander', [deck_data.id],
                                (err, res) => {
                                    if (err) {
                                        console.log('Error getting cards for deck: ' + deck_data.id);
                                        console.log(err);
                                        errors.push(err);
                                        deck_data.commander = [];
                                        deck_data.colors = [];
                                        decks.push(deck_data);
                                        resolve();
                                    } else {
                                        deck_data.commander = res.rows;
                                        deck_data.colors = [];
                                        for (let card of deck_data.commander) {
                                            let scryfall_card = getCardScryfallData(card.name);
                                            for (let mana of scryfall_card.color_identity) {
                                                if (mana === 'W' || mana === 'U' || mana === 'B' || mana === 'R' || mana === 'G') {
                                                    deck_data.colors.push(mana);
                                                }
                                            }
                                        }
                                        decks.push(deck_data);
                                        resolve();
                                    }
                                });
                        }))
                    }
                    Promise.all(deck_data_promises).then(() => {
                        return response.json({decks: decks, errors: errors});
                    });
                } else {
                    return response.json({decks: [], errors: []});
                }
            }
        });
}

function getBanId(ban_type, ban_types){
    for (let type of ban_types) {
        if (ban_type === type.type) {
            return type.id;
        }
    }
}

getDeckLegality = (request, response) => {
    let deckid = request.params.id;
    pool.query('SELECT * FROM decks where id = $1', [deckid],
        (error, results) => {
            if (error) {
                console.log('Error getting deck: ');
                console.log(error);
                return response.json([{name: "Failed to check legality", gatherer: null}]);
            }
            if (results.rows.length > 0) {
                let deck = results.rows[0];
                pool.query('SELECT * FROM deck_cards WHERE deckid = $1', [deckid], (err, res) => {
                    if (err) {
                        console.log('Error getting cards for deck: ' + deckid);
                        console.log(err);
                        return response.json([{name: "Failed to check legality", gatherer: null}]);
                    }
                    deck.cards = res.rows;
                    pool.query('SELECT * FROM ban_list', (e, r) => {
                        if (e) {
                            console.log('Error getting ban list');
                            console.log(e);
                            return response.json([{name: "Failed to check legality", gatherer: null}]);
                        }
                        let banned_cards = r.rows
                        pool.query('SELECT * FROM ban_types', (er, re) => {
                            if (er) {
                                console.log('Error getting ban types');
                                console.log(er);
                                return response.json([{name: "Failed to check legality", gatherer: null}]);
                            }
                            let ban_types = re.rows;
                            let ban_list = [[],[],[],[]];
                            banned_cards.forEach((card) => {
                                ban_list[card.ban_type - 1].push(card);
                            });
                            let bad_cards = [];
                            deck.cards.forEach((card) => {
                                let card_data = getCardScryfallData(card.name);
                                card.gatherer = card_data.gatherer ? card_data.gatherer: null;
                                card.legality = card_data.legality;
                                card.cheapest = card_data.cheapest;
                            });
                            for (let card of deck.cards) {
                                let card_allowed = true;
                                for (let banned_card of ban_list[getBanId("banned", ban_types) - 1]) {
                                    if (card.name === banned_card.name) {
                                        card_allowed = false;
                                        break;
                                    }
                                }
                                if (!card_allowed) {
                                    bad_cards.push({name: card.name, gatherer: card.gatherer});
                                    break;
                                }
                                else {
                                    if (!card.legality || card.cheapest > 25) {
                                        card_allowed = false;
                                        if (card.iscommander) {
                                            for (let unbanned_commander of ban_list[getBanId("allowed as commander", ban_types) - 1]) {
                                                if (card.name === unbanned_commander.name) {
                                                    card_allowed = true;
                                                    break;
                                                }
                                            }
                                        }
                                        if (!card_allowed) {
                                            for (let unbanned_card of ban_list[getBanId("unbanned", ban_types) - 1]) {
                                                if (card.name === unbanned_card.name) {
                                                    card_allowed = true;
                                                    break;
                                                }
                                            }
                                        }
                                        if (!card_allowed) {
                                            bad_cards.push({name: card.name, gatherer: card.gatherer});
                                        }
                                    }
                                }
                            }
                            return response.json(bad_cards);
                        });
                    });
                });
            }
            else {
                return response.json([{name: "Failed to check legality", gatherer: null}]);
            }
        });
}

function getCardScryfallData(card_name) {
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
                        let token_data = getCardById(part.id);
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

getArchidektDeck = (request, response) =>{
    const id = request.params.id;
    axios.get('https://archidekt.com/api/decks/' + id + '/').then( res => {
        response.json(res.data);
    })
}

getDeckForPlay = (request, response) => {
    const id = parseInt(request.params.id);
    pool.query('SELECT * FROM decks where id = $1', [id], (error, results) => {
        if (error) {
            console.log('Error getting deck: ');
            console.log(error);
            return response.json({errors: [error]});
        }
        if (results.rows.length > 0) {
            let deck = results.rows[0];
            pool.query('SELECT * FROM deck_cards WHERE deckid = $1', [id], (err, res) => {
                if (err) {
                    console.log('Error getting cards for deck: ' + id);
                    console.log(err);
                    return response.json({deck: deck, errors: [err]});
                }
                deck.cards = res.rows;
                deck.cards.forEach((card) => {
                    let card_data = getCardScryfallData(card.name);

                    card.back_face = card_data.back_face ? card_data.back_face: false;
                    card.mana_cost = card_data.mana_cost ? card_data.mana_cost: [];
                    card.color_identity = card_data.color_identity ? card_data.color_identity: [];
                    card.back_mana_cost = card_data.back_mana_cost ? card_data.back_mana_cost: [];
                    card.types = card_data.types ? card_data.types: [];
                    card.back_types = card_data.back_types ? card_data.back_types: [];
                    card.oracle_text = card_data.oracle_text ? card_data.oracle_text: '';
                    card.back_oracle_text = card_data.back_oracle_text ? card_data.back_oracle_text: '';
                    card.power = card_data.power != null && card_data.power !== '*' ? Number(card_data.power): card_data.power === '*' ? 0: null;
                    card.back_power = card_data.back_power != null && card_data.back_power !== '*' ? Number(card_data.back_power): card_data.back_power === '*'? 0: null;
                    card.toughness = card_data.toughness != null && card_data.toughness !== '*' ? Number(card_data.toughness): card_data.toughness === '*'? 0: null;
                    card.back_toughness = card_data.back_toughness != null && card_data.back_toughness !== '*'? Number(card_data.back_toughness): card_data.back_toughness === '*' ? 0:  null;
                    card.loyalty = card_data.loyalty != null ? Number(card_data.loyalty): null;
                    card.back_loyalty = card_data.back_loyalty != null ? Number(card_data.back_loyalty): null;
                    card.cmc = card_data.cmc != null ? Number(card_data.cmc): null;
                    card.tokens = card_data.tokens ? card_data.tokens: [];
                    card.gatherer = card_data.gatherer ? card_data.gatherer: null;
                    card.legality = card_data.legality;
                    card.cheapest = card_data.cheapest;
                });
                pool.query('SELECT * FROM deck_tokens WHERE deckid = $1', [id], (er, re) => {
                    if (er) {
                        console.log('Error getting tokens for deck ' + id);
                        console.log(er);
                        return response.json({deck: deck, errors: [er]});
                    }
                    deck.tokens = re.rows;
                    deck.tokens.forEach((token) => {
                        token.types = token.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element);
                        token.power = token.power != null && token.power !== '*' ? Number(token.power) : token.power === '*' ? 0: null;
                        token.toughness = token.toughness != null && token.toughness !== '*' ? Number(token.toughness) : token.toughness === '*'? 0: null;
                        let colors = [];
                        if (token.w) { colors.push("W")}
                        if (token.u) { colors.push("U")}
                        if (token.b) { colors.push("B")}
                        if (token.r) { colors.push("R")}
                        if (token.g) { colors.push("G")}
                        token.colors = colors;
                    });
                    console.log('compiled deck ' + deck.name);
                    return response.json(deck);
                });
            });
        }
        else {
            console.log('deck returned null value');
            return response.json({});
        }
    });
}

app.post('/api/auth/signup', authdb.signup);
app.post('/api/auth/signin', authdb.signin);
app.post('/api/auth/change_password', authdb.changepassword);


app.get('/api/users', usersdb.getUsers);
app.put('/api/users/:id', usersdb.updateProfile);


app.post('/api/cards', getCardInfo);
app.post('/api/cards/all', debugGetCard);
app.post('/api/tokens/all', getAllOfToken);
app.post('/api/cards/images', getCardImages);

app.get('/api/cheap/cards', getCheapCards);
app.get('/api/cheap/commanders', getCheapCommanders);
app.get('/api/cheap/randomdeck', getCheapDeck);
app.get('/api/cheap/randomdecklist', getCheapDeckList);

app.get('/api/userdecks/basic/:id', getDecksForUserBasic);
app.get('/api/decks/basic', getDecksForUserBasic);
app.get('/api/decks/legality/:id', getDeckLegality);

app.get('/api/archidekt/deck/:id', getArchidektDeck);

app.post('/api/decks', decksdb.createDeck);
app.get('/api/decks/:id', decksdb.getDeck);
app.put('/api/decks/:id', decksdb.updateDeck);
app.delete('/api/decks/:id', decksdb.deleteDeck);
app.get('/api/game/deck/:id', getDeckForPlay);
app.get('/api/decklist', decksdb.getDeckList);

app.post('/api/custom_cards', customsdb.createCustomCard);
app.get('/api/custom_cards', customsdb.getCustomCards);
app.delete('/api/custom_cards/:id', customsdb.deleteCustomCard)

app.post('/api/custom_tokens', customsdb.createCustomToken);
app.get('/api/custom_tokens', customsdb.getCustomTokens);
app.delete('/api/custom_tokens/:id', customsdb.deleteCustomToken);

app.get('/api/bans/list', bansdb.getBanList);
app.get('/api/bans/types', bansdb.getBanTypes);

app.get('/api/games/types', gamesdb.getGameTypes);
app.get('/api/games/', gamesdb.getGames);
app.get('/api/games/active', gamesdb.getActiveGames);
app.get('/api/games/:id', gamesdb.getGameById);
app.post('/api/games', gamesdb.createGame);
app.put('/api/games/start/:id', gamesdb.startGame);
app.put('/api/games/:id', gamesdb.updateGame);
app.get('/api/games/results/:id', gamesdb.getGameResults);

app.get('/api/planes', getPlanesApi);


if (fs.existsSync('assets/default-cards.json')) {
    let rawscryfalldata = fs.readFileSync('assets/default-cards.json');
    scryfalldata = JSON.parse(rawscryfalldata);
    cheapdata = getCheapCardsList();
    cheap_commanders_list = loadCheapCommanders();
}
updateDB().then(() => {
    app.listen(port, () => {
        console.log(`App running on port ${port}.`);
    });
    }
);
setInterval(updateDB, 60000 * 60 * 24);
