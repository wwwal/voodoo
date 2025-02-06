require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./models');
const Sequelize = require('sequelize');
const axios = require('axios');

const app = express();

app.use(bodyParser.json());
app.use(express.static(`${__dirname}/static`));

app.get('/api/games', (req, res) => db.Game.findAll()
    .then(games => res.send(games))
    .catch((err) => {
        console.log('There was an error querying games', JSON.stringify(err));
        return res.send(err);
    }));

app.post('/api/games', (req, res) => {
    const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
    return db.Game.create({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
        .then(game => res.send(game))
        .catch((err) => {
            console.log('***There was an error creating a game', JSON.stringify(err));
            return res.status(400).send(err);
        });
});

app.delete('/api/games/:id', (req, res) => {
    // eslint-disable-next-line radix
    const id = parseInt(req.params.id);
    return db.Game.findByPk(id)
        .then(game => game.destroy({ force: true }))
        .then(() => res.send({ id }))
        .catch((err) => {
            console.log('***Error deleting game', JSON.stringify(err));
            res.status(400).send(err);
        });
});

app.put('/api/games/:id', (req, res) => {
    // eslint-disable-next-line radix
    const id = parseInt(req.params.id);
    return db.Game.findByPk(id)
        .then((game) => {
            const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
            return game.update({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
                .then(() => res.send(game))
                .catch((err) => {
                    console.log('***Error updating game', JSON.stringify(err));
                    res.status(400).send(err);
                });
        });
});


app.post('/api/games/search', (req, res) => {
    const { name, platform } = req.body;
    const op = Sequelize.Op;

    let where = {};

    if ("" !== name) {
        where.name = {
            [op.like]: `%${name}%`,
        }
    }

    if ("" !== platform) {
        where.platform = {
            [op.eq]: `${platform}`,
        }
    }

    return db.Game.findAll({
        where: where
    })
        .then(games => res.send(games))
        .catch((err) => {
            console.log('***There was an error creating a game', JSON.stringify(err));
            return res.status(400).send(err);
        });
});

app.get('/api/games/populate', async (req, res) => {
    try {
        await db.Game.truncate();

        const gamesJsonUrls = [
            process.env.IOS_GAMES_JSON_URL,
            process.env.ANDROID_GAMES_JSON_URL,
        ];

        let allGames = [];
        
        const fetchPromises = gamesJsonUrls.map(url => axios.get(url));
        const responses = await Promise.all(fetchPromises);
        
        for (const response of responses) {
            response.data.forEach(row => {
                row.forEach(result => {
                    const { name, publisher_id, os, bundle_id, version } = result;
                    allGames.push({
                        name,
                        publisherId: publisher_id,
                        platform: os,
                        bundleId: bundle_id,
                        storeId: bundle_id,
                        appVersion: version,
                        isPublished: true,
                    });
                });
            });
        }
        
        await db.Game.bulkCreate(allGames);

        const games = await db.Game.findAll();
        res.send(games);

    } catch (error) {
        console.error('Error populating the database:', error);
        res.status(500).send('Error populating the database');
    }
});





app.listen(3000, () => {
    console.log('Server is up on port 3000');
});

module.exports = app;
