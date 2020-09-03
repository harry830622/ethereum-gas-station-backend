const mongoose = require('mongoose');
const axios = require('axios').default;

const Contract = require('./models/Contract');

const { MONGODB_URI, ETHERSCAN_API_KEY } = process.env;

const contracts = [
  {
    address: '0x5dbcF33D8c2E976c6b560249878e6F1491Bca25c',
    name: 'yearn__vault__yCrv',
  },
  {
    address: '0xe1237aA7f535b0CC33Fd973D66cBf830354D16c7',
    name: 'yearn__vault__weth',
  },
  {
    address: '0xBA2E7Fed597fd0E3e70f5130BcDbbFE06bB94fe1',
    name: 'yearn__vault__yfi',
  },
  {
    address: '0x2994529C0652D127b7842094103715ec5299bBed',
    name: 'yearn__vault__yBCrv',
  },
  {
    address: '0x7Ff566E1d69DEfF32a7b244aE7276b9f90e9D0f6',
    name: 'yearn__vault__crvRenWSBtc',
  },
  {
    address: '0xACd43E627e64355f1861cEC6d3a6688B31a6F952',
    name: 'yearn__vault__dai',
  },
  {
    address: '0x37d19d1c4E1fa9DC47bD1eA12f742a0887eDa74a',
    name: 'yearn__vault__tusd',
  },
  {
    address: '0x597aD1e0c13Bfe8025993D9e79C69E1c0233522e',
    name: 'yearn__vault__usdc',
  },
  {
    address: '0x2f08119C6f07c006695E079AAFc638b8789FAf18',
    name: 'yearn__vault__usdt',
  },
  {
    address: '0x29E240CFD7946BA20895a7a02eDb25C210f9f324',
    name: 'yearn__vault__aLink',
  },
  {
    address: '0xbbc81d23ea2c3ec7e56d39296f0cbb648873a5d3',
    name: 'curve__pool__y',
  },
  {
    address: '0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06',
    name: 'curve__pool__compound',
  },
  {
    address: '0xA50cCc70b6a011CffDdf45057E39679379187287',
    name: 'curve__pool__pax',
  },
  {
    address: '0xb6c057591E073249F2D9D88Ba59a46CFC9B59EdB',
    name: 'curve__pool__bUsd',
  },
  {
    address: '0xFCBa3E75865d2d561BE8D220616520c171F12851',
    name: 'curve__pool__sUsd',
  },
  {
    address: '0x73aB2Bd10aD10F7174a1AD5AFAe3ce3D991C5047',
    name: 'curve__pool__renBtc',
  },
  {
    address: '0xAEade605D01FE9a8e9C4B3AA0130A90d62167029',
    name: 'curve__pool__sBtc',
  },
  {
    address: '0xFA712EE4788C042e2B7BB55E6cb8ec569C4530c1',
    name: 'curveDao__gauge__yCrv',
  },
  {
    address: '0x7ca5b0a2910B33e9759DC7dDB0413949071D7575',
    name: 'curveDao__gauge__cCrv',
  },
  {
    address: '0x69Fb7c45726cfE2baDeE8317005d3F94bE838840',
    name: 'curveDao__gauge__yBCrv',
  },
  {
    address: '0xA90996896660DEcC6E997655E065b23788857849',
    name: 'curveDao__gauge__crvPlain3AndSUsd',
  },
  {
    address: '0x64E3C23bfc40722d3B649844055F1D51c1ac041d',
    name: 'curveDao__gauge__yPaxCrv',
  },
  {
    address: '0xB1F2cdeC61db658F091671F5f199635aEF202CAC',
    name: 'curveDao__gauge__crvRenWBtc',
  },
  {
    address: '0x705350c4BcD35c9441419DdD5d2f097d7a55410F',
    name: 'curveDao__gauge__crvRenWSBtc',
  },
  {
    address: '0xd061D61a4d941c39E5453435B6345Dc261C2fcE0',
    name: 'curveDao__minter',
  },
  {
    address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    name: 'uniswap__router',
  },
  {
    address: '0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd',
    name: 'sushiswap__pool',
  },
  {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    name: 'weth',
  },
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    name: 'usdt',
  },
  {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    name: 'dai',
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
              return Contract.create({
                name,
                address,
                abi: res.data.result,
              });
            });
        }),
    ),
  ).catch(console.error);

  mongoose.disconnect();
})();
