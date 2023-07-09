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
        pool.query('INSERT INTO decks (name, owner, sleeves, image, link, rating, active, colors) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [deck.name, deck.owner, deck.sleeves, deck.image, deck.link, deck.rating, deck.active, JSON.stringify(deck.colors)],
            (error, results) => {
                if (error) {
                    console.log('deck creation failed');
                    console.log(error);
                    return response.json({errors: [error]});
                }
                let new_id = results.rows[0].id;
                if (new_id > -1) {
                    let card_promises = [];
                    for (let zone of ['cards', 'commanders', 'tokens', 'sideboard', 'companions', 'contraptions', 'attractions', 'stickers']) {
                        if (deck[zone] && deck[zone].length > 0) {
                            for (let card of deck[zone]) {
                                card_promises.push(
                                    new Promise((resolve_cards) => {
                                        pool.query('INSERT INTO deck_' + zone + ' (deckid, name, image, back_image) VALUES($1, $2, $3, $4) RETURNING *',
                                            [new_id, card.name, card.image, card.back_image],
                                            (err, res) => {
                                                if (err) {
                                                    console.log('Card create ' + zone + ' failed for ' + card.name + 'in deck with id: ' + new_id);
                                                    console.log(err);
                                                    deck_errors.push(err);
                                                }
                                                if (res.rows && res.rows.length > 0) {
                                                    let card_id = res.rows[0].id;
                                                    if (zone === 'cards') {
                                                        pool.query('UPDATE deck_cards SET count = $1, iscommander = $2 WHERE id = $3', [card.count, card.iscommander, card_id],
                                                            (e, r) => {
                                                                if (e) {
                                                                    console.log('Card creation update failed for ' + card.name + 'in deck with id: ' + new_id);
                                                                    deck_errors.push(e);
                                                                }
                                                                resolve_cards();
                                                            })
                                                    }
                                                    else if (zone === 'tokens') {
                                                        pool.query('UPDATE deck_tokens SET type_line = $1, oracle_text = $2, power = $3, toughness = $4, w = $5, u = $6, b = $7, r = $8, g = $9 WHERE id = $10',
                                                            [card.types.join(' '), card.oracle_text, card.power, card.toughness, card.colors.includes("W"), card.colors.includes("U"), card.colors.includes("B"),
                                                                card.colors.includes("R"), card.colors.includes("G"),  card_id],
                                                            (e, r) => {
                                                                if (e) {
                                                                    console.log('Token creation update failed for ' + card.name + 'in deck with id: ' + new_id);
                                                                    deck_errors.push(e);
                                                                }
                                                                resolve_cards();
                                                            })
                                                    }
                                                    else if (zone === 'sideboard') {
                                                        pool.query('UPDATE deck_sideboard SET count = $1 WHERE id = $2', [card.count, card_id],
                                                            (e, r) => {
                                                                if (e) {
                                                                    console.log('Card creation update failed for ' + card.name + 'in deck with id: ' + new_id);
                                                                    deck_errors.push(e);
                                                                }
                                                                resolve_cards();
                                                            })
                                                    }
                                                    else {
                                                        resolve_cards();
                                                    }
                                                }
                                            })
                                    }))
                            }
                        }
                    }
                    Promise.all(card_promises).then(() => {
                        console.log('deck created with id: ' + new_id);
                        return response.json({ id: new_id, errors: deck_errors });
                    });
                }
                else {
                    return response.json({id: -1});
                }
            });
    }
    else {
        console.log('request body incomplete for create deck');
        if (request.body) {
            console.log('missing deck in body');
        }
        return response.json({id: -1});
    }
}

