const mongoose = require('mongoose');
const axios = require('axios').default;

const Contract = require('./models/Contract');

const { MONGODB_URI, ETHERSCAN_API_KEY } = process.env;

const contracts = [
  {
    address: '0xbbc81d23ea2c3ec7e56d39296f0cbb648873a5d3',
    name: 'curve__pool__y',
  },
  {
    address: '0x5dbcF33D8c2E976c6b560249878e6F1491Bca25c',
    name: 'yearn__vault__yCrv',
  },
  {
    address: '0xFA712EE4788C042e2B7BB55E6cb8ec569C4530c1',
    name: 'curveDao__gauge__yCrv',
  },
  {
    address: '0xd061D61a4d941c39E5453435B6345Dc261C2fcE0',
    name: 'curveDao__minter',
  },
];

(async () => {
  mongoose.connect(MONGODB_URI);

  await Promise.all(
    contracts.map(({ address, name }) =>
      Contract.findOne({ address })
        .exec()
        .then((q) => {
          if (q) {
            return Promise.resolve(q);
          }
          return axios
            .get(
              `https://api.etherscan.io/api?module=contract&action=getabi&address=${address}&apikey=${ETHERSCAN_API_KEY}`,
            )
            .then((res) => {
              const contract = new Contract({
                name,
                address,
                abi: res.data.result,
              });
              return contract.save();
            });
        }),
    ),
  );

  mongoose.disconnect();
})();
