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
    console.log('getting ' + card_name);
    let out_card = {};
    out_card.name = card_name;
    out_card.images = [];
    for (let card of scryfalldata) {
        if (card.name === card_name) {
            console.log(card);
            out_card.mana_cost = card.mana_cost;
            out_card.types = card.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element);
            out_card.oracle_text = card.oracle_text;
            out_card.power = card.power ? card.power: null;
            out_card.toughness = card.toughness ? card.toughness: null;
            out_card.loyalty = card.loyalty ? card.loyalty: null;
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
            return response.json(out_card);
        }
    }
    return response.json({message: 'card not found'});
}

getCardImages = (request, response) => {
    const card_name = request.body.name;
    console.log('Getting images for: ' + card_name);
    let out_card = {};
    out_card.name = card_name;
    out_card.images = [];
    for (let card of scryfalldata) {
        if (card.name === card_name) {
            if (card.image_uris && card.image_uris.png) {
                out_card.images.push(card.image_uris.png);
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
            });
            return response.json(out_card);
        }
    })

}

app.post('/api/cards', getCardInfo);
app.post('/api/cards/images', getCardImages);

app.post('/api/decks', fddpdb.createDeck);
app.get('/api/decks/:id', fddpdb.getDeck);

app.post('/api/custom_cards', fddpdb.createCustomCard);
app.get('/api/custom_cards', fddpdb.getCustomCards);

app.listen(port, () => {
    console.log(`App running on port ${port}.`);
});