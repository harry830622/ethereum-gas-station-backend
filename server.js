const Koa = require('koa');
const logger = require('koa-logger');
const bodyParser = require('koa-body');
const mongoose = require('mongoose');
const axios = require('axios').default;

const router = require('./router');

const Gas = require('./models/Gas');

const { PORT, GET_GAS_RATE_IN_SEC, MONGODB_URI, ETHGAS_API_KEY } = process.env;

mongoose.connect(MONGODB_URI);

const server = new Koa();

server.use(logger());
server.use(bodyParser());

server.use(router.routes());

const port = PORT ? parseInt(PORT, 10) : 5000;
server.listen(port);

const getGas = () => {
  axios
    .get(
      `https://ethgasstation.info/api/ethgasAPI.json?api-key=${ETHGAS_API_KEY}`,
    )
    .then((res) => {
      const gas = new Gas({
        fastest: res.data.fastest / 10,
        fast: res.data.fast / 10,
        average: res.data.average / 10,
        safeLow: res.data.safeLow / 10,
        fastestWait: res.data.fastestWait * 60,
        fastWait: res.data.fastWait * 60,
        averageWait: res.data.avgWait * 60,
        safeLowWait: res.data.safeLowWait * 60,
      });
      return gas.save();
    })
    .then(() => {
      setTimeout(() => {
        getGas();
      }, parseInt(GET_GAS_RATE_IN_SEC, 10) * 1000);
    });
};

getGas();
