const mongoose = require('mongoose');
const axios = require('axios').default;

const Contract = require('./models/Contract');

const { MONGODB_URI, ETHERSCAN_API_KEY } = process.env;

mongoose.connect(MONGODB_URI);

const [addr, name, displayName] = process.argv.slice(2);

(async () => {
  const res = await axios.get(
    `https://api.etherscan.io/api?module=contract&action=getabi&address=${addr}&apikey=${ETHERSCAN_API_KEY}`,
  );
  const contract = new Contract({
    address: addr,
    abi: res.data.result,
    name,
    displayName,
  });
  await contract.save();
  mongoose.disconnect();
})();
