
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

export function getBanList(request, response) {
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

export function getBanTypes(request, response) {
    grabBanTypes().then((types) => {
        return response.json(types);
    })
}

export function banCard(request, response) {
    if (request.body && request.body.card) {
        console.log('adding ban for card: ' + request.body.card.name);
        pool.query('INSERT INTO ban_list (name, ban_type) VALUES ($1, $2)', [request.body.card.name, request.body.card.ban_type], (error, results) => {
            if (error) {
                console.log('Error creating ban');
                console.log(error);
                return response.json({errors: [error]});
            }
            return response.json({message: 'ban created successfully'});
        });
    }
}

export function removeBan(request, response) {
    if (request.body && request.body.card) {
        pool.query('DELETE FROM ban_list WHERE name = $1', [request.body.card.name], (error, results) => {
            if (error) {
                console.log('Error deleting ban');
                console.log(error);
                return response.json({errors: [error]});
            }
            console.log('removed ban for: ' + request.body.card.name);
            return response.json({message: 'ban deleted successfully'});
        })
    }
}

export function setBanImage(request, response) {
    if (request.body && request.body.card) {
        pool.query('UPDATE ban_list SET image = $1 WHERE name = $2', [request.body.card.image, request.body.card.name],
            (error, results) => {
                if (error) {
                    console.log('failed to set ban image for ' + card.name);
                }
                return response.json({});
            });
    }
}
