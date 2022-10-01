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
        const creator = request.body.creator;
        pool.query('INSERT INTO custom_cards (name, image, creator) VALUES($1, $2, $3)',
            [name, image, creator],
            (error, results) => {
                if (error) {
                    console.log('custom card creation failed');
                    console.log(error);
                    return response.json({errors: [error]});
                }
                console.log('custom card created successfully');
                return response.status(200).send({message: 'custom card created successfully'});
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

exports.createCustomToken = (request, response) => {
    if (request.body && request.body.token) {
        const token = request.body.token;
        pool.query('INSERT INTO custom_tokens (name, image, type_line, power, toughness, oracle_text, w, u, b, r, g, creator) ' +
            'VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
            [token.name, token.image, token.type_line, token.power, token.toughness, token.oracle_text, token.colors.w,
            token.colors.u, token.colors.b, token.colors.r, token.colors.g, token.creator],
            (error, results) => {
                if (error) {
                    console.log('custom token creation failed');
                    console.log(error);
                    return response.json({errors: [error]});
                }
                console.log('custom token created successfully');
                return response.status(200).send({message: 'custom token created successfully'});
            });
    }
    else {
        console.log('request body incomplete for create custom card');
        if (request.body) {
            console.log('missing image or name in body');
        }
    }
}

exports.getCustomTokens = (request, response) => {
    pool.query('SELECT * FROM custom_tokens', (error, results) => {
        if (error) {
            console.log('Error getting custom tokens');
            console.log(error);
            return response.json({errors: [error]});
        }
        return response.json(results.rows);
    });
}

exports.deleteCustomToken = (request, response) => {
    const id = parseInt(request.params.id);
    pool.query('DELETE FROM custom_tokens WHERE id = $1', [id],
        (error, results) => {
            if (error) {
                console.log('Error deleting custom token with id: ' + id);
                return response.json({errors: [error]})
            }
            else {
                return response.json({message: 'Deleted custom token with id: ' + id});
            }
        })
}