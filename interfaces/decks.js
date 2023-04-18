const config = require("../config/db.config.js");
const scryfalldb = require('./scryfall');
const Pool = require('pg').Pool
const pool = new Pool({
    user: config.USER,
    host: config.HOST,
    database: config.DB,
    password: config.PASSWORD,
    port: 5432,
});

let createDeck = (request, response) => {
    console.log('attempting to create deck');
    if (request.body && request.body.deck) {
        console.log('creating deck');
        const deck = request.body.deck;
        let deck_errors = [];
        pool.query('INSERT INTO decks (name, owner, sleeves, image, link, rating, active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [deck.name, deck.owner, deck.sleeves, deck.image, deck.link, deck.rating, deck.active],
            (error, results) => {
                if (error) {
                    console.log('deck creation failed');
                    console.log(error);
                    return response.json({errors: [error]});
                }
                let new_id = results.rows[0].id;
                if (new_id > -1) {
                    if (deck.cards && deck.cards.length > 0) {
                        for (let card of deck.cards) {
                            if (!card.back_image) {card.back_image = null}
                            //console.log('inserting card: ' + JSON.stringify(card));
                            pool.query('INSERT INTO deck_cards (deckid, name, image, back_image, count, iscommander) VALUES($1, $2, $3, $4, $5, $6)',
                                [new_id, card.name, card.image, card.back_image, card.count, card.iscommander],
                                (err, res) => {
                                    if (err) {
                                        console.log('Card create failed for deck with id: ' + new_id);
                                        console.log(err);
                                        deck_errors.push(err);
                                    }
                                });
                        }
                        for (let token of deck.tokens) {
                            pool.query('INSERT INTO deck_tokens (deckid, name, image, type_line, oracle_text, power, toughness, w, u, b, r, g) ' +
                                'VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
                                [new_id, token.name, token.image, token.types.join(' '), token.oracle_text, token.power, token.toughness,
                                    token.colors.includes("W"), token.colors.includes("U"), token.colors.includes("B"),
                                    token.colors.includes("R"), token.colors.includes("G")],
                                (err, res) => {
                                    if (err) {
                                        console.log('Token create failed for deck with id: ' + new_id);
                                        console.log(err);
                                        deck_errors.push(err);
                                    }
                                });
                        }
                        console.log('deck created with id: ' + new_id);
                        return response.json({ id: new_id, errors: deck_errors });
                    }
                }
            });
    }
    else {
        console.log('request body incomplete for create deck');
        if (request.body) {
            console.log('missing deck in body');
        }
    }
}

