const Router = require('@koa/router');
const axios = require('axios');

const Gas = require('../../../models/Gas');

const { ETHGAS_API_KEY } = process.env;

const gasRouter = new Router();

gasRouter.get('/', async (ctx) => {
  const gass = await Gas.find({})
    .exec()
    .catch((err) => {
      ctx.throw(404, err.message);
    });
  ctx.status = 200;
  ctx.body = gass.map((gas) => ({
    price: gas.price,
    limit: gas.limit,
    waitTimeInSec: gas.waitTimeInSec,
    createdAt: gas.createdAt,
  }));
});

gasRouter.get('/now', async (ctx) => {
  const res = await axios.get(
    `https://ethgasstation.info/api/ethgasAPI.json?api-key=${ETHGAS_API_KEY}`,
  );
  ctx.status = 200;
  ctx.body = {
    price: {
      fastest: res.data.fastest / 10,
      fast: res.data.fast / 10,
      average: res.data.average / 10,
      safeLow: res.data.safeLow / 10,
    },
    waitTimeInSec: {
      fastestWait: res.data.fastestWait * 60,
      fastWait: res.data.fastWait * 60,
      averageWait: res.data.avgWait * 60,
      safeLowWait: res.data.safeLowWait * 60,
    },
  };
});

module.exports = gasRouter;
