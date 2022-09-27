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
const authdb = require('./interfaces/auth');

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


function updateDB() {
    axios.get('https://api.scryfall.com/bulk-data').then( res => {
        let update_url = '';
        for (let bulk of res.data.data) {
            if (bulk.type === 'default_cards') {
                update_url = bulk.download_uri;
                break;
            }
        }
        if (update_url !== '') {
            console.log(update_url);
            const update_file = fs.createWriteStream("assets/default-cards.json");
            const update_request = https.get(update_url, function(response) {
                response.pipe(update_file);
                update_file.on("finish", () => {
                    update_file.close();
                    console.log('scryfall update downloaded');
                    rawscryfalldata = fs.readFileSync('assets/default-cards.json');
                    scryfalldata = JSON.parse(rawscryfalldata);
                });
            });
        }
    }).catch(function (error) {
        console.log('error updating the local scryfall db');
    });
}

getCardInfo = (request, response) => {
    const card_name = request.body.name;
    response.json(getCardScryfallData(card_name));
}

getPlanesApi = (request, response) => {
    return response.json(getPlanes());
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
                out_card.images.push(card.image_uris.png);
            }
            else if (card.card_faces && card.card_faces.length === 2) {
                if (card.card_faces[0].image_uris && card.card_faces[0].image_uris.png) {
                    out_card.images.push(card.card_faces[0].image_uris.png);
                }
                if (card.card_faces[1].image_uris && card.card_faces[1].image_uris.png) {
                    out_card.back_images.push(card.card_faces[1].image_uris.png);
                }
            }
        }
    }
    pool.query('SELECT * FROM custom_cards WHERE name = $1', [card_name], (error, results) => {
        if (error) {
            console.log('Error getting custom cards for ' + card_name);
            console.log(error);
            return response.json(out_card);
        }
        if (!results.rows || results.rows.length === 0) {
            return response.json(out_card);
        }
        else {
            results.rows.forEach((card) => {
                out_card.images.push(card.image);
                if (out_card.back_images.length > 0) {
                    out_card.back_images.push(card.image);
                }
            });
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

function getCardScryfallData(card_name) {
    let out_card = {};
    out_card.images = [];
    out_card.back_images = [];
    for (let card of scryfalldata) {
        if (card.name.toLowerCase() === card_name.toLowerCase()) {
            out_card.name = card.name;
            if (card.card_faces && card.card_faces.length === 2){
                out_card.back_face = true;
                out_card.mana_cost = card.card_faces[0].mana_cost? card.card_faces[0].mana_cost.replace(/[^a-zA-Z0-9 ]/g, '').split('').filter(element => element): null;
                out_card.color_identity = card.color_identity? card.color_identity.join('').replace(/[^a-zA-Z0-9 ]/g, '').split('').filter(element => element): null;
                out_card.back_mana_cost = card.card_faces[1].mana_cost? card.card_faces[1].mana_cost.replace(/[^a-zA-Z0-9 ]/g, '').split('').filter(element => element): null;
                out_card.types = card.card_faces[0].type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element);
                out_card.back_types = card.card_faces[1].type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element);
                out_card.oracle_text = card.card_faces[0].oracle_text;
                out_card.back_oracle_text = card.card_faces[1].oracle_text;
                out_card.power = card.card_faces[0].power ? Number(card.card_faces[0].power): null;
                out_card.back_power = card.card_faces[1].power ? Number(card.card_faces[1].power): null;
                out_card.toughness = card.card_faces[0].toughness ? Number(card.card_faces[0].toughness): null;
                out_card.back_toughness = card.card_faces[1].toughness ? Number(card.card_faces[1].toughness): null;
                out_card.loyalty = card.card_faces[0].loyalty ? Number(card.card_faces[0].loyalty): null;
                out_card.back_loyalty = card.card_faces[1].loyalty ? Number(card.card_faces[1].loyalty): null;
            }
            else{
                out_card.back_face = false;
                out_card.color_identity = card.color_identity? card.color_identity.join('').replace(/[^a-zA-Z0-9 ]/g, '').split('').filter(element => element): null;
                out_card.mana_cost = card.mana_cost? card.mana_cost.replace(/[^a-zA-Z0-9 ]/g, '').split('').filter(element => element): null;
                out_card.back_mana_cost = null;
                out_card.types = card.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element);
                out_card.back_types = null;
                out_card.oracle_text = card.oracle_text;
                out_card.back_oracle_text = null;
                out_card.power = card.power ? Number(card.power): null;
                out_card.back_power = null;
                out_card.toughness = card.toughness ? Number(card.toughness): null;
                out_card.back_toughness = null;
                out_card.loyalty = card.loyalty ? Number(card.loyalty): null;
                out_card.back_loyalty = null;
            }
            out_card.cmc = card.cmc;
            if (card.all_parts) {
                let tokens = [];
                for (let part of card.all_parts) {
                    if (part.component === 'token' || part.type_line.includes('Emblem')) {
                        tokens.push(
                            {
                                name: part.name,
                                types: part.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element),
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
                    card.power = card_data.power ? Number(card_data.power): null;
                    card.back_power = card_data.back_power ? Number(card_data.back_power): null;
                    card.toughness = card_data.toughness ? Number(card_data.toughness): null;
                    card.back_toughness = card_data.back_toughness ? Number(card_data.back_toughness): null;
                    card.loyalty = card_data.loyalty ? Number(card_data.loyalty): null;
                    card.back_loyalty = card_data.back_loyalty ? Number(card_data.back_loyalty): null;
                    card.cmc = card_data.cmc ? Number(card_data.cmc): null;
                    card.tokens = card_data.tokens ? card_data.tokens: [];
                    card.gatherer = card_data.gatherer ? card_data.gatherer: null;
                });
                pool.query('SELECT * FROM deck_tokens WHERE deckid = $1', [id], (er, re) => {
                    if (er) {
                        console.log('Error getting tokens for deck ' + id);
                        console.log(er);
                        return response.json({deck: deck, errors: [er]});
                    }
                    deck.tokens = re.rows;
                    deck.tokens.forEach((token) => {
                        let token_data = getCardScryfallData(token.name);

                        token.types = token_data.types ? token_data.types: [];
                        token.oracle_text = token_data.oracle_text ? token_data.oracle_text: null;
                        token.power = token_data.power ? Number(token_data.power): null;
                        token.toughness = token_data.toughness ? Number(token_data.toughness): null;
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

app.post('/api/cards', getCardInfo);
app.post('/api/cards/images', getCardImages);

app.get('/api/userdecks/basic/:id', decksdb.getDecksForUserBasic);
app.get('/api/decks/basic', decksdb.getAllDecksBasic);

app.post('/api/decks', decksdb.createDeck);
app.get('/api/decks/:id', decksdb.getDeck);
app.put('/api/decks/:id', decksdb.updateDeck);
app.delete('/api/decks/:id', decksdb.deleteDeck);
app.get('/api/game/deck/:id', getDeckForPlay);


app.post('/api/custom_cards', customsdb.createCustomCard);
app.get('/api/custom_cards', customsdb.getCustomCards);
app.delete('/api/custom_cards/:id', customsdb.deleteCustomCard)

app.get('/api/games/types', gamesdb.getGameTypes);
app.get('/api/games/', gamesdb.getGames);
app.get('/api/games/active', gamesdb.getActiveGames);
app.get('/api/games/:id', gamesdb.getGameById);
app.post('/api/games', gamesdb.createGame);
app.put('/api/games/start/:id', gamesdb.startGame);
app.put('/api/games/:id', gamesdb.updateGame);

app.get('/api/planes', getPlanesApi);



let rawscryfalldata = fs.readFileSync('assets/default-cards.json');
let scryfalldata = JSON.parse(rawscryfalldata);
updateDB();
setInterval(updateDB, 60000 * 60 * 24);
app.listen(port, () => {
    console.log(`App running on port ${port}.`);
});