let updateDeck = (request, response) => {
    const id = parseInt(request.params.id);
    let errors = [];
    if (request.body && request.body.deck) {
        const deck = request.body.deck;
        pool.query('UPDATE decks SET name = $1, owner = $2, sleeves = $3, image = $4, link = $5, rating = $6, active = $7, modified = now() WHERE id = $8',
            [deck.name, deck.owner, deck.sleeves, deck.image, deck.link, deck.rating, deck.active, id],
            (error, results) => {
                if (error) {
                    console.log('Deck update failed for deck with id: ' + id);
                    console.log(error);
                    return response.json({errors: [error]});
                }
                else {
                    if (deck.cards && deck.cards.length > 0) {
                        for (let card of deck.cards) {
                            if (card.id) {
                                if (!card.back_image) { card.back_image = null }
                                pool.query('UPDATE deck_cards SET name = $1, image = $2, back_image = $3, count = $4, iscommander = $5 WHERE id = $6',
                                    [card.name, card.image, card.back_image, card.count, card.iscommander, card.id],
                                    (err, res) => {
                                        if (err) {
                                            console.log('Card update failed for card with id: ' + card.id + 'in deck with id: ' + id);
                                            console.log(err);
                                            errors.push(err);
                                        }
                                    });
                            }
                            else {
                                pool.query('INSERT INTO deck_cards (deckid, name, image, count, iscommander) VALUES($1, $2, $3, $4, $5)',
                                    [id, card.name, card.image, card.count, card.iscommander],
                                    (err, res) => {
                                        if (err) {
                                            console.log('Card create failed for deck with id: ' + id);
                                            console.log(err);
                                            errors.push(err);
                                        }
                                    });
                            }
                        }
                        for (let token of deck.tokens) {
                            if (token.id) {
                                pool.query('UPDATE deck_tokens SET name = $1, image = $2 WHERE id = $3',
                                    [token.name, token.image, token.id],
                                    (err, res) => {
                                        if (err) {
                                            console.log('Token update failed for deck with id: ' + id);
                                            console.log(err);
                                            errors.push(err);
                                        }
                                    });
                            }
                            else {
                                pool.query('INSERT INTO deck_tokens (deckid, name, image, type_line, oracle_text, power, toughness, w, u, b, r, g) ' +
                                    'VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
                                    [id, token.name, token.image, token.types.join(' '), token.oracle_text, token.power, token.toughness,
                                        token.colors.includes("W"), token.colors.includes("U"), token.colors.includes("B"),
                                        token.colors.includes("R"), token.colors.includes("G")],
                                    (err, res) => {
                                        if (err) {
                                            console.log('Token create failed for deck with id: ' + id);
                                            console.log(err);
                                            errors.push(err);
                                        }
                                    });
                            }
                        }
                        if (deck.delete && deck.delete.length > 0) {
                            for (let card of deck.delete) {
                                if (card.id) {
                                    pool.query('DELETE FROM deck_cards WHERE id = $1', [card.id],
                                        (err, res) => {
                                            if (err) {
                                                console.log('Delete failed for card with id: ' + card.id + ' in deck with id: ' + id);
                                                console.log(err);
                                                errors.push(err);
                                            }
                                        });
                                }
                            }
                        }
                        if (deck.token_delete && deck.token_delete.length > 0) {
                            for (let token of deck.token_delete) {
                                if (token.id) {
                                    pool.query('DELETE FROM deck_tokens WHERE id = $1', [token.id],
                                        (err, res) => {
                                            if (err) {
                                                console.log('Delete failed for token with id ' + token.id + ' in deck with id: ' + id);
                                                console.log(err);
                                                errors.push(err);
                                            }
                                        });
                                }
                            }
                        }
                        return response.json({errors});
                    }
                }

            });

    }
}

let deleteDeck = (request, response) => {
    const id = parseInt(request.params.id);
    pool.query('DELETE FROM decks WHERE id = $1', [id],
        (error, results) => {
            if (error) {
                console.log('Error deleting deck with id: ' + id);
                return response.json({errors: [error]})
            }
            else {
                return response.json({message: 'Deleted deck with id: ' + id});
            }
        });
}

let getDecksForUser = (request, response) => {
    const userid = parseInt(request.params.id);
    let errors = [];
    pool.query('SELECT * FROM decks WHERE owner = $1', [userid],
        (error, results) => {
            if (error) {
                console.log('Error getting decks for user: ' + userid);
                console.log(error);
                return response.json({decks: [], errors: [error]});
            }
            else {
                if (results.rows && results.rows.length > 0) {
                   let decks = [];
                   for (let deck_data of results.rows) {
                       let deck = deck_data;
                       deck.legality = JSON.parse(deck_data.legality);
                       pool.query('SELECT * FROM deck_cards WHERE deckid = $1', [deck.id],
                           (err, res) => {
                               if (err) {
                                   console.log('Error getting cards for deck: ' + id);
                                   console.log(err);
                                   errors.push(err);
                                   deck.cards = [];
                                   decks.push(deck);
                               }
                               else {
                                   deck.cards = res.rows;
                                   decks.push(deck);
                               }
                           });
                   }
                   return response.json({decks: decks, errors: errors});
                }
                else {
                    return response.json({decks: [], errors: []});
                }
            }
        })
}

