const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');

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
            out_card.types = card.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ');
            out_card.oracle_text = card.oracle_text;
            out_card.power = card.power ? card.power: null;
            out_card.toughness = card.toughness ? card.toughness: null;
            out_card.collector_number = card.collector_number;
            return response.json(out_card);
        }
    }
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
    return response.json(out_card);
}

app.post('/api/cards', getCardInfo);
app.post('/api/cards/images', getCardImages);

app.post('/api/decks', fddpdb.createDeck);
app.get('/api/decks/:id', fddpdb.getDeck);

app.post('/api/custom_cards', fddpdb.createCustomCard);

app.listen(port, () => {
    console.log(`App running on port ${port}.`);
});