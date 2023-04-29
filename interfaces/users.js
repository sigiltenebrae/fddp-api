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

exports.getCardUsage = (request, response) => {
    const id = parseInt(request.params.id);
    pool.query('SELECT * FROM decks WHERE owner = ' + id, (error, results) => {
        if (error) {
            console.log('Failed to load decks for user: ' + id);
            return response.json([]);
        }
        else {
            if (results && results.rows && results.rows.length != null && results.rows.length > 0) {
                let deck_promises = [];
                let card_dict = {};
                for (let deck of results.rows) {
                    deck_promises.push( new Promise((res) => {
                        pool.query('SELECT name FROM deck_cards WHERE deckid = ' + deck.id, (e, r) => {
                            if (e) {
                                console.log('Error loading cards for deck: ' + deck.id);
                                console.log(e);
                                res();
                            }
                            else {
                                if (r && r.rows && r.rows.length != null && r.rows.length > 0) {
                                    for (let card of r.rows) {
                                        if (card_dict[card.name] === undefined) {
                                            card_dict[card.name] = 1;
                                        }
                                        else {
                                            card_dict[card.name] ++;
                                        }
                                    }
                                    res();
                                }
                                else {
                                    res();
                                }
                            }
                        })
                    }))
                }
                Promise.all(deck_promises).then(() => {
                    let out_counts = [];
                    for (let [key, value] of Object.entries(card_dict)) {
                        out_counts.push({name: key, count: value});
                    }
                    out_counts.sort((a, b) => (a.count < b.count)? 1: -1);
                    return response.json(out_counts);
                })
            }
            else {
                return response.json([]);
            }
        }
    })
}

exports.setDefaultImage = (request, response) => {
    const userid = parseInt(request.params.id);
    if (request.body && request.body.card) {
        pool.query('SELECT * FROM default_images WHERE userid = $1 AND name = $2', [userid, request.body.card.name], (er, re) => {
            if (re.rows && re.rows.length > 0) {
                pool.query('UPDATE default_images SET image = $1, back_image = $2 WHERE userid = $3 AND name = $4',
                    [request.body.card.image, request.body.card.back_image, userid, request.body.card.name], (err, res) => {
                        if(err) {
                            console.log('Failed to update default image for: ' + request.body.card.name + ' for user ' + userid);
                            return response.json({});
                        }
                        return response.json({});
                    });
            }
            else {
                pool.query('INSERT INTO default_images (userid, name, image, back_image) VALUES ($1, $2, $3, $4)',
                [userid, request.body.card.name, request.body.card.image, request.body.card.back_image], (err, res) => {
                    if (err) {
                        console.log('Failed to set default image for: ' + request.body.card.name + ' for user ' + userid);
                        return response.json({});
                    }
                    return response.json({});
                });
            }
        })
    }
    else {
        return response.json({});
    }
}

exports.deleteDefaultImage = (request, response) => {
    const userid = parseInt(request.params.id);
    if (request.body && request.body.card) {
        pool.query('DELETE FROM default_images WHERE userid = $1 AND name = $2', [userid, request.body.card.name], (err, res) => {
            if (err) {
                console.log('Failed to delete default image for: ' + request.body.card.name + ' for user ' + userid);
                return response.json({});
            }
        })
    }
    else {
        return response.json({});
    }
}

exports.getDefaultImages = (request, response) => {
    const userid = parseInt(request.params.id);
    pool.query('SELECT * FROM default_images WHERE userid = $1', [userid], (err, res) => {
        if (err) {
            console.log('Failed to get default images for user ' + userid);
            return response.json([]);
        }
        else {
            return response.json(res.rows);
        }
    });
}

exports.getDefaultImage = (request, response) => {
    const userid = parseInt(request.params.id);
    if (request.body && request.body.card_name) {
        pool.query('SELECT * FROM default_images WHERE userid = $1 AND name = $2', [userid, request.body.card_name], (err, res) => {
            if (err) {
                console.log('Failed to get default image for user ' + userid);
                return response.json(null);
            }
            else {
                return response.json(res.rows[0]);
            }
        });
    }
}