let getDeck = (request, response) => {
    const id = parseInt(request.params.id);
    grabDeck(id).then((deck) => {
        return response.json(deck);
    });
}

function grabDeck(id) {
    return new Promise((resolve) => {
        console.log('get deck')
        console.log(id);
        pool.query('SELECT * FROM decks where id=' + id , (error, results) => {
            if (error) {
                console.log('Error getting deck: ' + id);
                console.log(error);
                resolve({errors: [error]});
            }
            if (results.rows.length > 0) {
                let deck = results.rows[0];
                deck.legality = JSON.parse(deck.legality);
                pool.query('SELECT * FROM deck_cards WHERE deckid = $1', [id], (err, res) => {
                    if (err) {
                        console.log('Error getting cards for deck: ' + id);
                        console.log(err);
                        resolve({deck: deck, errors: [err]});
                    }
                    deck.cards = res.rows;
                    resolve({deck: deck});
                })
            }
        })
    })
}

function grabDecks() {
    return new Promise((resolve) => {
        pool.query('SELECT * FROM decks', (error, results) => {
            if (error) {
                console.log('Error getting deck list');
                console.log(error);
                resolve({errors: [error]});
            }
            else {
                let deck_list = results.rows;
                deck_list.forEach((deck) => {
                    deck.legality = JSON.parse(deck.legality);
                })
                resolve({deck_list: deck_list});
            }
        })
    })
}

let getDeckList = (request, response) => {
    grabDecks().then((decks) => {
        return response.json(decks);
    })
}

let getThemesForDeck = (request, response) => {
    if (request.body && request.body.deck_id) {
        const deck_id = request.body.deck_id;
        pool.query('SELECT * FROM deck_themes WHERE deck_id = $1', [deck_id], (theme_err, theme_res) => {
            let deck_themes = [];
            if (theme_err) {
                console.log('error fetching themes for deck: ' + deck_id);
                console.log(theme_err);
                return response.json({themes: deck_themes, tribes: []});
            }
            else {
                deck_themes = theme_res.rows;
                pool.query('SELECT * FROM deck_tribes WHERE deck_id = $1', [deck_id], (tribe_err, tribe_res) => {
                    let deck_tribes = [];
                    if (tribe_err) {
                        console.log('error fetching tribes for deck: ' + deck_id);
                        console.log(theme_err);
                    }
                    else {
                        deck_tribes = tribe_res.rows;
                    }
                    return response.json({themes: deck_themes, tribes: deck_tribes});
                });
            }
        });
    }
}

function themeInList(theme, list) {
    for (let item of list) {
        if (item.theme_id === theme.theme_id) {
            return true;
        }
    }
    return false;
}

function tribeInList(theme, list) {
    for (let item of list) {
        if (item.tribe_id === theme.tribe_id) {
            return true;
        }
    }
    return false;
}

