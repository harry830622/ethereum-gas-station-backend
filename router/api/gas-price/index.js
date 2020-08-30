const Router = require('@koa/router');

const GasPrice = require('../../../models/GasPrice');

const gasPriceRouter = new Router();

gasPriceRouter.get('/', async (ctx) => {
  const gasPrices = await GasPrice.find({})
    .sort({ createdAt: -1 })
    .exec()
    .catch((err) => {
      ctx.throw(404, err.message);
    });
  ctx.status = 200;
  ctx.body = gasPrices.map((p) => ({
    instant: p.instant,
    fast: p.fast,
    standard: p.standard,
    slow: p.slow,
    timestamp: Date.parse(p.createdAt) * 1e-3,
  }));
});

module.exports = gasPriceRouter;
