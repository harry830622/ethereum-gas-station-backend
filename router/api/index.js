const Router = require('@koa/router');

const gasRouter = require('./gas');

const apiRouter = new Router();

apiRouter.use('/gas', gasRouter.routes());

module.exports = apiRouter;
