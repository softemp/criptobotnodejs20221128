const redis = require('redis');
const logger = require('./logger');
const LOGS = process.env.CACHE_LOGS === 'true';
const cache = new Object()

module.exports = class Cache {
    constructor() {
        logger('system', 'Iniciando o sistema de Memória!');
    }

    async set(key, value) {
        cache[key] = value
        if (LOGS) logger('system', 'SET ' + JSON.stringify({ key, value }));
    }

    async get(key) {
        return JSON.parse(await cache[key]);
    }

    async getAll() {
        return cache
    }
}