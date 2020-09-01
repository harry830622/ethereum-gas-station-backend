const Router = require('@koa/router');

const gasPriceRouter = require('./gas-price');
const gasUsedRouter = require('./gas-used');
const userRouter = require('./user');

const apiRouter = new Router();

apiRouter.use('/gas-price', gasPriceRouter.routes());
apiRouter.use('/gas-used', gasUsedRouter.routes());
apiRouter.use('/user', userRouter.routes());

module.exports = apiRouter;