let updateDeck = (request, response) => {
    const id = parseInt(request.params.id);
    let errors = [];
    if (request.body && request.body.deck) {
        const deck = request.body.deck;
        pool.query('UPDATE decks SET name = $1, owner = $2, sleeves = $3, image = $4, link = $5, rating = $6, active = $7, colors = $8, modified = now() WHERE id = $9',
            [deck.name, deck.owner, deck.sleeves, deck.image, deck.link, deck.rating, deck.active, JSON.stringify(deck.colors), id],
            (error, results) => {
                if (error) {
                    console.log('Deck update failed for deck with id: ' + id);
                    console.log(error);
                    return response.json({errors: [error]});
                }
                else {
                    let update_promises = [];
                    let insert_promises = [];
                    let delete_promises = [];
                    for (let option of ['cards', 'commanders', 'tokens', 'sideboard', 'companions', 'contraptions', 'attractions', 'stickers']) {
                        if (deck[option] && deck[option].length > 0) {
                            for (let card of deck[option]) {
                                if (card.id) {
                                    update_promises.push(
                                        new Promise((resolve_update) => {
                                            if (option === 'cards') {
                                                pool.query('UPDATE deck_cards SET name = $1, image = $2, back_image = $3, count = $4, iscommander = $5 WHERE id = $6',
                                                    [card.name, card.image, card.back_image, card.count, card.iscommander, card.id],
                                                    (err, res) => {
                                                        if (err) {
                                                            console.log('Card ' + option + ' update failed for card with id: ' + card.id + 'in deck with id: ' + id);
                                                            console.log(err);
                                                            errors.push(err);
                                                        }
                                                        resolve_update();
                                                    });
                                            }
                                            else if (option === 'commanders') {
                                                pool.query('UPDATE deck_commanders SET name = $1, image = $2, back_image = $3 WHERE id = $4',
                                                    [card.name, card.image, card.back_image, card.id],
                                                    (err, res) => {
                                                        if (err) {
                                                            console.log('Commander ' + option + ' update failed for card with id: ' + card.id + 'in deck with id: ' + id);
                                                            console.log(err);
                                                            errors.push(err);
                                                        }
                                                        resolve_update();
                                                    });
                                            }
                                            else if (option === 'tokens') {
                                                pool.query('UPDATE deck_tokens SET name = $1, image = $2 WHERE id = $3',
                                                    [card.name, card.image, card.id],
                                                    (err, res) => {
                                                        if (err) {
                                                            console.log('Token update failed for deck with id: ' + id);
                                                            console.log(err);
                                                            errors.push(err);
                                                        }
                                                        resolve_update();
                                                    });
                                            }
                                            else if (option === 'sideboard') {
                                                pool.query('UPDATE deck_sideboard SET name = $1, image = $2, back_image = $3, count = $4 WHERE id = $5',
                                                    [card.name, card.image, card.back_image, card.count, card.id],
                                                    (err, res) => {
                                                        if (err) {
                                                            console.log('Sideboard update failed for deck with id: ' + id);
                                                            console.log(err);
                                                            errors.push(err);
                                                        }
                                                        resolve_update();
                                                    });
                                            }
                                            else {
                                                pool.query('UPDATE deck_' + option + ' SET name = $1, image = $2, back_image = $3 WHERE id = $4',
                                                    [card.name, card.image, card.back_image, card.id],
                                                    (err, res) => {
                                                        if (err) {
                                                            console.log('Card update (' + option + ') with id: ' + card.id + ' failed for deck with id: ' + id);
                                                            console.log(err);
                                                            errors.push(err);
                                                        }
                                                        resolve_update();
                                                    });
                                            }
                                        }));
                                }
                                else {
                                    insert_promises.push(
                                        new Promise((resolve_insert) => {
                                            if (option === 'cards') {
                                                pool.query('INSERT INTO deck_cards (deckid, name, image, back_image, count, iscommander) VALUES($1, $2, $3, $4, $5, $6)',
                                                    [id, card.name, card.image, card.back_image, card.count, card.iscommander],
                                                    (err, res) => {
                                                        if (err) {
                                                            console.log('Card create failed for deck with id: ' + id);
                                                            console.log(err);
                                                            errors.push(err);
                                                        }
                                                        resolve_insert();
                                                    });
                                            }
                                            if (option === 'commanders') {
                                                pool.query('INSERT INTO deck_commanders (deckid, name, image, back_image) VALUES($1, $2, $3, $4)',
                                                    [id, card.name, card.image, card.back_image],
                                                    (err, res) => {
                                                        if (err) {
                                                            console.log('Commander create failed for deck with id: ' + id);
                                                            console.log(err);
                                                            errors.push(err);
                                                        }
                                                        resolve_insert();
                                                    });
                                            }
                                            else if (option === 'tokens') {
                                                pool.query('INSERT INTO deck_tokens (deckid, name, image, type_line, oracle_text, power, toughness, w, u, b, r, g) ' +
                                                    'VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
                                                    [id, card.name, card.image, card.types.join(' '), card.oracle_text, card.power, card.toughness,
                                                        (card.colors != null && card.colors.includes("W")), (card.colors != null && card.colors.includes("U")), (card.colors != null && card.colors.includes("B")),
                                                        (card.colors != null && card.colors.includes("R")), (card.colors != null && card.colors.includes("G"))],
                                                    (err, res) => {
                                                        if (err) {
                                                            console.log('Token create failed for deck with id: ' + id);
                                                            console.log(err);
                                                            errors.push(err);
                                                        }
                                                        resolve_insert();
                                                    });
                                            }
                                            else if (option === 'sideboard') {
                                                pool.query('INSERT INTO deck_sideboard (deckid, name, image, back_image, count) VALUES($1, $2, $3, $4, $5)',
                                                    [id, card.name, card.image, card.back_image, card.count],
                                                    (err, res) => {
                                                        if(err) {
                                                            console.log('Sideboard create failed for deck with id: ' + id);
                                                            console.log(err);
                                                            errors.push(err);
                                                        }
                                                        resolve_insert();
                                                    });
                                            }
                                            else {
                                                pool.query('INSERT INTO deck_' + option + '(deckid, name, image, back_image) VALUES($1, $2, $3, $4)',
                                                    [id, card.name, card.image, card.back_image],
                                                    (err, res) => {
                                                        if(err) {
                                                            console.log('Card create (' + option + ') failed for deck with id: ' + id);
                                                            console.log(err);
                                                            errors.push(err);
                                                        }
                                                        resolve_insert();
                                                    });
                                            }
                                        }));
                                }
                            }
                        }
                        if (deck['delete_' + option] && deck['delete_' + option].length > 0) {
                            for (let card of deck['delete_' + option]) {
                                if (card.id) {
                                    delete_promises.push(
                                        new Promise((resolve_delete) => {
                                            pool.query('DELETE FROM deck_' + option + ' WHERE id = $1', [card.id],
                                                (err, res) => {
                                                    if (err) {
                                                        console.log('Card ' + option + ' update (delete) failed for card with id: ' + card.id + 'in deck with id: ' + id);
                                                        console.log(err);
                                                        errors.push(err);
                                                    }
                                                    resolve_delete();
                                                })
                                        })
                                    )
                                }
                            }
                        }
                    }

                    Promise.all(update_promises).then(() => {
                        Promise.all(insert_promises).then(() => {
                            Promise.all(delete_promises).then(() => {
                                return response.json({errors});
                            })
                        })
                    })
                }
            });
    }
    else {
        return response.json(null);
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
                       deck.colors = JSON.parse(deck_data.colors)
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
                deck.colors = JSON.parse(deck.colors);
                pool.query('SELECT * FROM deck_cards WHERE deckid = $1', [id], (err, res) => {
                    if (err) {
                        console.log('Error getting cards for deck: ' + id);
                        console.log(err);
                        resolve({deck: deck, errors: [err]});
                    }
                    pool.query('SELECT * FROM deck_commanders WHERE deckid = $1', [id], (err2, res2) => {
                        if (err2) {
                            console.log('Error getting commanders for deck: ' + id);
                            console.log(err);
                            resolve({deck: deck, errors: [err]});
                        }
                        deck.cards = res.rows;
                        deck.commanders = res2.rows;
                        resolve({deck: deck});
                    })
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
                    deck.colors = JSON.parse(deck.colors);
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
                deck.colors = JSON.parse(deck.colors);


                let card_promises = [];
                for (let option of ['cards', 'commanders', 'sideboard', 'companions', 'contraptions', 'attractions', 'stickers']) {
                    card_promises.push( new Promise((resolve_card) => {
                        pool.query('SELECT * FROM deck_' + option + ' WHERE deckid = $1', [id], (err, res) => {
                            if (err) {
                                console.log('Error getting cards for deck: ' + id);
                                console.log(err);
                                resolve_card({deck: deck, errors: [err]});
                            }
                            deck[option] = res.rows;
                            deck[option].forEach((card) => {
                                let card_data = scryfalldb.getFormattedScryfallCard(card.name, {nontoken: true});

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
                            resolve_card();
                        })
                    }))
                }
                Promise.all(card_promises).then(() => {
                    pool.query('SELECT * FROM deck_tokens WHERE deckid = $1', [id], (er, re) => {
                        if (er) {
                            console.log('Error getting tokens for deck ' + id);
                            console.log(er);
                            resolve({deck: deck, errors: [er]});
                        }
                        deck.tokens = re.rows;
                        deck.tokens.forEach((token) => {
                            token.types = token.type_line != null?  token.type_line.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(element => element): [];
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
                })
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
        deck.play_stickers = [];
        if (deck.stickers.length < 10) {
            let stickers = scryfalldb.getStickers({legal: true});
            for (let sticker of deck.stickers) {
                for (let i = 0; i < stickers.length; i++) {
                    if (stickers[i].name === sticker.name) {
                        stickers.splice(i, 1);
                        i--;
                    }
                }
            }
            for (let i = 0; i < deck.stickers.length; i++) {
                deck.play_stickers.push(deck.stickers[i]);
            }
            for (let i = deck.stickers.length; i < 10; i++) {
                let ind = Math.floor(Math.random() * stickers.length);
                let stick = stickers[ind];
                deck.play_stickers.push(stick);
                for (let j = 0; j < stickers.length; j++) {
                    if (stickers[j].name === stick.name) {
                        stickers.splice(j, 1);
                        j--;
                    }
                }
            }
        }
        let out_stickers = [];
        for (let i = 0; i < 3; i++) {
            let ind = Math.floor(Math.random() * deck.play_stickers.length);
            out_stickers.push(deck.play_stickers[ind]);
            deck.play_stickers.splice(ind, 1);
        }
        deck.play_stickers = out_stickers;

        deck.play_attractions = [];
        if (deck.attractions.length < 10) {
            let attractions = scryfalldb.getAttractions({legal: true});
            for (let attraction of deck.attractions) {
                for (let i = 0; i < attractions.length; i++) {
                    if (attractions[i].name === attraction.name) {
                        attractions.splice(i, 1);
                        i--;
                    }
                }
            }
            for (let i = 0; i < deck.attractions.length; i++) {
                deck.play_attractions.push(deck.attractions[i]);
            }
            for (let i = deck.attractions.length; i < 10; i++) {
                let ind = Math.floor(Math.random() * attractions.length);
                let attr = attractions[ind];
                deck.play_attractions.push(attr);
                for (let j = 0; j < attractions.length; j++) {
                    if (attractions[j].name === attr.name) {
                        attractions.splice(j, 1);
                        j--;
                    }
                }
            }
        }
        deck.play_contraptions = [];
        if (deck.contraptions.length < 15) {
            let contraptions = scryfalldb.getContraptions();
            for (let contraption of deck.contraptions) {
                for (let i = 0; i < contraptions.length; i++) {
                    if (contraptions[i].name === contraption.name) {
                        contraptions.splice(i, 1);
                        i--;
                    }
                }
            }
            for (let i = 0; i < deck.contraptions.length; i++) {
                deck.play_contraptions.push(deck.contraptions[i]);
            }
            for (let i = deck.contraptions.length; i < 15; i++) {
                let ind = Math.floor(Math.random() * contraptions.length);
                let contr = contraptions[ind];
                deck.play_contraptions.push(contr);
                for (let j = 0; j < contraptions.length; j++) {
                    if (contraptions[j].name === contr.name) {
                        contraptions.splice(j, 1);
                        j--;
                    }
                }
            }
        }
        return response.json(deck);
    });
}

function grabLastPlayed(deck_id) {
    return new Promise((resolve) => {
        pool.query('SELECT game_id FROM game_results WHERE deck_id = ' + deck_id + ' ORDER BY game_id DESC',
            (err, res) => {
                if (err) {
                    console.log('Error getting games for deck: ' + deck_data.id);
                    console.log(err);
                    resolve(null);
                }
                else {
                    let games = res.rows;
                    let last_played = null;
                    let game_promises = [];
                    for (let game of games) {
                        game_promises.push(new Promise((resolve_game) => {
                            pool.query('SELECT * FROM games WHERE id = ' + game.game_id,
                                (e, r) => {
                                    if (e) {
                                        console.log('Error getting games with id: ' + game.game_id);
                                        console.log(err);
                                    }
                                    else {
                                        if (r.rows && r.rows.length === 1) {
                                            let game_data = r.rows[0];
                                            if (game_data.started != null && !game_data.test) {
                                                if (last_played == null || last_played < game_data.started) {
                                                    last_played = game_data.started;
                                                }
                                            }
                                        }
                                    }
                                    resolve_game();
                                });
                        }));
                    }
                    Promise.all(game_promises).then(() => {
                        resolve(last_played);
                    });
                }
            });
    });
}

function grabDeckBasic(deck_data) {
    return new Promise((resolve) => {
        pool.query('SELECT * FROM deck_commanders WHERE deckid = $1', [deck_data.id],
            (err, res) => {
                if (err) {
                    console.log('Error getting cards for deck: ' + deck_data.id);
                    console.log(err);
                    errors.push(err);
                    deck_data.commanders = [];
                } else {
                    deck_data.commanders = res.rows;
                    for (let card of deck_data.commanders) {
                        let scryfall_card = scryfalldb.getFormattedScryfallCard(card.name);
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
                                deck_data.colors = JSON.parse(deck_data.colors);
                                grabLastPlayed(deck_data.id).then((lp) => {
                                    deck_data.last_played = lp;
                                    decks.push(deck_data);
                                    resolve();
                                });
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

let getLastPlayed = (request, response) => {
    if (request.params.id) {
        let deck_id = parseInt(request.params.id);
        grabLastPlayed(deck_id).then((lp) => {
            return response.json({last_played: lp});
        });
    }
    else {
        return response.json({last_played: null});
    }
}

module.exports = {
    createDeck,
    updateDeck,
    deleteDeck,
    getDecksForUser,
    getDeck,
    grabDecks,
    getDeckList,
    getThemesForDeck,
    updateDeckThemes,
    getDeckForPlay,
    grabDeckForPlay,
    getDecksBasic,
    getLastPlayed
}