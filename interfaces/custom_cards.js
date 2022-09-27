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

exports.deleteCustomCard = (request, response) => {
    const id = parseInt(request.params.id);
    pool.query('DELETE FROM custom_cards WHERE id = $1', [id],
        (error, results) => {
            if (error) {
                console.log('Error deleting custom card with id: ' + id);
                return response.json({errors: [error]})
            }
            else {
                return response.json({message: 'Deleted custom card with id: ' + id});
            }
        })
}