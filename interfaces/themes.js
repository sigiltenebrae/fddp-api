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