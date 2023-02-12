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

exports.getBanList = (request, response) => {
    pool.query('SELECT * FROM ban_list', (error, results) => {
        if (error) {
            console.log('Error getting ban list');
            console.log(error);
            return response.json({errors: [error]});
        }
        return response.json(results.rows);
    });
}

exports.getBanTypes = (request, response) => {
    pool.query('SELECT * FROM ban_types', (error, results) => {
        if (error) {
            console.log('Error getting ban types');
            console.log(error);
            return response.json({errors: [error]});
        }
        return response.json(results.rows);
    });
}