let updateDeckThemes = (request, response) => {
    if (request.body && request.body.themes && request.body.tribes) {
        const deck_id = parseInt(request.params.id);
        const new_themes = request.body.themes;
        const new_tribes = request.body.tribes;
        pool.query('SELECT * FROM deck_themes WHERE deck_id = $1', [deck_id], (theme_err, theme_res) => {
            let deck_themes = [];
            if (theme_err) {
                console.log('error fetching themes for deck: ' + deck_id);
                console.log(theme_err);
                return response.json({errors: theme_err});
            }
            else {
                deck_themes = theme_res.rows;
                pool.query('SELECT * FROM deck_tribes WHERE deck_id = $1', [deck_id], (tribe_err, tribe_res) => {
                    let deck_tribes = [];
                    if (tribe_err) {
                        console.log('error fetching tribes for deck: ' + deck_id);
                        console.log(theme_err);
                        return response.json({errors: tribe_err});
                    }
                    else {
                        deck_tribes = tribe_res.rows
                        let theme_promises = [];
                        let tribe_promises = [];
                        for(let theme of new_themes) {
                            if (!themeInList(theme, deck_themes)) {
                                theme_promises.push(new Promise((resolve_theme) => {
                                    pool.query('INSERT INTO deck_themes (deck_id, theme_id) VALUES ($1, $2)', [deck_id, theme.theme_id],
                                        (theme_err, theme_res) => {
                                            if (theme_err) {
                                                console.log(theme_err);
                                            }
                                            resolve_theme();
                                        });
                                }));
                            }
                        }
                        for (let theme of deck_themes) {
                            if (!themeInList(theme, new_themes)) {
                                theme_promises.push(new Promise((resolve_theme) => {
                                    pool.query('DELETE FROM deck_themes WHERE deck_id = $1 AND theme_id = $2', [deck_id, theme.theme_id],
                                        (theme_err, theme_res) => {
                                            if(theme_err) {
                                                console.log(theme_err);
                                            }
                                            resolve_theme();
                                        });
                                }));
                            }
                        }
                        for(let tribe of new_tribes) {
                            if (!tribeInList(tribe, deck_tribes)) {
                                tribe_promises.push(new Promise((resolve_tribe) => {
                                    pool.query('INSERT INTO deck_tribes (deck_id, tribe_id) VALUES ($1, $2)', [deck_id, tribe.tribe_id],
                                        (tribe_err, tribe_res) => {
                                            if (tribe_err) {
                                                console.log(tribe_err);
                                            }
                                            resolve_tribe();
                                        });
                                }));
                            }
                        }
                        for (let tribe of deck_tribes) {
                            if (!tribeInList(tribe, new_tribes)) {
                                tribe_promises.push(new Promise((resolve_tribe) => {
                                    pool.query('DELETE FROM deck_tribes WHERE deck_id = $1 AND tribe_id = $2', [deck_id, tribe.tribe_id],
                                        (tribe_err, tribe_res) => {
                                            if (tribe_err) {
                                                console.log(tribe_err);
                                            }
                                            resolve_tribe();
                                        });
                                }));
                            }
                        }
                        Promise.all(theme_promises).then(() => {
                            Promise.all(tribe_promises).then(() => {
                                return response.json({message: 'themes updated successfully'});
                            })
                        })

                    }
                });
            }
        });
    }
}

function grabDeckForPlay(id) {
    return new Promise((resolve) => {
        pool.query('SELECT * FROM decks where id = $1', [id], (error, results) => {
            if (error) {
                console.log('Error getting deck for play: ');
                console.log(error);
                resolve({errors: [error]});
            }
            if (results.rows.length > 0) {
                let deck = results.rows[0];
                deck.legality = JSON.parse(deck.legality);
                pool.query('SELECT * FROM deck_cards WHERE deckid = $1', [id], (err, res) => {
                    if (err) {
                        console.log('Error getting cards for deck: ' + id);
                        console.log(err);
                        resolve({deck: deck, errors: [err]});
                    }
                    deck.cards = res.rows;
                    deck.cards.forEach((card) => {
                        let card_data = scryfalldb.getFormattedScryfallCard(card.name);

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
                        card.defense = card_data.defense != null ? Number(card_data.defense): null;
                        card.back_defense = card_data.back_defense != null ? Number(card_data.back_defense): null;
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
                            resolve({deck: deck, errors: [er]});
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
                        pool.query('SELECT * FROM deck_themes WHERE deck_id = $1', [id], (theme_err, theme_res) => {
                            let deck_themes = [];
                            if (theme_err) {
                                console.log('error fetching themes for deck: ' + id);
                                console.log(theme_err);
                                deck.themes = [];
                                deck.tribes = [];
                                resolve(deck);
                            }
                            else {
                                deck_themes = theme_res.rows;
                                pool.query('SELECT * FROM deck_tribes WHERE deck_id = $1', [id], (tribe_err, tribe_res) => {
                                    let deck_tribes = [];
                                    if (tribe_err) {
                                        console.log('error fetching tribes for deck: ' + id);
                                        console.log(theme_err);
                                    }
                                    else {
                                        deck_tribes = tribe_res.rows;
                                    }
                                    deck.themes = deck_themes;
                                    deck.tribes = deck_tribes;
                                    resolve(deck);
                                });
                            }
                        });

                    });
                });
            }
            else {
                console.log('deck returned null value');
                return resolve({});
            }
        });
    })
}

