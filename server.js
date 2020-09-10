const Koa = require('koa');
const bodyParser = require('koa-body');
const cors = require('@koa/cors');
const mongoose = require('mongoose');
const axios = require('axios').default;
const winston = require('winston');
const mailgun = require('mailgun-js');

const router = require('./router');

const GasPrice = require('./models/GasPrice');
const Transaction = require('./models/Transaction');
const User = require('./models/User');
const { supportedContracts } = require('./constants');

const {
  NODE_ENV = 'production',
  PORT = '3000',
  MONGODB_URI,
  ETHERSCAN_API_KEY,
  MAILGUN_API_KEY,
  MAILGUN_DOMAIN,
} = process.env;

const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'silly',
  transports: [new winston.transports.Console()],
  format: winston.format.combine(
    winston.format.label(),
    winston.format.timestamp(),
    winston.format.json(),
  ),
});

(async () => {
  try {
    mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useFindAndModify: true,
      useCreateIndex: true,
      useUnifiedTopology: true,
    });

    let res;

    const getGasPrice = async () => {
      logger.info('Fetching current gas price...');

      res = await axios.get('https://www.gasnow.org/api/v2/gas/price');

      logger.debug(JSON.stringify(res.data));
      logger.info('Fetched current gas price');

      logger.info('Saving current gas price...');

      await GasPrice.create({
        instant: Math.ceil(res.data.data.list[0].gasPrice * 1e-9),
        fast: Math.ceil(res.data.data.list[1].gasPrice * 1e-9),
        standard: Math.ceil(res.data.data.list[2].gasPrice * 1e-9),
        slow: Math.ceil(res.data.data.list[3].gasPrice * 1e-9),
        timestamp: new Date(res.data.data.timestamp),
      });

      logger.info('Saved current gas price');
    };

    const maxNumReqsPerSec = 5;
    const getTxs = async () => {
      logger.info('Fetching transactions for supported contracts...');

      const txsByContractName = await supportedContracts
        .reduce((prev, { address, name }, idx) => {
          const result = [...prev];
          if (idx % maxNumReqsPerSec === 0) {
            result.push([]);
          }
          result[result.length - 1].push({ address, name });
          return result;
        }, [])
        .reduce(async (prevPromise, contractsGroup) => {
          const prevResult = await prevPromise;
          await new Promise((resolve) => {
            setTimeout(resolve, 1 * 1000);
          });

          const result = await Promise.all(
            contractsGroup.map(async ({ address, name }) => {
              res = await axios.get(
                `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${ETHERSCAN_API_KEY}`,
              );
              logger.debug(JSON.stringify(res.data));
              logger.debug(
                `Fetched ${res.data.result.length} transactions for ${name}`,
              );
              if (res.data.status === '0') {
                throw new Error(res.data.result);
              }

              return [name, res.data.result];
            }),
          );

          return {
            ...prevResult,
            ...result.reduce(
              (prev, [name, txs]) => ({ ...prev, [name]: txs }),
              {},
            ),
          };
        }, Promise.resolve({}));

      logger.info('Fetched transactions');

      const txsToSave = Object.values(txsByContractName)
        .map((txs) =>
          txs.map(
            ({ hash, from, to, input, gasPrice, gas, gasUsed, timeStamp }) => ({
              hash,
              from,
              to,
              input,
              gas: {
                price: Math.ceil(parseInt(gasPrice, 10) * 1e-9),
                limit: parseInt(gas, 10),
                used: parseInt(gasUsed, 10),
              },
              timestamp: new Date(parseInt(timeStamp, 10) * 1000),
            }),
          ),
        )
        .map((txs) => {
          const now = new Date();
          let txsWithinPeriod = [];
          txs.every((tx) => {
            const isWithinPeriod =
              tx.timestamp.getTime() > now.getTime() - 30 * 60 * 1000;
            if (isWithinPeriod) {
              txsWithinPeriod = [...txsWithinPeriod, tx];
            }
            return isWithinPeriod;
          });
          return txsWithinPeriod;
        })
        .flat();

      logger.info(`Saving ${txsToSave.length} transactions...`);

      await Promise.all(
        txsToSave.map(async ({ hash, from, to, input, gas, timestamp }) => {
          await Transaction.findOneAndUpdate(
            { hash },
            {
              $setOnInsert: {
                from,
                to,
                input,
                gas,
                timestamp,
              },
            },
            { upsert: true },
          ).exec();
        }),
      );

      logger.info('Saved transactions');
    };

    const mg = mailgun({ apiKey: MAILGUN_API_KEY, domain: MAILGUN_DOMAIN });
    const sendNotifications = async (gasPrice) => {
      logger.info('Sending email notifications...');

      const users = await User.find({}).exec();
      const emails = users
        .filter((user) => user.isToNotifyWhen24HLow)
        .map((user) => user.email);
      await Promise.all(
        emails.map(
          (email) =>
            new Promise((resolve) => {
              mg.messages().send(
                {
                  from: 'Feel the Fee <contact@fee.finance>',
                  to: email,
                  subject: `⛽ ${gasPrice.standard} Gwei | Time to get some cheap gas!`,
                  text: `
The standard gas price now (${gasPrice.standard} Gwei) is the lowest within the last 24 hours!

Instant: ${gasPrice.instant} Gwei
Fast: ${gasPrice.fast} Gwei
Standard: ${gasPrice.standard} Gwei
Slow: ${gasPrice.slow} Gwei

Visit https://fee.finance for more info.
`,
                },
                (err) => {
                  if (err) {
                    throw err;
                  }
                  resolve();
                },
              );
            }),
        ),
      );

      logger.info('Sent');
    };

    const checkLowestGas = async () => {
      logger.info('Checking if the gas price is at 24-hour low...');

      const gasPrices = await GasPrice.find({})
        .sort({ timestamp: -1 })
        .limit(24 * 60)
        .exec();
      let lowest = 1e9;
      gasPrices.forEach((gasPrice) => {
        if (gasPrice.standard < lowest) {
          lowest = gasPrice.standard;
        }
      });
      if (gasPrices[0].standard <= lowest) {
        logger.debug(
          `The current standard gas price ${lowest} is at 24-hour low`,
        );
        sendNotifications(gasPrices[0]);
      }

      logger.info('Checked');
    };

    const now = new Date();
    let startTime;
    startTime = new Date(now.getTime());
    startTime.setMinutes(now.getMinutes() + 1);
    startTime.setSeconds(0);
    startTime.setMilliseconds(0);
    setTimeout(() => {
      getGasPrice();
      setInterval(getGasPrice, 60 * 1000);
    }, startTime.valueOf() - now.valueOf());

    startTime = new Date(now.getTime());
    startTime.setMinutes(now.getMinutes() + ((60 - now.getMinutes()) % 10));
    startTime.setSeconds(0);
    startTime.setMilliseconds(0);
    setTimeout(() => {
      getTxs();
      setInterval(getTxs, 10 * 60 * 1000);
    }, startTime.valueOf() - now.valueOf());

    startTime = new Date(now.getTime());
    startTime.setMinutes(now.getMinutes() + ((60 - now.getMinutes()) % 10));
    startTime.setSeconds(0);
    startTime.setMilliseconds(0);
    setTimeout(() => {
      checkLowestGas();
      setInterval(checkLowestGas, 10 * 60 * 1000);
    }, startTime.valueOf() - now.valueOf());

    const server = new Koa();

    server.use(async (ctx, next) => {
      logger.http(ctx.req);
      await next();
      logger.http(ctx.res);
    });

    server.use(cors());
    server.use(bodyParser());
    server.use(router.routes());

    server.listen(parseInt(PORT, 10));
    server.on('error', (err) => {
      logger.error(err);
    });

    logger.info(`Listening on port: ${PORT}...`);
  } catch (err) {
    logger.error(err);
  }
})();
