const config = require("../config/db.config.js");
const scryfalldb = require('./scryfall');
const Pool = require('pg').Pool
const pool = new Pool({
    user: config.USER,
    host: config.HOST,
    database: config.DB,
    password: config.PASSWORD,
    port: 5432,
});

exports.getThemes = (request, response) => {
    pool.query('SELECT * FROM edhrec_themes', (theme_errors, theme_results) => {
        if (theme_errors) {
            return response.json({themes: [], tribes: []});
        }
        else {
            pool.query('SELECT * FROM edhrec_tribes', (tribe_errors, tribe_results) => {
                if (tribe_errors) {
                    return response.json({themes: [], tribes: []});
                }
                else {
                    return response.json({themes: theme_results.rows, tribes: tribe_results.rows});
                }
            })
        }
    })
}