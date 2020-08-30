# Feel the Fee Backend

## How to Run?
1. Setup `.env.prod` first.
```
MONGODB_URI=
INFURA_API_URL=
ETHERSCAN_API_KEY=
GET_GAS_PRICE_FREQ_IN_SEC=
GET_GAS_USED_FREQ_IN_SEC=
```
1. Install the packages and populate the data into the database.
```
yarn
DOTENV_CONFIG_PATH=./.env.prod node -r dotenv/config populateContracts.js
```
1. Run
```
npm start
```

## APIs

### GET /api/gas-price
Return the gas price records sort by time in descending order.
```
[
  {
    fast: 241,
    instant: 256,
    slow: 110,
    standard: 241,
    timestamp: 1598808097
  },
  ...
]
```

### GET /api/gas-used
Return the gas used records sort by time in descending order.
```
[
  {
    amount: 719834,
    contractName: "curve__pool__y",
    method: "add_liquidity",
    timestamp: 1598808127
  },
  ...
]
```

## How to Add New Contracts?
1. Add new contracts in `populateContracts.js`, and then run it to populate new
contracts into the database.
1. Add corresponding entries to `methodsByContractName` in `server.js`.
