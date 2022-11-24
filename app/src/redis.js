const { createClient } = require("redis");
const client = createClient({ name: "criptobotNodeJS" });
client.connect();
client.flushAll();
module.exports = {
  set: async (key, value) => {
    return await client.set(key, value);
  },

  get: async (key) => {
    return await client.get(key);
  },

  hSet: async (key, field, value) => {
    return await client.hSet(key, field, value);
  },

  hGet: async (key) => {
    return await client.hGetAll(key);
  },

  getAll: async () => {
    return await client.keys("*");
  },

  getAllKeys: async (...keys) => {
    // console.log('getAllKeys', keys)
    const values = await client.mGet(keys);
    // console.log('values', values)
    const obj = {};
    keys.map((k, i) => (obj[k] = JSON.parse(values[i])));
    return obj;
  },
};
