const config = require("../config/db.config.js");
const {request, response} = require("express");
const Pool = require('pg').Pool
const pool = new Pool({
    user: config.USER,
    host: config.HOST,
    database: config.DB,
    password: config.PASSWORD,
    port: 5432,
});

exports.createDeck = (request, response) => {
    console.log('attempting to create deck');
    if (request.body && request.body.deck) {
        console.log('creating deck');
        const deck = request.body.deck;
        let deck_errors = [];
        pool.query('INSERT INTO decks (name, owner, sleeves, image, link, rating) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [deck.name, deck.owner, deck.sleeves, deck.image, deck.link, deck.rating],
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

exports.updateDeck = (request, response) => {
    const id = parseInt(request.params.id);
    let errors = [];
    if (request.body && request.body.deck) {
        const deck = request.body.deck;
        pool.query('UPDATE decks SET name = $1, owner = $2, sleeves = $3, image = $4, link = $5, rating = $6 WHERE id = $7',
            [deck.name, deck.owner, deck.sleeves, deck.image, deck.link, deck.rating, id],
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

exports.deleteDeck = (request, response) => {
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

exports.getDecksForUser = (request, response) => {
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

exports.getAllDecksBasic = (request, response) => {
    let errors = [];
    pool.query('SELECT * FROM decks',
        (error, results) => {
            if (error) {
                console.log('Error getting all decks');
                console.log(error);
                return response.json({decks: [], errors: [error]});
            }
            else {
                if (results.rows && results.rows.length > 0) {
                    return response.json({decks: results.rows, errors: errors});
                }
                else {
                    return response.json({decks: [], errors: []});
                }
            }
        });
}

exports.getDeck = (request, response) => {
    const id = parseInt(request.params.id);

    pool.query('SELECT * FROM decks where id = $1', [id], (error, results) => {
        if (error) {
            console.log('Error getting deck: ' + id);
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
                return response.json({deck: deck});
            })
        }
    })
}

exports.getDeckList = (request, response) => {
    pool.query('SELECT * FROM decks', (error, results) => {
        if (error) {
            console.log('Error getting deck list');
            console.log(error);
            return response.json({errors: [error]});
        }
        else {
            return response.json({deck_list: results.rows});
        }
    })
}
