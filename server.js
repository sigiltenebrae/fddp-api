const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const https = require("https");
const fs = require('fs');
const axios = require('axios');

const config = require('./config/db.config');
const Pool = require('pg').Pool
const pool = new Pool({
    user: config.USER,
    host: config.HOST,
    database: config.DB,
    password: config.PASSWORD,
    port: 5432,
});

const scryfalldb = require('./interfaces/scryfall');
const decksdb = require('./interfaces/decks');
const gamesdb = require('./interfaces/games');
const usersdb = require('./interfaces/users');
const customsdb = require('./interfaces/custom_cards');
const bansdb = require('./interfaces/ban_list');
const authdb = require('./interfaces/auth');
const randomdb = require('./interfaces/randomander');
const themesdb = require('./interfaces/themes');
const legalitydb = require('./interfaces/legality');
const edhrecdb = require('./interfaces/edhrec');

const app = express();
const port = 2999;
app.use(cors({
    origin: '*'
}));

app.use(bodyParser.json({limit: '50mb'}));
app.use(
    bodyParser.urlencoded({
        extended: true,
    }));

app.post('/', (request, response) => {
    response.json({ info: 'API endpoint for EDFDDP' });
});


function updateDB() {
    return new Promise ((resolve) => {
            axios.get('https://api.scryfall.com/bulk-data').then( res => {
                let update_url = '';
                for (let bulk of res.data.data) {
                    if (bulk.type === 'default_cards') {
                        update_url = bulk.download_uri;
                        break;
                    }
                }
                if (update_url !== '') {
                    if (!fs.existsSync('assets')){
                        fs.mkdirSync('assets');
                    }
                    const update_file = fs.createWriteStream("assets/default-cards.json");
                    const update_request = https.get(update_url, function(response) {
                        response.pipe(update_file);
                        update_file.on("finish", () => {
                            update_file.close();
                            console.log('scryfall update downloaded');
                            let rawscryfalldata = fs.readFileSync('assets/default-cards.json');
                            scryfalldb.setScryfallData(JSON.parse(rawscryfalldata));
                            scryfalldb.loadCommanderData();
                            scryfalldb.loadCheapData(0.5);
                            scryfalldb.loadCheapCommanders();
                            updateThemesDB().then(() => {
                                legalitydb.updateAllLegalities().then(() => {
                                    resolve();
                                });
                            });
                        });
                    });
                }
            }).catch(function (error) {
                console.log('error updating the local scryfall db');
                console.log(error.code);
                if (error.response && error.response.data) {
                    console.log(error.response.data);
                }
                if (fs.existsSync('assets/default-cards.json')) {
                    console.log('using old db');
                    let rawscryfalldata = fs.readFileSync('assets/default-cards.json');
                    scryfalldb.setScryfallData(JSON.parse(rawscryfalldata));
                    scryfalldb.loadCommanderData();
                    scryfalldb.loadCheapData(0.5);
                    scryfalldb.loadCheapCommanders();
                    updateThemesDB().then(() => {
                        resolve();
                    });
                }
                else {
                    resolve();
                }
            });
        });
}

function themeInList(theme, list) {
    for (let item of list) {
        if (item.name === theme.name) {
            return true;
        }
    }
    return false;
}

