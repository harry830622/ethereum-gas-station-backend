const https = require('https');
const Koa = require('koa');
const logger = require('koa-logger');
const bodyParser = require('koa-body');
const cors = require('@koa/cors');
const mongoose = require('mongoose');
const axios = require('axios').default;
const Web3 = require('web3');
const mailgun = require('mailgun-js');

const router = require('./router');

const GasPrice = require('./models/GasPrice');
const GasUsed = require('./models/GasUsed');
const Contract = require('./models/Contract');
const User = require('./models/User');

const {
  PORT = '3000',
  GET_GAS_PRICE_PERIOD_IN_SEC,
  GET_GAS_USED_PERIOD_IN_SEC,
  CHECK_LOWEST_GAS_PERIOD_IN_SEC,
  MONGODB_URI,
  INFURA_API_URL,
  ETHERSCAN_API_KEY,
  MAILGUN_API_KEY,
  MAILGUN_DOMAIN,
} = process.env;

const methodsByContractName = {
  yearn__vault__yCrv: ['deposit', 'withdraw'],
  curve__pool__y: ['add_liquidity', 'remove_liquidity'],
  curveDao__gauge__yCrv: ['deposit', 'withdraw'],
  curveDao__minter: ['mint'],
  uniswap__router: [
    'swapExactETHForTokens',
    'addLiquidityETH',
    'removeLiquidityETH',
  ],
  weth: ['transfer', 'approve'],
  usdt: ['transfer', 'approve'],
  dai: ['transfer', 'approve'],
};

(async () => {
  mongoose.connect(MONGODB_URI);

  const mg = mailgun({ apiKey: MAILGUN_API_KEY, domain: MAILGUN_DOMAIN });

  const server = new Koa();

  server.use(logger());
  server.use(cors());
  server.use(bodyParser());

  server.use(router.routes());

  server.listen(parseInt(PORT, 10));

  const web3 = new Web3(INFURA_API_URL);

  let res;
  res = await Contract.find({}).exec().catch(console.log);
  const contractByName = res.reduce(
    (prev, curr) => ({
      ...prev,
      [curr.name]: curr,
    }),
    {},
  );

  const getGasPrice = async () => {
    res = await axios.get('https://www.gasnow.org/api/v2/gas/price', {
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });
    await GasPrice.create({
      instant: Math.ceil(res.data.data.list[0].gasPrice * 1e-9),
      fast: Math.ceil(res.data.data.list[1].gasPrice * 1e-9),
      standard: Math.ceil(res.data.data.list[2].gasPrice * 1e-9),
      slow: Math.ceil(res.data.data.list[3].gasPrice * 1e-9),
    }).catch(console.log);
  };

  const getGasUsed = async () => {
    await Promise.all(
      Object.entries(methodsByContractName).map(async ([name, methods]) => {
        const contract = contractByName[name];
        const web3Contract = new web3.eth.Contract(
          JSON.parse(contract.abi),
          contract.address,
        );

        const methodBySig = web3Contract.options.jsonInterface.reduce(
          (prev, curr) => {
            if (!methods.includes(curr.name)) {
              return prev;
            }
            return {
              ...prev,
              [curr.signature]: curr.name,
            };
          },
          {},
        );

        const numTxs = 1000;
        res = await axios.get(
          `https://api.etherscan.io/api?module=account&action=txlist&address=${web3Contract.options.address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}&offset=${numTxs}&page=0`,
        );

        const txsByMethod = methods.reduce(
          (prev, curr) => ({
            ...prev,
            [curr]: [],
          }),
          {},
        );
        res.data.result.forEach((tx) => {
          const method = methodBySig[tx.input.slice(0, 10)];
          if (!methods.includes(method)) {
            return;
          }
          txsByMethod[method].push(tx);
        });

        await Promise.all(
          Object.entries(txsByMethod).map(async ([method, txs]) => {
            let sum = 0;
            let count = 0;
            txs.forEach((tx) => {
              if (
                parseInt(tx.timeStamp, 10) <
                Math.ceil(Date.now() / 1000) -
                  parseInt(GET_GAS_USED_PERIOD_IN_SEC, 10)
              ) {
                return;
              }
              sum += parseInt(tx.gasUsed, 10);
              count += 1;
            });
            if (count === 0) {
              txs.forEach((tx) => {
                sum += parseInt(tx.gasUsed, 10);
                count += 1;
              });
            }
            if (count === 0) {
              // TODO: It is very unlikely that things could be this bad, may
              // need a last resort.
              console.log(contract.name, method);
              return;
            }
            const avgGasUsed = Math.ceil(sum / count);
            await GasUsed.create({
              contract: contract._id,
              method,
              amount: avgGasUsed,
            }).catch(console.log);
          }),
        );
      }),
    );
  };

  const sendNotifications = async (gasPrice) => {
    const users = await User.find({}).exec().catch(console.log);
    const emails = users
      .filter((u) => u.isToNotifyWhen24HLow)
      .map((u) => u.email);
    await Promise.all(
      emails.map((email) =>
        new Promise((resolve) => {
          mg.messages().send(
            {
              from: 'Feel the Fee <contact@mg.fee.finance>',
              to: email,
              subject: `⛽ ${gasPrice} Gwei | Time to get some cheap gas!`,
              text: `The gas price now (${gasPrice} Gwei) is the lowest of the last 24 hours!`,
            },
            (err) => {
              if (err) {
                throw err;
              }
              resolve();
            },
          );
        }).catch(console.log),
      ),
    );
  };

  let lowest = 1e9;
  const checkLowestGas = async () => {
    const now = new Date();
    if (now.getHours() === 0) {
      lowest = 1e9;
    }
    const gasPrices = await GasPrice.find({})
      .sort({ createdAt: -1 })
      .limit(
        Math.ceil(CHECK_LOWEST_GAS_PERIOD_IN_SEC / GET_GAS_PRICE_PERIOD_IN_SEC),
      )
      .exec()
      .catch(console.log);
    let isLowest = false;
    gasPrices.forEach((p) => {
      if (p.standard < lowest) {
        lowest = p.standard;
        isLowest = true;
      }
    });
    if (isLowest) {
      sendNotifications(lowest);
    }
  };

  getGasPrice();
  getGasUsed();

  const now = new Date();
  let startTime;
  startTime = new Date(now);
  startTime.setMinutes(now.getMinutes() + 1);
  startTime.setSeconds(0);
  startTime.setMilliseconds(0);
  setTimeout(() => {
    getGasPrice();
    setInterval(getGasPrice, parseInt(GET_GAS_PRICE_PERIOD_IN_SEC, 10) * 1000);
  }, startTime.valueOf() - now.valueOf());

  startTime = new Date(now);
  startTime.setHours(now.getHours() + 1);
  startTime.setMinutes(0);
  startTime.setSeconds(0);
  startTime.setMilliseconds(0);
  setTimeout(() => {
    getGasUsed();
    setInterval(getGasUsed, parseInt(GET_GAS_USED_PERIOD_IN_SEC, 10) * 1000);
  }, startTime.valueOf() - now.valueOf());

  startTime = new Date(now);
  startTime.setHours(now.getHours() + 1);
  startTime.setMinutes(0);
  startTime.setSeconds(0);
  startTime.setMilliseconds(0);
  setTimeout(() => {
    checkLowestGas();
    setInterval(
      checkLowestGas,
      parseInt(CHECK_LOWEST_GAS_PERIOD_IN_SEC, 10) * 1000,
    );
  }, startTime.valueOf() - now.valueOf());
})();
