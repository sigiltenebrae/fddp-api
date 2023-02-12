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
        return response.json(results.rows);
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