function updateThemesDB() {
    return new Promise((resolve) => {
        console.log('syncing with edhrec');
        axios.get('https://json.edhrec.com/pages/themes.json', {timeout: 5000}).then( themeres => {
            const themes = themeres.data.container.json_dict.cardlists[0].cardviews;
            axios.get('https://json.edhrec.com/pages/tribes.json', {timeout: 5000}).then( triberes => {
                const tribes = triberes.data.container.json_dict.cardlists[0].cardviews;
                pool.query('SELECT * FROM edhrec_themes', (theme_errors, theme_results) => {
                    if (theme_errors) {
                        console.log('error loading themes from db');
                        console.log(theme_errors);
                        resolve();
                    }
                    else {
                        let theme_promises = [];
                        for(let theme of themes) {
                            if (!themeInList(theme, theme_results.rows)) {
                                theme_promises.push(new Promise((resolve_theme) => {
                                  pool.query('INSERT INTO edhrec_themes (name, url) VALUES ($1, $2)', [theme.name, theme.url],
                                      (theme_err, theme_res) => {
                                          if (theme_err) {
                                              console.log(theme_err);
                                              resolve_theme();
                                          }
                                      });
                                }));
                            }
                        }
                        for (let theme of theme_results.rows) {
                            if (!themeInList(theme, themes)) {
                                theme_promises.push(new Promise((resolve_theme) => {
                                    pool.query('DELETE FROM edhrec_themes WHERE name = $1', [theme.name],
                                        (theme_err, theme_res) => {
                                            if(theme_err) {
                                                console.log(theme_err);
                                                resolve_theme();
                                            }
                                        });
                                }));
                            }
                        }
                        pool.query('SELECT * FROM edhrec_tribes', (tribe_errors, tribe_results) => {
                            if (tribe_errors) {
                                console.log('error loading tribes from db');
                                console.log(theme_errors);
                                resolve();
                            }
                            else {
                                let tribe_promises = [];
                                for(let tribe of tribes) {
                                    if (!themeInList(tribe, tribe_results.rows)) {
                                        tribe_promises.push(new Promise((resolve_tribe) => {
                                            pool.query('INSERT INTO edhrec_tribes (name, url) VALUES ($1, $2)', [tribe.name, tribe.url],
                                                (tribe_err, tribe_res) => {
                                                    if (tribe_err) {
                                                        console.log(tribe_err);
                                                        resolve_tribe();
                                                    }
                                                });
                                        }));
                                    }
                                }
                                for (let tribe of tribe_results.rows) {
                                    if (!themeInList(tribe, tribes)) {
                                        tribe_promises.push(new Promise((resolve_tribe) => {
                                            pool.query('DELETE FROM edhrec_tribes WHERE name = $1', [tribe.name],
                                                (tribe_err, tribe_res) => {
                                                    if (tribe_err) {
                                                        console.log(tribe_err);
                                                        resolve_tribe();
                                                    }
                                                });
                                        }));
                                    }
                                }
                                Promise.all(theme_promises).then(() => {
                                    Promise.all(tribe_promises).then(() => {
                                        console.log('Themes synced with edhrec successfully');
                                       resolve();
                                    });
                                })

                            }
                        })
                    }
                })
            }).catch((err) => {
                console.log(err.message);
                resolve();
            });
        }).catch((error) => {
            console.log(error.message);
            resolve();
        });
    });
}

getArchidektDeck = (request, response) => {
    const id = request.params.id;
    axios.get('https://archidekt.com/api/decks/' + id + '/').then( res => {
        return response.json(res.data);
    }).catch(function (error) {
        console.log(error);
        return response.json(null);
    })
}

/**
 * User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0
 * referer: https://www.moxfield.com/
 */

getMoxfieldDeck = (request, response) => {
    const id = request.params.id;
    axios.get(
        'https://api2.moxfield.com/v3/decks/all/' + id,
        {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
                "referer": "https://www.moxfield.com/"
            }
        }
    ).then( res => {
        return response.json(res.data);
    }).catch(function (error) {
        console.log(error);
        return response.json(null);
    })
}



app.post('/api/auth/signup', authdb.signup);
app.post('/api/auth/signin', authdb.signin);
app.post('/api/auth/change_password', authdb.changepassword);

app.get('/api/users', usersdb.getUsers);
app.put('/api/users/:id', usersdb.updateProfile);
app.get('/api/users/commanders/:id', usersdb.getCommanders);
app.get('/api/users/carddata/:id', usersdb.getCardUsage);
app.post('/api/users/default_image/:id', usersdb.getDefaultImage);
app.post('/api/users/default_images/:id', usersdb.getDefaultImages);
app.post('/api/users/default_image/insert/:id', usersdb.setDefaultImage);
app.post('/api/users/default_image/delete/:id', usersdb.deleteDefaultImage);

app.post('/api/cards', scryfalldb.getScryfallCardApi);
app.post('/api/cards/unformatted', scryfalldb.getUnformattedScryfallCardApi);
app.post('/api/cards/id', scryfalldb.getScryfallCardByIdApi);
app.post('/api/cards/all', scryfalldb.getAllOfCardApi);
app.post('/api/cards/search', scryfalldb.searchCardApi);
app.post('/api/cards/autocomplete', scryfalldb.autocompleteApi);
app.post('/api/tokens/all', scryfalldb.getAllOfTokenApi);
app.post('/api/cards/images', scryfalldb.getCardImagesApi);
app.get('/api/planes', scryfalldb.getPlanesApi);
app.get('/api/stickers', scryfalldb.getStickersApi);
app.get('/api/attractions', scryfalldb.getAttractionsApi);

