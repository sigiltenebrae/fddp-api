const config = require("../config/db.config.js");
const {request} = require("express");
const Pool = require('pg').Pool
const pool = new Pool({
    user: config.USER,
    host: config.HOST,
    database: config.DB,
    password: config.PASSWORD,
    port: 5432,
});

exports.getUsers = (request, response) => {
    pool.query('SELECT * FROM users', (error, results) => {
        if (error) {
            console.log('Error getting users');
            console.log(error);
            return response.json({errors: [error]});
        }
        return response.json(results.rows);
    });
}

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
                            //console.log('inserting card: ' + JSON.stringify(card));
                            pool.query('INSERT INTO deck_cards (deckid, name, image, count, iscommander) VALUES($1, $2, $3, $4, $5)',
                                [new_id, card.name, card.image, card.count, card.iscommander],
                                (err, res) => {
                                    if (err) {
                                        console.log('Card create failed for deck with id: ' + new_id);
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
                                pool.query('UPDATE deck_cards SET name = $1, image = $2, count = $3, iscommander = $4 WHERE id = $5',
                                    [card.name, card.image, card.count, card.iscommander, card.id],
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
                        if (deck.delete && deck.delete.length > 0) {
                            for (let card of deck.delete) {
                                pool.query('DELETE FROM deck_cards WHERE id = $1', [card.id],
                                    (err, res) => {
                                        if (err) {
                                            console.log('Delete failed for card with id: ' + card.id + 'in deck with id: ' + id);
                                            console.log(err);
                                            errors.push(err);
                                        }
                                    });
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

exports.getDeck = (request, response) => {
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
                return response.json({deck: deck});
            })
        }
    })
}

exports.createCustomCard = (request, response) => {
    if (request.body && request.body.image && request.body.name) {
        const image = request.body.image;
        const name = request.body.name;
        pool.query('INSERT INTO custom_cards (name, image) VALUES($1, $2)',
            [name, image],
            (error, results) => {
                if (error) {
                    console.log('custom card creation failed');
                    console.log(error);
                    return response.json({errors: [error]});
                }
                console.log('custom card created successfully');
                return response.json({message: 'custom card created successfully'});
            });
    }
    else {
        console.log('request body incomplete for create custom card');
        if (request.body) {
            console.log('missing image or name in body');
        }
    }
}

exports.getCustomCards = (request, response) => {
    pool.query('SELECT * FROM custom_cards', (error, results) => {
        if (error) {
            console.log('Error getting custom cards');
            console.log(error);
            return response.json({errors: [error]});
        }
        return response.json(results.rows);
    });
}

