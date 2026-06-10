import "dotenv/config.js";
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({
    "host":     process.env.POSTGRES_HOST,
    "database": process.env.POSTGRES_DB,
    "user":     process.env.POSTGRES_USER,
    "password": process.env.POSTGRES_PASSWORD,
    "port":     5432,
});

export function getThemes(request, response) {
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