let getDeckForPlay = (request, response) => {
    const id = parseInt(request.params.id);
    grabDeckForPlay(id).then((deck) => {
        let stickers = scryfalldb.getStickers();
        deck.stickers = [];
        for (let i = 0; i < 3; i++) {
            let ind = Math.floor(Math.random() * stickers.length);
            deck.stickers.push(stickers[ind]);
            stickers.splice(ind, 1);
        }
        return response.json(deck);
    })
}

function grabDeckBasic(deck_data) {
    return new Promise((resolve) => {
        pool.query('SELECT * FROM deck_cards WHERE deckid = $1 AND iscommander', [deck_data.id],
            (err, res) => {
                if (err) {
                    console.log('Error getting cards for deck: ' + deck_data.id);
                    console.log(err);
                    errors.push(err);
                    deck_data.commander = [];
                    deck_data.colors = [];
                } else {
                    deck_data.commander = res.rows;
                    deck_data.colors = [];
                    for (let card of deck_data.commander) {
                        let scryfall_card = scryfalldb.getFormattedScryfallCard(card.name);
                        for (let mana of scryfall_card.color_identity) {
                            if (mana === 'W' || mana === 'U' || mana === 'B' || mana === 'R' || mana === 'G') {
                                deck_data.colors.push(mana);
                            }
                        }
                    }
                }

                pool.query('SELECT * FROM game_results WHERE deck_id = $1', [deck_data.id],
                    (e, r) => {
                        deck_data.wins = 0;
                        deck_data.losses = 0;
                        if (e) {
                            console.log('Error getting game results for deck: ' + deck_data.id);
                            console.log(err);
                            resolve();
                        }
                        else {
                            if (r.rows.length > 0) {
                                for (let result of r.rows) {
                                    if (result.winner != null) {
                                        if (result.winner) {
                                            deck_data.wins ++;
                                        }
                                        else {
                                            deck_data.losses ++;
                                        }
                                    }
                                }
                            }
                            pool.query('SELECT * FROM deck_themes WHERE deck_id = $1', [deck_data.id], (theme_err, theme_res) => {
                                let deck_themes = [];
                                if (theme_err) {
                                    console.log('error fetching themes for deck: ' + deck_data.id);
                                    console.log(theme_err);
                                    deck_data.themes = [];
                                    deck_data.tribes = [];
                                    resolve();
                                }
                                else {
                                    deck_themes = theme_res.rows;
                                    pool.query('SELECT * FROM deck_tribes WHERE deck_id = $1', [deck_data.id], (tribe_err, tribe_res) => {
                                        let deck_tribes = [];
                                        if (tribe_err) {
                                            console.log('error fetching tribes for deck: ' + deck_data.id);
                                            console.log(theme_err);
                                        }
                                        else {
                                            deck_tribes = tribe_res.rows;
                                        }
                                        deck_data.themes = deck_themes;
                                        deck_data.tribes = deck_tribes;
                                        resolve();
                                    });
                                }
                            });
                        }
                    });
            });
    })
}

let getDecksBasic = (request, response) => {
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
                            grabDeckBasic(deck_data).then(() => {
                                deck_data.legality = JSON.parse(deck_data.legality);
                                decks.push(deck_data);
                                resolve();
                            })
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

module.exports = {
    createDeck,
    updateDeck,
    deleteDeck,
    getDecksForUser,
    getDeck,
    grabDeck,
    grabDecks,
    getDeckList,
    getThemesForDeck,
    updateDeckThemes,
    getDeckForPlay,
    grabDeckForPlay,
    getDecksBasic,
}