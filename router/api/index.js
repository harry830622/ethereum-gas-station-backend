const Router = require('@koa/router');

const gasPriceRouter = require('./gas-price');
const transactionRouter = require('./transaction');
const contractRouter = require('./contract');
const userRouter = require('./user');

const apiRouter = new Router();

apiRouter.use('/gas-price', gasPriceRouter.routes());
apiRouter.use('/transaction', transactionRouter.routes());
apiRouter.use('/contract', contractRouter.routes());
apiRouter.use('/user', userRouter.routes());

module.exports = apiRouter;
