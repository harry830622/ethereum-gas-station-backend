const mongoose = require('mongoose');
const axios = require('axios').default;

const Contract = require('./models/Contract');
const { supportedContracts } = require('./constants');

const { MONGODB_URI, ETHERSCAN_API_KEY } = process.env;

(async () => {
  try {
    mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useFindAndModify: true,
      useCreateIndex: true,
      useUnifiedTopology: true,
    });

    let res;

    // Since there is a 5 requests per second rate limit on Etherscan API, the
    // contracts are first splited into groups that contain at most 5 contracts
    // each
    const maxNumReqsPerSec = 5;
    const contracts = await supportedContracts
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
              `https://api.etherscan.io/api?module=contract&action=getabi&address=${address}&apikey=${ETHERSCAN_API_KEY}`,
            );
            if (res.data.status === '0') {
              throw new Error(res.data.result);
            }
            return {
              address,
              name,
              abi: res.data.result,
            };
          }),
        );

        return [...prevResult, ...result.flat()];
      }, Promise.resolve([]));

    await Promise.all(
      contracts.map(({ address, name, abi }) =>
        Contract.findOneAndUpdate(
          { address: address.toLowerCase() },
          { name, abi },
          { upsert: true },
        ).exec(),
      ),
    );

    mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
})();
