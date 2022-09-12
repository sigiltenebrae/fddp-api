const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');

const config = require('./config/db.config');
const Pool = require('pg').Pool
const pool = new Pool({
    user: config.USER,
    host: config.HOST,
    database: config.DB,
    password: config.PASSWORD,
    port: 5432,
});

const fddpdb = require('./interfaces/queries');
const {response} = require("express");
const {getUsers, deleteCustomCard} = require("./interfaces/queries");

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

let rawscryfalldata = fs.readFileSync('assets/default-cards-20220905210954.json');
let scryfalldata = JSON.parse(rawscryfalldata);

getCardInfo = (request, response) => {
    const card_name = request.body.name;
    response.json(getCardScryfallData(card_name));
}

getCardImages = (request, response) => {
    const card_name = request.body.name;
    console.log('Getting images for: ' + card_name);
    let out_card = {};
    out_card.name = card_name;
    out_card.images = [];
    out_card.back_images = [];
    for (let card of scryfalldata) {
        if (card.name === card_name) {
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

function getCardScryfallData(card_name) {
    let out_card = {};
    out_card.name = card_name;
    out_card.images = [];
    out_card.back_images = [];
    for (let card of scryfalldata) {
        if (card.name === card_name) {
            //console.log(card);
            if (card.card_faces && card.card_faces.length === 2){
                out_card.back_face = true;
                out_card.mana_cost = card.card_faces[0].mana_cost? card.card_faces[0].mana_cost.replace(/[^a-zA-Z0-9 ]/g, '').split('').filter(element => element): null;
                out_card.back_mana_cost = card.card_faces[1].mana_cost? card.card_faces[1].mana_cost.replace(/[^a-zA-Z0-9 ]/g, '').split('').filter(element => element): null;
                out_card.types = card.card_faces[0].type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element);
                out_card.back_types = card.card_faces[1].type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element);
                out_card.oracle_text = card.card_faces[0].oracle_text;
                out_card.back_oracle_text = card.card_faces[1].oracle_text;
                out_card.power = card.card_faces[0].power ? card.card_faces[0].power: null;
                out_card.back_power = card.card_faces[1].power ? card.card_faces[1].power: null;
                out_card.toughness = card.card_faces[0].toughness ? card.card_faces[0].toughness: null;
                out_card.back_toughness = card.card_faces[1].toughness ? card.card_faces[1].toughness: null;
                out_card.loyalty = card.card_faces[0].loyalty ? card.card_faces[0].loyalty: null;
                out_card.back_loyalty = card.card_faces[1].loyalty ? card.card_faces[1].loyalty: null;
            }
            else{
                out_card.back_face = false;
                out_card.mana_cost = card.mana_cost? card.mana_cost.replace(/[^a-zA-Z0-9 ]/g, '').split('').filter(element => element): null;
                out_card.back_mana_cost = null;
                out_card.types = card.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element);
                out_card.back_types = null;
                out_card.oracle_text = card.oracle_text;
                out_card.back_oracle_text = null;
                out_card.power = card.power ? card.power: null;
                out_card.back_power = null;
                out_card.toughness = card.toughness ? card.toughness: null;
                out_card.back_toughness = null;
                out_card.loyalty = card.loyalty ? card.loyalty: null;
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
                let commander = [];
                deck.cards.forEach((card) => {
                    let card_data = getCardScryfallData(card.name);

                    card.back_face = card_data.back_face;
                    card.mana_cost = card_data.mana_cost;
                    card.back_mana_cost = card_data.back_mana_cost;
                    card.types = card_data.types;
                    card.back_types = card_data.back_types;
                    card.oracle_text = card_data.oracle_text;
                    card.back_oracle_text = card_data.back_oracle_text;
                    card.power = Number(card_data.power);
                    card.back_power = Number(card_data.back_power);
                    card.toughness = Number(card_data.toughness);
                    card.back_toughness = Number(card_data.back_toughness);
                    card.loyalty = Number(card_data.loyalty);
                    card.back_loyalty = Number(card_data.back_loyalty);
                    card.cmc = Number(card_data.cmc);
                    card.tokens = card_data.tokens;
                    card.gatherer = card_data.gatherer;
                    if (card.iscommander) {
                        commander.push(card);
                    }
                });
                commander.forEach((com) => {
                    deck.cards.splice(deck.cards.indexOf(com), 1);
                });
                deck.commander = commander;
                console.log('compiled deck');
                let temp_sideboard = [];
                deck.cards.forEach((card) => {
                    if (card.count > 1) {
                        for (let i = 1; i < card.count; i++) {
                            temp_sideboard.push(card);
                        }
                    }
                });
                temp_sideboard.forEach((temp_card) => {
                    deck.cards.push(temp_card);
                });
                deck.cards.forEach((card) => {
                    card.count = 1;
                })
                return response.json(deck);
            })
        }
        else {
            console.log('deck returned null value');
            return response.json({});
        }
    });
}

app.get('/api/users', getUsers);

app.post('/api/cards', getCardInfo);
app.post('/api/cards/images', getCardImages);

app.get('/api/userdecks/basic/:id', fddpdb.getDecksForUserBasic);
app.get('/api/decks/basic', fddpdb.getAllDecksBasic);

app.post('/api/decks', fddpdb.createDeck);
app.get('/api/decks/:id', fddpdb.getDeck);
app.put('/api/decks/:id', fddpdb.updateDeck);
app.delete('/api/decks/:id', fddpdb.deleteDeck);

app.post('/api/custom_cards', fddpdb.createCustomCard);
app.get('/api/custom_cards', fddpdb.getCustomCards);
app.delete('/api/custom_cards/:id', deleteCustomCard)

app.get('/api/game/deck/:id', getDeckForPlay);

app.listen(port, () => {
    console.log(`App running on port ${port}.`);
});