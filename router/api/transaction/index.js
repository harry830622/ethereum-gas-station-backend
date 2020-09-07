const Router = require('@koa/router');

const Transaction = require('../../../models/Transaction');

const transactionRouter = new Router();

transactionRouter.get('/', async (ctx) => {
  const { limit = 10000, to: t } = ctx.query;
  const maxLimit = 10000;
  const transactions = await Transaction.find(t ? { to: t } : {})
    .sort({ timestamp: -1 })
    .limit(Math.min(maxLimit, limit))
    .exec()
    .catch((err) => {
      ctx.throw(400, err);
    });
  ctx.status = 200;
  ctx.body = transactions.map(({ hash, from, to, input, gas, timestamp }) => ({
    hash,
    from,
    to,
    input,
    gas,
    timestamp,
  }));
});

module.exports = transactionRouter;
