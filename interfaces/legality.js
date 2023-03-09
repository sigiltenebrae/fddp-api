const scryfalldb = require('./scryfall');
const deckdb = require('./decks');
const banlistdb = require('./ban_list');

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

let getLegality = (request, response) => {
    const id = parseInt(request.params.id);
    console.log('updating legality for deck: ' + id);
    updateLegality(id).then((legality) => {
        return response.json(legality);
    });
}

let getAllLegalities = (request, response) => {
    updateAllLegalities().then(() => {
        return response.json({message: 'all legalities checked'});
    })
}

function checkLegality(id) {
    return new Promise((resolve) => {
        let legality = null;
        deckdb.grabDeckForPlay(id).then((deck) => {
            if (deck.cards != null && deck.cards.length > 0) {
                legality = [];
                banlistdb.grabBanList().then((bans) => {
                    banlistdb.grabBanTypes().then((btypes) => {
                        let banlist = [[], [], [], []];
                        let bantypes = {};
                        for (let type of btypes) {
                            bantypes[type.type] = type.id;
                        }
                        bans.forEach((card) => {
                            banlist[card.ban_type - 1].push(card);
                        });
                        deck.cards.forEach((card) => {
                            for (let banned_card of banlist[bantypes["banned"] - 1]) {
                                if (card.name === banned_card.name) {
                                    legality.push({name: card.name, gatherer: card.gatherer, reason: 'On Ban List'});
                                    break;
                                }
                            }
                            if (!card.legality || card.cheapest > 25) { //it is banned in commander
                                let card_allowed = false;
                                if (card.iscommander) {
                                    for (let unbanned_commander of banlist[bantypes["allowed as commander"] - 1]) {
                                        if (card.name === unbanned_commander.name) {
                                            card_allowed = true;
                                            break;
                                        }
                                    }
                                }
                                if (!card_allowed) {
                                    for (let unbanned_card of banlist[bantypes["unbanned"] - 1]) {
                                        if (card.name === unbanned_card.name) {
                                            card_allowed = true;
                                            break;
                                        }
                                    }
                                }
                                if (!card_allowed) {
                                    const inArray = legality.some(element => {
                                        return element.name === card.name;
                                    });
                                    if (!inArray) {
                                        legality.push({name: card.name, gatherer: card.gatherer,
                                            reason: card.cheapest > 25 ? 'Price: ' + card.cheapest: 'Banned in Commander'});
                                    }
                                }
                            }
                        });
                        resolve(legality);
                    });
                });
            }
            else {
                console.log('deck grab failed for legality check');
                resolve(legality);
            }
        });
    });
}

function updateLegality(id) {
    return new Promise((resolve) => {
        checkLegality(id).then((legality) => {
            pool.query('UPDATE decks SET legality = $1 WHERE id = $2', [JSON.stringify(legality), id], (error, results) => {
                if (error) {
                    console.log('error updating legality in db for deck with id: ' + id);
                }
                resolve(legality);
            });
        });
    });
}

function updateAllLegalities() {
    return new Promise((resolve) => {
        console.log('updating deck legalities');
        deckdb.grabDecks().then((decks_obj) => {
            if (decks_obj.deck_list) {
                let legality_promises = [];
                for (let deck of decks_obj.deck_list) {
                    legality_promises.push(updateLegality(deck.id));
                }
                Promise.all(legality_promises).then(() => {
                    console.log('deck legalities updated')
                    resolve();
                });
            }
        });
    });
}

module.exports = {
    getLegality,
    getAllLegalities,
    updateAllLegalities
}
