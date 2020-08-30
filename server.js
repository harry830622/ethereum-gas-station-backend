const Koa = require('koa');
const logger = require('koa-logger');
const bodyParser = require('koa-body');
const cors = require('@koa/cors');
const mongoose = require('mongoose');
const axios = require('axios').default;
const Web3 = require('web3');

const router = require('./router');

const Gas = require('./models/Gas');
const Contract = require('./models/Contract');

const {
  PORT = '3000',
  GET_GAS_FREQ_IN_SEC,
  MONGODB_URI,
  INFURA_API_URL,
  ETHGAS_API_KEY,
  ETHERSCAN_API_KEY,
} = process.env;

(async () => {
  const startTime = Date.now();

  mongoose.connect(MONGODB_URI);

  const server = new Koa();

  server.use(logger());
  server.use(cors());
  server.use(bodyParser());

  server.use(router.routes());

  server.listen(parseInt(PORT, 10));

  const web3 = new Web3(INFURA_API_URL);

  let res;
  res = await Contract.find({}).exec();
  const contractByName = res.reduce(
    (prev, curr) => ({
      ...prev,
      [curr.name]: new web3.eth.Contract(JSON.parse(curr.abi), curr.address),
    }),
    {},
  );

  const getGas = async () => {
    res = await axios.get(
      `https://ethgasstation.info/api/ethgasAPI.json?api-key=${ETHGAS_API_KEY}`,
    );
    const price = {
      fastest: res.data.fastest / 10,
      fast: res.data.fast / 10,
      average: res.data.average / 10,
      safeLow: res.data.safeLow / 10,
    };
    const waitTimeInSec = {
      fastest: res.data.fastestWait * 60,
      fast: res.data.fastWait * 60,
      average: res.data.avgWait * 60,
      safeLow: res.data.safeLowWait * 60,
    };

    const limitByMethodByContractName = {
      yearn__vault__yCrv: {
        deposit: 0,
        withdraw: 0,
      },
      curve__pool__y: {
        add_liquidity: 0,
        remove_liquidity: 0,
      },
      curveDao__gauge__yCrv: {
        deposit: 0,
        withdraw: 0,
      },
      curveDao__minter: {
        mint: 0,
      },
    };
    await Promise.all(
      Object.entries(limitByMethodByContractName).map(
        async ([name, limitByMethod]) => {
          const contract = contractByName[name];
          res = await axios.get(
            `https://api.etherscan.io/api?module=account&action=txlist&address=${contract.options.address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}&offset=100&page=1`,
          );
          // TODO: Throw an error if no transaction interacts with the method.
          // Since it is assumed that the latest 100 transactions must have
          // interacted with the given methods.
          Object.keys(limitByMethod).every((method) => {
            const sig = contract.options.jsonInterface.find(
              (j) => j.name === method,
            ).signature;
            return res.data.result.some((tx) => {
              if (tx.input.indexOf(sig) === 0) {
                limitByMethodByContractName[name][method] = parseInt(
                  tx.gasUsed,
                  10,
                );
                return true;
              }
              return false;
            });
          });
        },
      ),
    );

    const gas = new Gas({
      price,
      waitTimeInSec,
      limit: limitByMethodByContractName,
    });
    await gas.save();
  };

  res = await Gas.findOne({}).sort({ createdAt: -1 }).exec();
  let timeout = 0;
  if (res) {
    timeout = startTime - Date.parse(res.createdAt);
  }
  setTimeout(() => {
    getGas();
    setInterval(getGas, parseInt(GET_GAS_FREQ_IN_SEC, 10) * 1000);
  }, timeout);
})();
