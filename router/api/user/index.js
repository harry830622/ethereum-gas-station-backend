const Router = require('@koa/router');

const User = require('../../../models/User');

const userRouter = new Router();

userRouter.post('/', async (ctx) => {
  const { email, isToNotifyWhen24HLow } = ctx.request.body;
  const user = { email, isToNotifyWhen24HLow };
  await User.create(user).catch((err) => {
    ctx.throw(400, err);
  });
  ctx.status = 200;
});

module.exports = userRouter;
