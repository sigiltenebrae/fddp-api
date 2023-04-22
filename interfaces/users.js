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

exports.getUsers = (request, response) => {
    pool.query('SELECT * FROM users', (error, results) => {
        if (error) {
            console.log('Error getting users');
            console.log(error);
            return response.json({errors: [error]});
        }
        if (results.rows && results.rows.length) {
            for (let user of results.rows) {
                user.recs = JSON.parse(user.recs);
            }
            return response.json(results.rows);
        }
        return response.json({});
    });
}

exports.getUser = (request, response) => {
    const id = parseInt(request.params.id);
    pool.query('SELECT * FROM users WHERE id = ' + id, (error, results) => {
        if (error) {
            console.log('Error getting users');
            console.log(error);
            return response.json({errors: [error]});
        }
        if (results.rows && results.rows.length > 0) {
            return response.json(results.rows[0]);
        }
        else {
            return response.json([]);
        }

    });
}

exports.updateProfile = (request, response) => {
    const id = parseInt(request.params.id);
    if (request.body && request.body.user) {
        const user = request.body.user;
        pool.query('UPDATE users SET name = $1, username = $2, playmat = $3, default_sleeves = $4, theme = $5, gridlines = $6 WHERE id = $7',
            [user.name, user.username, user.playmat, user.default_sleeves, user.theme, user.gridlines, id], (error, results) => {
                if (error) {
                    console.log('User update failed for profile with id: ' + id);
                    console.log(error);
                    return response.json({errors: [error]});
                }
                else {
                    return response.json({errors: []});
                }
            });
    }
}

exports.getCommanders = (request, response) => {
    const id = parseInt(request.params.id);
    pool.query('SELECT * FROM decks WHERE owner = ' + id, (error, results) => {
        if (error) {
            console.log('Failed to load decks for user: ' + id);
            return response.json([]);
        }
        else {
            if (results && results.rows && results.rows.length != null && results.rows.length > 0) {
                let deck_promises = [];
                let commander_list = [];
                for (let deck of results.rows) {
                    deck_promises.push(
                        new Promise((resolve) => {
                            pool.query('SELECT name FROM deck_cards WHERE deckid = ' + deck.id + ' AND iscommander = true', (e, r) => {
                                if (e) {
                                    console.log('Error loading cards for deck: ' + deck.id);
                                    console.log(e);
                                    resolve();
                                }
                                else {
                                    if (r && r.rows && r.rows.length != null && r.rows.length > 0) {
                                        for (let card of r.rows) {
                                            if (!commander_list.includes(card.name)) {
                                                commander_list.push(card.name);
                                            }
                                        }
                                        resolve();
                                    }
                                    else {
                                        resolve();
                                    }
                                }
                            })
                        }));
                }
                Promise.all(deck_promises).then(() => {
                    commander_list.sort((a, b) => (a > b)? 1: -1);
                    return response.json(commander_list);
                });
            }
            else {
                return response.json([]);
            }
        }
    })
}