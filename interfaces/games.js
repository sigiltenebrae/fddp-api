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

exports.getGameTypes = (request, response) => {
    pool.query('SELECT * FROM game_types',
        (error, results) => {
            if (error) {
                console.log('Error getting all game types');
                console.log(error);
                return response.json({errors: [error]});
            }
            else {
                if (results.rows && results.rows.length > 0) {
                    return response.json(results.rows);
                }
                else {
                    return response.json([]);
                }
            }
        });
}

exports.getGames = (request, response) => {
    pool.query('SELECT * FROM games ORDER BY id DESC',
        (error, results) => {
            if (error) {
                console.log('Error getting all games');
                console.log(error);
                return response.json({errors: [error]});
            }
            else {
                if (results.rows && results.rows.length > 0) {
                    let games = results.rows;
                    let game_promises = [];
                    for (let game of games) {
                        game_promises.push(new Promise((resolve) => {
                            pool.query('SELECT * FROM game_results WHERE game_id =' + game.id,
                                (err, res) => {
                                    if (err) {
                                        game.players = [];
                                        resolve();
                                    }
                                    else {
                                        if (res.rows) {
                                            game.players = res.rows;
                                        }
                                        resolve();
                                    }
                                })
                        }));
                    }
                    Promise.all(game_promises).then(() => {
                        return response.json(games);
                    });
                }
                else {
                    return response.json([]);
                }
            }
        });
}

exports.getGamesNoTest = (request, response) => {
    pool.query('SELECT * FROM games WHERE type != 6 ORDER BY id DESC',
        (error, results) => {
            if (error) {
                console.log('Error getting all games');
                console.log(error);
                return response.json({errors: [error]});
            }
            else {
                if (results.rows && results.rows.length > 0) {
                    let games = results.rows;
                    let game_promises = [];
                    for (let game of games) {
                        game_promises.push(new Promise((resolve) => {
                            pool.query('SELECT * FROM game_results WHERE game_id =' + game.id,
                                (err, res) => {
                                    if (err) {
                                        game.players = [];
                                        resolve();
                                    }
                                    else {
                                        if (res.rows) {
                                            game.players = res.rows;
                                        }
                                        resolve();
                                    }
                                })
                        }));
                    }
                    Promise.all(game_promises).then(() => {
                        return response.json(games);
                    });
                }
                else {
                    return response.json([]);
                }
            }
        });
}

exports.getActiveGames = (request, response) => {
    pool.query('SELECT * FROM games WHERE active = true',
        (error, results) => {
            if (error) {
                console.log('Error getting active games');
                console.log(error);
                return response.json({errors: [error]});
            }
            else {
                if (results.rows && results.rows.length > 0) {
                    return response.json(results.rows);
                }
                else {
                    return response.json([]);
                }
            }
        });
}

exports.getGameById = (request, response) => {
    const id = parseInt(request.params.id);

    pool.query('SELECT * FROM games where id = $1', [id],
        (error, results) => {
            if (error) {
                console.log('Error getting game: ' + id);
                console.log(error);
                return response.json({errors: [error]});
            }
            if (results.rows.length > 0) {
                return response.json(results.rows[0]);
            }
            else {
                return response.json({});
            }
        });
}

exports.createGame = (request, response) => {
    if (request.body && request.body.game) {
        console.log('creating game');
        const game = request.body.game;
        pool.query('INSERT INTO games (name, type, max_players, active) VALUES ($1, $2, $3, true) RETURNING *',
            [game.name, game.type, game.max_players],
            (error, results) => {
                if (error) {
                    console.log('game creation failed');
                    console.log(error);
                    return response.json({errors: [error]});
                }
                let new_id = results.rows[0].id;
                if (new_id > -1) {
                    return response.json({game_id: new_id});
                }
                else {
                    console.log('game creation failed');
                    console.log(error);
                    return response.json({errors: []});
                }
            });
    }
}

exports.startGame = (request, response) => {
    const id = parseInt(request.params.id);
    pool.query('UPDATE games SET started = now() WHERE id = $1', [id],
        (error, results) => {
            if (error) {
                console.log('Game start failed for deck with id: ' + id);
                console.log(error);
                return response.json({errors: [error]});
            }
            else {
                console.log('game started with id ' + id)
                return response.json({message: 'game started'});
            }
        });
}

exports.updateGame = (request, response) => {
    if (request.body && request.body.game) {
        const game = request.body.game;
        console.log('updating game ' + game.id);
        pool.query('UPDATE games SET active = $1, winner = $2, winner_two = $3, game_data = $4 WHERE id = $5',
            [game.active, game.winner, game.winner_two, game.game_data, game.id],
            (error, results) => {
                if (error) {
                    console.log('Game update failed for deck with id: ' + game.id);
                    console.log(error);
                    return response.json({errors: [error]});
                }
                else {
                    console.log('game updated with id ' + game.id)
                    return response.json({message: 'game update successful'});
                }
            })
    }
}

exports.getGameResults = (request, response) => {
    const id = parseInt(request.params.id);
    pool.query('SELECT * FROM game_results WHERE game_id = $1', [id], (error, results) => {
        if (error) {
            console.log('Error getting game results for : ' + id);
            console.log(error);
            return response.json({errors: [error]});
        }
        if (results.rows.length > 0) {
            return response.json(results.rows);
        }
        else {
            return response.json([]);
        }
    });
}

exports.updateGameResults = (request, response) => {
    if (request.body && request.body.results) {
        const res = request.body.results;
        let result_promises = [];
        for (let result of res) {
            result_promises.push(new Promise((resolve) => {
                pool.query('UPDATE game_results SET winner = $1 WHERE game_id = $2 AND deck_id = $3 AND player_id = $4',
                    [result.winner, result.game_id, result.deck_id, result.player_id], (error, results) => {
                        if (error) {
                            console.log('Game results update failed for game with id: ' + result.game_id);
                            console.log(error);
                            resolve()
                        }
                        else {
                            console.log('game updated with id ' + result.game_id)
                            resolve()
                        }
                    })
            }))
        }
        Promise.all(result_promises).then(() => {
            return response.json({message: 'game update successful'});
        });
    }
}
