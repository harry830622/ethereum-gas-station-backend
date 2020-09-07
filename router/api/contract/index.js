const Router = require('@koa/router');

const Contract = require('../../../models/Contract');

const contractRouter = new Router();

contractRouter.get('/', async (ctx) => {
  const { limit = 10000, address: a } = ctx.query;
  const maxLimit = 10000;
  const contracts = await Contract.find(a ? { address: a } : {})
    .limit(Math.min(maxLimit, limit))
    .exec()
    .catch((err) => {
      ctx.throw(400, err);
    });
  ctx.status = 200;
  ctx.body = contracts.map(({ address, abi, name }) => ({
    address,
    name,
    abi,
  }));
});

module.exports = contractRouter;
