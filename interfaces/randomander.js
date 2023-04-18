const scryfalldb = require('./scryfall');

/**
 * Returns a formatted card with a randomly selected image with the given card name
 * @param card_name
 * @returns {any}
 */
function formatRandomCardData(card_name) {
    let card_data = scryfalldb.getFormattedScryfallCard(card_name);
    let random_card_images = scryfalldb.getAllCardImages(card_name);
    card_data.image = random_card_images[Math.floor(Math.random() * random_card_images.length)];
    card_data.power = card_data.power != null && card_data.power !== '*' ? Number(card_data.power): card_data.power === '*' ? 0: null;
    card_data.back_power = card_data.back_power != null && card_data.back_power !== '*' ? Number(card_data.back_power): card_data.back_power === '*'? 0: null;
    card_data.toughness = card_data.toughness != null && card_data.toughness !== '*' ? Number(card_data.toughness): card_data.toughness === '*'? 0: null;
    card_data.back_toughness = card_data.back_toughness != null && card_data.back_toughness !== '*'? Number(card_data.back_toughness): card_data.back_toughness === '*' ? 0:  null;
    card_data.loyalty = card_data.loyalty != null ? Number(card_data.loyalty): null;
    card_data.back_loyalty = card_data.back_loyalty != null ? Number(card_data.back_loyalty): null;
    card_data.defense = card_data.defense != null ? Number(card_data.defense): null;
    card_data.back_defense = card_data.back_defense != null ? Number(card_data.back_defense): null;
    card_data.cmc = card_data.cmc != null ? Number(card_data.cmc): null;
    card_data.count = 1;
    card_data.iscommander = false;
    return card_data;
}

/**
 * Returns an array of all commanders with the 'Partner' keyword from the commanderdata array
 * @param commanderdata
 * @returns [{any}]
 */
function getPartnersFromCommanderData(commanderdata) {
    let partners = [];
    for (let card of commanderdata) {
        if (card.keywords && card.keywords.includes("Partner")) {
            partners.push(card);
        }
    }
    return partners;
}

/**
 * Returns an array of all commanders with the 'Partner with' keyword from the commanderdata array
 * @param commanderdata
 * @returns [{any}]
 */
function getPartnerWithsFromCommanderData(commanderdata) {
    let partners = [];
    for (let card of commanderdata) {
        if (card.keywords && card.keywords.includes("Partner with")) {
            partners.push(card);
        }
    }
    return partners;
}

/**
 * Returns an array of all commanders with the 'Friends Forever' keyword from the commanderdata array
 * @param commanderdata
 * @returns [{any}]
 */
function getFriendsForeverFromCommanderData(commanderdata) {
    let comms = [];
    for (let card of commanderdata) {
        if (card.oracle_text && card.oracle_text.includes("Friends forever")) {
            comms.push(card);
        }
    }
    return comms;
}

/**
 * Returns an array of all commanders with the 'Choose a Background' keyword from the commanderdata array
 * @param commanderdata
 * @returns [{any}]
 */
function getChooseBackgroundFromCommanderData(commanderdata) {
    let comms = [];
    for (let card of commanderdata) {
        if (card.oracle_text && card.oracle_text.includes("Choose a Background")) {
            comms.push(card);
        }
    }
    return comms;
}

/**
 * Returns an array of all commanders with the 'Background' type from the commanderdata array
 * @param commanderdata
 * @returns [{any}]
 */
function getBackgroundsFromCommanderData(commanderdata) {
    let backs = [];
    for (let card of commanderdata) {
        if (card.type_line && card.type_line.includes("Background")) {
            backs.push(card);
        }
    }
    return backs;
}

function colorLT(commander_1, commander_2, colors) {
    for (let color of commander_1.color_identity) {
        if (!colors.includes(color)) { //has a bad color
            return false;
        }
    }
    if (commander_2 != null) {
        for (let color of commander_2.color_identity) {
            if (!colors.includes(color)) { //has a bad color
                return false;
            }
        }
    }
    return true;
}

