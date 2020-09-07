const Router = require('@koa/router');

const GasPrice = require('../../../models/GasPrice');

const gasPriceRouter = new Router();

gasPriceRouter.get('/', async (ctx) => {
  const { limit = 10000 } = ctx.query;
  const maxLimit = 10000;
  const gasPrices = await GasPrice.find({})
    .sort({ timestamp: -1 })
    .limit(Math.min(maxLimit, limit))
    .exec()
    .catch((err) => {
      ctx.throw(400, err);
    });
  ctx.status = 200;
  ctx.body = gasPrices.map(({ instant, fast, standard, slow, timestamp }) => ({
    instant,
    fast,
    standard,
    slow,
    timestamp,
  }));
});

module.exports = gasPriceRouter;