app.post('/api/randomdeck/cheap', randomdb.getCheapRandomDeck);
app.post('/api/randomdeck/regular', randomdb.getCheapRandomDeck);
app.post('/api/randomcommander/', randomdb.getRandomCommanderAPI);

app.get('/api/archidekt/deck/:id', getArchidektDeck);
app.get('/api/moxfield/deck/:id', getMoxfieldDeck);

app.post('/api/decks', decksdb.createDeck);
app.put('/api/decks/:id', decksdb.updateDeck);
app.delete('/api/decks/:id', decksdb.deleteDeck);
app.get('/api/game/deck/:id', decksdb.getDeckForPlay);
app.get('/api/decklist', decksdb.getDeckList);
app.put('/api/themes/decks/:id', decksdb.updateDeckThemes);
app.get('/api/userdecks/basic/:id', decksdb.getDecksBasic);
app.get('/api/decks/basic', decksdb.getDecksBasic);
app.get('/api/decks/last_played/:id', decksdb.getLastPlayed);

app.post('/api/custom_cards', customsdb.createCustomCard);
app.get('/api/custom_cards', customsdb.getCustomCards);
app.delete('/api/custom_cards/:id', customsdb.deleteCustomCard)
app.post('/api/custom_tokens', customsdb.createCustomToken);
app.get('/api/custom_tokens', customsdb.getCustomTokens);
app.delete('/api/custom_tokens/:id', customsdb.deleteCustomToken);

app.get('/api/bans/list', bansdb.getBanList);
app.get('/api/bans/types', bansdb.getBanTypes);
app.post('/api/bans/create', bansdb.banCard);
app.post('/api/bans/delete', bansdb.removeBan);
app.post('/api/bans/image', bansdb.setBanImage);

app.get('/api/games/types', gamesdb.getGameTypes);
app.get('/api/games/', gamesdb.getGames);
app.get('/api/gamesnt/', gamesdb.getGamesNoTest);
app.get('/api/games/active', gamesdb.getActiveGames);
app.get('/api/games/:id', gamesdb.getGameById);
app.post('/api/games', gamesdb.createGame);
app.put('/api/games/start/:id', gamesdb.startGame);
app.put('/api/games/:id', gamesdb.updateGame);
app.get('/api/games/results/:id', gamesdb.getGameResults);
app.put('/api/games/results/:id', gamesdb.updateGameResults);

app.get('/api/themes', themesdb.getThemes);

app.get('/api/legality/update/:id', legalitydb.getLegality);
app.get('/api/legality/all/force', legalitydb.getAllLegalities);

app.post('/api/edhrec/cmdrthemes', edhrecdb.getEdhrecThemesApi);

if (fs.existsSync('assets/default-cards.json')) {
    console.log('db file exists');
    let mtime = fs.statSync("assets/default-cards.json").mtime
    if ((Math.abs(Date.now() - mtime) / 1000) > (60 * 60 * 24)) {
        console.log('db file too old, updating');
        updateDB().then(() => {
            app.listen(port, () => {
                console.log(`App running on port ${port}.`);
            });
        });
    }
    else {
        let rawscryfalldata = fs.readFileSync('assets/default-cards.json');
        scryfalldb.setScryfallData(JSON.parse(rawscryfalldata));
        scryfalldb.loadCommanderData();
        scryfalldb.loadCheapData(0.5);
        scryfalldb.loadCheapCommanders();
        app.listen(port, () => {
            console.log(`App running on port ${port}.`);
        });
    }
}
else {
    console.log('db file missing');
    updateDB().then(() => {
        if (fs.existsSync('assets/default-cards.json')) {
            app.listen(port, () => {
                console.log(`App running on port ${port}.`);
            });
        }
        else {
            console.log('Unable to download scryfall db');
        }
    });
}

setInterval(updateDB, 60000 * 60 * 24);