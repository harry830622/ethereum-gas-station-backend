const Router = require('@koa/router');

const GasUsed = require('../../../models/GasUsed');

const gasUsedRouter = new Router();

gasUsedRouter.get('/', async (ctx) => {
  const gasUseds = await GasUsed.find({})
    .populate('contract')
    .sort({ createdAt: -1 })
    .exec()
    .catch((err) => {
      ctx.throw(404, err.message);
    });
  ctx.status = 200;
  ctx.body = gasUseds.map((u) => ({
    contractName: u.contract.name,
    method: u.method,
    amount: u.amount,
    timestamp: Date.parse(u.createdAt) * 1e-3,
  }));
});

module.exports = gasUsedRouter;
