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