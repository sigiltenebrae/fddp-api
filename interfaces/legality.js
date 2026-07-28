import * as scryfalldb from './scryfall.js';
import * as deckdb from './decks.js';
import * as banlistdb from './ban_list.js';

import "dotenv/config.js";
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({
    "host":     process.env.POSTGRES_HOST,
    "database": process.env.POSTGRES_DB,
    "user":     process.env.POSTGRES_USER,
    "password": process.env.POSTGRES_PASSWORD,
    "port":     5432,
});

export function getLegality(request, response) {
    const id = parseInt(request.params.id);
    console.log('updating legality for deck: ' + id);
    updateLegality(id).then((legality) => {
        return response.json(legality);
    });
}

export function getAllLegalities(request, response) {
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

export function updateAllLegalities() {
    return new Promise((resolve) => {
        process.stdout.write('updating deck legalities');
        deckdb.grabDecks().then((decks_obj) => {
            if (decks_obj.deck_list) {
                let deck_count = decks_obj.deck_list.length;
                let complete_decks = 0;
                let legality_promises = [];
                for (let deck of decks_obj.deck_list) {
                    legality_promises.push(
                        new Promise((resolve) => {
                            (updateLegality(deck.id)).then(() => {
                                complete_decks++;
                                console.log(Math.floor((complete_decks/deck_count) * 100) + '% complete');
                                resolve();
                            });
                        })
                    )
                }
                Promise.all(legality_promises).then(() => {
                    console.log('deck legalities updated')
                    resolve();
                });
            }
        });
    });
}