function colorEq(commander_1, commander_2, colors) {
    if (!colorLT(commander_1, commander_2, colors)){
        return false;
    }
    for (let color of colors) {
        if (!commander_1.color_identity.includes(color)) {
            if (!commander_2.color_identity.includes(color)) {
                return false;
            }
        }
    }
    return true;
}

function canPartner(random_commander) {
    if (random_commander.keywords && random_commander.keywords.includes("Partner")) {
        return true;
    }
    else if (random_commander.oracle_text && random_commander.oracle_text.includes("Friends forever")) {
        return true;
    }
    else if (random_commander.oracle_text && random_commander.oracle_text.includes("Choose a Background")) {
        return true;
    }
    else if (random_commander.type_line && random_commander.type_line.includes("Background")) {
        return true;
    }
    return false;
}

function getRandomCommander(commanderdata, colors) {
    let random_commander = null;
    let random_commander_2 = null;
    if (colors) {
        while(true) {
            random_commander = commanderdata[Math.floor(Math.random() * commanderdata.length)];
            if (!colorLT(random_commander, null,  colors)) {
                continue;
            }
            if (random_commander.color_identity.length === colors.length) { //all colors are represented
                break;
            }
            if (!canPartner(random_commander)) {
                continue;
            }
            if (random_commander.keywords && random_commander.keywords.includes("Partner")) {
                let partners = getPartnersFromCommanderData(commanderdata);
                if (random_commander.keywords.includes("Partner with")) {
                    if (random_commander.all_parts != null && random_commander.all_parts.length > 0) {
                        for (let part of random_commander.all_parts) {
                            if (part.id !== random_commander.id) {
                                let temp_partner = getCardById(part.id);
                                if (temp_partner.keywords && temp_partner.keywords.includes("Partner with")) {
                                    const inArray = commanderdata.some(element => {
                                        return element.name === temp_partner.name;
                                    });
                                    if (inArray) {
                                        random_commander_2 = temp_partner;
                                        if  (!colorEq(random_commander, random_commander_2, colors)) {
                                            continue;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                else {
                    let count = 0;
                    while(count < 20) {
                        random_commander_2 = partners[Math.floor(Math.random() * partners.length)];
                        if (colorEq(random_commander, random_commander_2, colors)) {
                            break;
                        }
                        else {
                            random_commander_2 = null;
                        }
                        count ++;
                    }
                    if (random_commander_2 == null) {
                        continue;
                    }
                    else {
                        break;
                    }
                }
            }
            else if (random_commander.oracle_text && random_commander.oracle_text.includes("Friends forever")) {
                let ff_list = getFriendsForeverFromCommanderData(commanderdata);
                let count = 0;
                while(count < 20) {
                    random_commander_2 = ff_list[Math.floor(Math.random() * ff_list.length)];
                    if (colorEq(random_commander, random_commander_2, colors)) {
                        break;
                    }
                    else {
                        random_commander_2 = null;
                    }
                    count ++;
                }
                if (random_commander_2 == null) {
                    continue;
                }
                else {
                    break;
                }
            }
            else if (random_commander.oracle_text && random_commander.oracle_text.includes("Choose a Background") && random_commander.name !== "Faceless One") {
                let backgrounds = getBackgroundsFromCommanderData(commanderdata);
                let count = 0;
                while(count < 20) {
                    random_commander_2 = backgrounds[Math.floor(Math.random() * backgrounds.length)];
                    if (colorEq(random_commander, random_commander_2, colors)) {
                        break;
                    }
                    else {
                        random_commander_2 = null;
                    }
                    count ++;
                }
                if (random_commander_2 == null) {
                    continue;
                }
                else {
                    break;
                }
            }
            else if (random_commander.type_line && random_commander.type_line.includes("Background") && random_commander.name !== "Faceless One") {
                let choosers = getChooseBackgroundFromCommanderData(commanderdata);
                let count = 0;
                while(count < 20) {
                    random_commander_2 = choosers[Math.floor(Math.random() * choosers.length)];
                    if (colorEq(random_commander, random_commander_2, colors)) {
                        break;
                    }
                    else {
                        random_commander_2 = null;
                    }
                    count ++;
                }
                if (random_commander_2 == null) {
                    continue;
                }
                else {
                    break;
                }
            }
            else if (random_commander.name === "Faceless One") {
                if (Math.floor(Math.random() * 100) > 50) {
                    let backgrounds = getBackgroundsFromCommanderData(commanderdata);
                    let count = 0;
                    while(count < 20) {
                        random_commander_2 = backgrounds[Math.floor(Math.random() * backgrounds.length)];
                        if (colorEq(random_commander, random_commander_2, colors)) {
                            break;
                        }
                        else {
                            random_commander_2 = null;
                        }
                        count ++;
                    }
                    if (random_commander_2 == null) {
                        continue;
                    }
                    else {
                        break;
                    }
                }
                else {
                    let choosers = getChooseBackgroundFromCommanderData(commanderdata);
                    let count = 0;
                    while(count < 20) {
                        random_commander_2 = choosers[Math.floor(Math.random() * choosers.length)];
                        if (colorEq(random_commander, random_commander_2, colors)) {
                            break;
                        }
                        else {
                            random_commander_2 = null;
                        }
                        count ++;
                    }
                    if (random_commander_2 == null) {
                        continue;
                    }
                    else {
                        break;
                    }
                }
            }
        }
    }
    else {
        random_commander = commanderdata[Math.floor(Math.random() * commanderdata.length)];

        if (random_commander.name === "Faceless One" || random_commander.name === "The Prismatic Piper") {
            let colors = ["W", "U", "B", "R", "G"];
            random_commander.color_identity = [colors[Math.floor(Math.random() * colors.length)]];
        }



        if (random_commander.keywords && random_commander.keywords.includes("Partner")) {
            let partners = getPartnersFromCommanderData(commanderdata);
            if (random_commander.keywords.includes("Partner with")) {
                if (random_commander.all_parts != null && random_commander.all_parts.length > 0) {
                    for (let part of random_commander.all_parts) {
                        if (part.id !== random_commander.id) {
                            let temp_partner = getCardById(part.id);
                            if (temp_partner.keywords && temp_partner.keywords.includes("Partner with")) {
                                const inArray = commanderdata.some(element => {
                                    return element.name === temp_partner.name;
                                });
                                if (inArray) {
                                    random_commander_2 = temp_partner;
                                }
                            }
                        }
                    }
                }
            }
            else {
                random_commander_2 = partners[Math.floor(Math.random() * partners.length)];
            }
        }
        else if (random_commander.oracle_text && random_commander.oracle_text.includes("Friends forever")) {
            let ff_list = getFriendsForeverFromCommanderData(commanderdata);
            random_commander_2 = ff_list[Math.floor(Math.random() * ff_list.length)];
        }
        else if (random_commander.oracle_text && random_commander.oracle_text.includes("Choose a Background") && random_commander.name !== "Faceless One") {
            let backgrounds = getBackgroundsFromCommanderData(commanderdata);
            random_commander_2 = backgrounds[Math.floor(Math.random() * backgrounds.length)];
        }
        else if (random_commander.type_line && random_commander.type_line.includes("Background") && random_commander.name !== "Faceless One") {
            let choosers = getChooseBackgroundFromCommanderData(commanderdata);
            random_commander_2 = choosers[Math.floor(Math.random() * choosers.length)];
        }
        else if (random_commander.name === "Faceless One") {
            if (Math.floor(Math.random() * 100) > 50) {
                let backgrounds = getBackgroundsFromCommanderData(commanderdata);
                random_commander_2 = backgrounds[Math.floor(Math.random() * backgrounds.length)];
            }
            else {
                let choosers = getChooseBackgroundFromCommanderData(commanderdata);
                random_commander_2 = choosers[Math.floor(Math.random() * choosers.length)];
            }
        }
        if (random_commander_2 != null) {
            if (random_commander_2.name === "Faceless One" || random_commander_2.name === "The Prismatic Piper") {
                let colors = ["W", "U", "B", "R", "G"];
                random_commander_2.color_identity = [colors[Math.floor(Math.random() * colors.length)]];
            }
        }
    }
    return [random_commander, random_commander_2];
}

/**
 * Returns an array of cards matching the given commanders' color identity of length 60.
 * @param commander
 * @param commander2
 * @param carddata array to pull cards from
 * @returns [{any}]
 */
function getRandomCardsForCommander(commander, commander2, carddata) {
    let deck = [];
    let size = commander2 == null? 59: 58;
    while (deck.length < size) {
        let random_card = carddata[Math.floor(Math.random() * carddata.length)];
        if (random_card.type_line != null && !random_card.type_line.includes("Stickers") && !random_card.type_line.includes("Attraction")) {
            if (random_card.color_identity != null) {
                let bad_card = false;
                for (let color of random_card.color_identity) {
                    if (commander2 == null && !commander.color_identity.includes(color)) {
                        bad_card = true;
                        break;
                    }
                    else if (commander2 != null && !commander.color_identity.includes(color) && !commander2.color_identity.includes(color)) {
                        bad_card = true;
                        break;
                    }
                }
                if (!bad_card) {
                    if (random_card.type_line != null && !random_card.type_line.includes("Land")) {
                        const inArray = deck.some(element => {
                            return element.name === random_card.name;
                        });
                        if (!inArray) {
                            deck.push(random_card);
                        }
                    }
                }
            }
        }
    }
    return deck;
}

/**
 * Returns an array of randomly selected non-basic lands of length 10 matching the commanders' color identity
 * @param commander
 * @param commander2
 * @param carddata
 * @returns [{any}]
 */
function getRandomLandsForCommander(commander, commander2, carddata) {
    let land_list = [];
    let random_lands = [];
    for (let card of carddata) {
        if (card.type_line != null && card.type_line.includes("Land")  && !card.type_line.includes("Basic")) {
            land_list.push(card);
        }
    }
    while (random_lands.length < 10) {
        let random_land = land_list[Math.floor(Math.random() * land_list.length)];
        if (random_land.color_identity != null) {
            let bad_card = false;
            for (let color of random_land.color_identity) {
                if (commander2 == null && !commander.color_identity.includes(color)) {
                    bad_card = true;
                    break;
                }
                else if (commander2 != null && !commander.color_identity.includes(color) && !commander2.color_identity.includes(color)) {
                    bad_card = true;
                    break;
                }
            }
            if (!bad_card) {
                const inArray = random_lands.some(element => {
                    return element.name === random_land.name;
                });
                if (!inArray) {
                    random_lands.push(random_land);
                }
            }
        }
    }
    return random_lands;
}

/**
 * Returns a list of 30 basic lands matching the color distribution of the given deck.
 * @param deck array of cards to compare to.
 * @returns [{any}]
 */
function getBasicsForDeck(deck) {
    let basics = [];
    let w_count = 0;
    let u_count = 0;
    let b_count = 0;
    let r_count = 0;
    let g_count = 0;
    for (let card of deck) {
        if (card.mana_cost != null) {
            w_count += (card.mana_cost.match(/{W}/g) || []).length;
            u_count += (card.mana_cost.match(/{U}/g) || []).length;
            b_count += (card.mana_cost.match(/{B}/g) || []).length;
            r_count += (card.mana_cost.match(/{R}/g) || []).length;
            g_count += (card.mana_cost.match(/{G}/g) || []).length;
        }
    }
    let total_count = w_count + u_count + b_count + r_count + g_count;
    if (w_count > 0) {
        let plains = formatRandomCardData('Plains');
        if (Math.floor(Math.random() * 100) > 75) {
            plains = formatRandomCardData('Snow-Covered Plains');
        }
        for (let i = 0; i < Math.floor((w_count / total_count) * 30); i++) {
            basics.push(plains);
        }
    }
    if (u_count > 0) {
        let island = formatRandomCardData('Island');
        if (Math.floor(Math.random() * 100) > 75) {
            island = formatRandomCardData('Snow-Covered Island');
        }
        for (let i = 0; i < Math.floor((u_count / total_count) * 30); i++) {
            basics.push(island);
        }
    }
    if (b_count > 0) {
        let swamp = formatRandomCardData('Swamp');
        if (Math.floor(Math.random() * 100) > 75) {
            swamp = formatRandomCardData('Snow-Covered Swamp');
        }
        for (let i = 0; i < Math.floor((b_count / total_count) * 30); i++) {
            basics.push(swamp);
        }
    }
    if (r_count > 0) {
        let mountain = formatRandomCardData('Mountain');
        if (Math.floor(Math.random() * 100) > 75) {
            mountain = formatRandomCardData('Snow-Covered Mountain');
        }
        for (let i = 0; i < Math.floor((r_count / total_count) * 30); i++) {
            basics.push(mountain);
        }
    }
    if (g_count > 0) {
        let forest = formatRandomCardData('Forest');
        if (Math.floor(Math.random() * 100) > 75) {
            forest = formatRandomCardData('Snow-Covered Forest');
        }
        for (let i = 0; i < Math.floor((g_count / total_count) * 30); i++) {
            basics.push(forest);
        }
    }
    if (basics.length < 30) {
        let wastes = formatRandomCardData('Wastes');
        for (let i = basics.length; i < 30; i++) {
            basics.push(wastes);
        }
    }
    return basics;
}

/**
 * Generate the random deck using the given commanderdata and carddata
 * @returns [any]
 */
function getRandomDeck(commanderdata, carddata) {

    let temp_commanders = getRandomCommander(commanderdata, null);
    let random_commander = temp_commanders[0];
    let random_commander_2 = temp_commanders[1];

    let random_deck = getRandomCardsForCommander(random_commander, random_commander_2, carddata);
    let random_lands = getRandomLandsForCommander(random_commander, random_commander_2, carddata);
    for (let land of random_lands) {
        random_deck.push(land);
    }
    let basic_lands = getBasicsForDeck(random_deck);
    let final_random_deck = [];
    for (let card of random_deck) {
        final_random_deck.push(formatRandomCardData(card.name));
    }
    for (let land of basic_lands) {
        final_random_deck.push(land);
    }
    if (random_commander_2 != null) {
        let randomc2 = formatRandomCardData(random_commander_2.name);
        randomc2.iscommander = true;
        final_random_deck.unshift(randomc2);
    }
    let randomc1 = formatRandomCardData(random_commander.name)
    randomc1.iscommander = true;
    final_random_deck.unshift(randomc1);
    return final_random_deck;
}

/**
 * Return the formatted random deck
 * @param commanderdata
 * @param carddata
 * @returns {any}
 */
function getRandomDeckForPlay(commanderdata, carddata) {
    let random_cards = getRandomDeck(commanderdata, carddata);
    let random_deck = {};
    random_deck.id = -1;
    random_deck.name = "Random Deck"
    random_deck.owner = -1;
    random_deck.sleeves = "";
    random_deck.cards = random_cards;
    random_deck.tokens = [];
    return random_deck;
}

exports.getCheapRandomDeck = (request, response) => {
    let deck = getRandomDeckForPlay(scryfalldb.getCheapCommanderData(), scryfalldb.getCheapData());
    let stickers = scryfalldb.getStickers();
    deck.stickers = [];
    for (let i = 0; i < 3; i++) {
        let ind = Math.floor(Math.random() * stickers.length);
        deck.stickers.push(stickers[ind]);
        stickers.splice(ind, 1);
    }
    return response.json(deck);
}

exports.getRandomDeck = (request, response) => {
    let deck = getRandomDeckForPlay(scryfalldb.getCommanderData(), scryfalldb.getScryfallData());
    let stickers = scryfalldb.getStickers();
    deck.stickers = [];
    for (let i = 0; i < 3; i++) {
        let ind = Math.floor(Math.random() * stickers.length);
        deck.stickers.push(stickers[ind]);
        stickers.splice(ind, 1);
    }
    return response.json(deck);
}

exports.getRandomCommanderAPI = (request, response) => {
    if (request.body && request.body.colors) {
        return response.json(getRandomCommander(scryfalldb.getCommanderData(), request.body.colors));
    }
    else {
        return response.json(getRandomCommander(scryfalldb.getCommanderData(), null));
    }
}
