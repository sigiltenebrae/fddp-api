const axios = require('axios');

function getEdhrecCardString(card_str) {
    let edhrec_name = card_str.toLowerCase();
    if (edhrec_name.includes(' //')) {
        edhrec_name = edhrec_name.substring(0, card_str.indexOf(' //'));
    }
    edhrec_name = edhrec_name.replace(/[`~!@#$%^&*()_|+=?;:'",.<>\{\}\[\]\\\/]/gi, '').replace(/ /g, '-');
    return edhrec_name;
}

function getEdhrecThemes(commander1, commander2) {
    return new Promise((resolve) => {
        let card_string = '';
        if (commander2 != null) {
            card_string = getEdhrecCardString(commander1) + '-' + getEdhrecCardString(commander2);
        }
        else {
            card_string = getEdhrecCardString(commander1);
        }
        axios.get('https://json.edhrec.com/pages/commanders/' + card_string + '.json').then(res => {
            if (res.data && res.data.panels && res.data.panels.tribelinks && res.data.panels.tribelinks.themes && res.data.panels.tribelinks.themes.length != null && res.data.panels.tribelinks.themes.length > 0) {
                let themes = res.data.panels.tribelinks.themes;
                resolve(themes);
            }
            else if (res.data && res.data.redirect) {
                let new_str = 'https://json.edhrec.com/pages' + res.data.redirect + '.json';
                axios.get(new_str).then(res2 => {
                    let themes = res2.data.panels.tribelinks.themes;
                    resolve(themes);
                }).catch(function (error2) {
                    console.log('error getting edhrec data for ' + commander1);
                    console.log(error2);
                    resolve(null);
                })
            }
        }).catch(function (error) {
            console.log('error getting edhrec data for ' + commander1);
            console.log(error);
            resolve(null);
        })
    })
}

let getEdhrecThemesApi = (request, response) => {
    if(request.body && request.body.commander) {
        if (request.body.commander2) {
            getEdhrecThemes(request.body.commander, request.body.commander2).then((theme_data) => {
                if (theme_data) {
                    return response.json(theme_data);
                }
                else {
                    return response.json([]);
                }
            });
        }
        else {
            getEdhrecThemes(request.body.commander, null).then((theme_data) => {
                if (theme_data) {
                    return response.json(theme_data);
                }
                else {
                    return response.json([]);
                }
            });
        }
    }
    else {
        return response.json([]);
    }
}

module.exports = {
    getEdhrecThemesApi,
}