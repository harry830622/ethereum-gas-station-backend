const https = require('https');
const Koa = require('koa');
const logger = require('koa-logger');
const bodyParser = require('koa-body');
const cors = require('@koa/cors');
const mongoose = require('mongoose');
const axios = require('axios').default;
const Web3 = require('web3');

const router = require('./router');

const GasPrice = require('./models/GasPrice');
const GasUsed = require('./models/GasUsed');
const Contract = require('./models/Contract');

const {
  PORT = '3000',
  GET_GAS_PRICE_FREQ_IN_SEC,
  GET_GAS_USED_FREQ_IN_SEC,
  MONGODB_URI,
  INFURA_API_URL,
  ETHERSCAN_API_KEY,
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
    const gasPrice = new GasPrice({
      instant: Math.ceil(res.data.data.list[0].gasPrice * 1e-9),
      fast: Math.ceil(res.data.data.list[1].gasPrice * 1e-9),
      standard: Math.ceil(res.data.data.list[2].gasPrice * 1e-9),
      slow: Math.ceil(res.data.data.list[3].gasPrice * 1e-9),
    });
    await gasPrice.save();

    setTimeout(() => {
      getGasPrice();
    }, parseInt(GET_GAS_PRICE_FREQ_IN_SEC, 10) * 1000);
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
        const now = Date.now();
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
                Math.ceil(now / 1000) - parseInt(GET_GAS_USED_FREQ_IN_SEC, 10)
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
            const gasUsed = new GasUsed({
              contract: contract._id,
              method,
              amount: avgGasUsed,
            });
            await gasUsed.save();
          }),
        );
      }),
    );

    setTimeout(() => {
      getGasUsed();
    }, parseInt(GET_GAS_USED_FREQ_IN_SEC, 10) * 1000);
  };

  getGasPrice();
  getGasUsed();
})();
