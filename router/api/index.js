const Router = require('@koa/router');

const gasPriceRouter = require('./gas-price');
const gasUsedRouter = require('./gas-used');

const apiRouter = new Router();

apiRouter.use('/gas-price', gasPriceRouter.routes());
apiRouter.use('/gas-used', gasUsedRouter.routes());

module.exports = apiRouter;
