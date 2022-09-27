const config = require("../config/db.config.js");
const secret_config = require("../config/auth.config")
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const {Pool} = require("pg");

const pool = new Pool({
    user: config.USER,
    host: config.HOST,
    database: config.DB,
    password: config.PASSWORD,
    port: 5432,
})

exports.signup = (request, response) => {
    const username = request.body.username;
    const password = bcrypt.hashSync(request.body.password, 8);
    pool.query('INSERT INTO users (username, password) ' +
        'VALUES ($1, $2) RETURNING *', [username, password],
        (error, results) => {
            if (error) {
                return response.status(500).send({ message: error.message });
            }
            id = results.rows[0].id;
            if (id > -1) {
                pool.query('INSERT INTO user_roles ("userid", "roleid") ' +
                'VALUES ($1, $2) RETURNING *', [id, 1],
                    (err, res) => {
                        if (err) {
                            return response.status(500).send({ message: err.message });
                        }
                    });
                return response.json({message: `User added with ID: ${results.rows[0].id}`})
            }
        });
}

exports.signin = (request, response) => {
    const username = request.body.username;
    pool.query('SELECT * FROM users WHERE username = $1', [username], (error, results) => {
        if (error) {
            return response.status(500).send({ message: error.message });
        }
        if (results.rows.length < 1) {
            return response.status(404).send({ message: "User Not found." });
        }
        const user = results.rows[0];
        const passwordValid = bcrypt.compareSync(
            request.body.password,
            user.password
        );
        if (!passwordValid) {
            return response.status(401).send({
                accessToken: null,
                message: "Invalid Password!"
            });
        }
        let token = jwt.sign({ id: user.id }, secret_config.secret, {
            expiresIn: 86400 // 24 hours
        });
        pool.query('SELECT roles.name from roles left join user_roles on roles.id = user_roles."roleid" where user_roles."userid" = $1',
            [user.id], (err, res) => {
                if (err) {
                    return response.status(500).send({ message: err.message });
                }
                return response.status(200).send({
                    id: user.id,
                    username: user.username,
                    roles: res.rows,
                    theme: user.theme,
                    accessToken: token
                });
            });

        });
}

exports.changepassword = (request, response) => {
    const id = request.body.id;
    pool.query('SELECT * FROM users WHERE id = $1', [id], (error, results) => {
        if (error) {
            return response.status(500).send({ message: error.message });
        }
        if (results.rows.length < 1) {
            return response.status(404).send({ message: "User Not found." });
        }
        const user = results.rows[0];
        const passwordValid = bcrypt.compareSync(
            request.body.password,
            user.password
        );
        if (!passwordValid) {
            return response.status(401).send({
                accessToken: null,
                message: "Invalid Password!"
            });
        }
        const new_password = bcrypt.hashSync(request.body.new_password, 8);
        pool.query('UPDATE users SET password = $1 WHERE id = $2', [new_password, user.id], (error, results) => {
           if (error) {
               return response.status(500).send({ message: error.message });
           }

           return response.json({message: `Password updated for user with ID: ${user.id}` });
        });
    });

}