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

function grabBanList() {
    return new Promise((resolve) => {
        pool.query('SELECT * FROM ban_list', (error, results) => {
            if (error) {
                console.log('Error getting ban list');
                console.log(error);
                resolve({errors: [error]});
            }
            resolve(results.rows);
        });
    })
}

let getBanList = (request, response) => {
    grabBanList().then((list) => {
        return response.json(list);
    })
}

function grabBanTypes() {
    return new Promise((resolve) => {
        pool.query('SELECT * FROM ban_types', (error, results) => {
            if (error) {
                console.log('Error getting ban types');
                console.log(error);
                resolve({errors: [error]});
            }
            resolve(results.rows);
        });
    })
}

let getBanTypes = (request, response) => {
    grabBanTypes().then((types) => {
        return response.json(types);
    })
}

module.exports = {
    getBanList,
    getBanTypes,
    grabBanList,
    grabBanTypes
}