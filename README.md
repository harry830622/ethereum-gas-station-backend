# Feel the Fee Backend

## How to Run?
1. Setup `.env.prod` first
```
MONGODB_URI=
INFURA_API_URL=
ETHERSCAN_API_KEY=
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
```
1. Install the packages and populate the data into the database
```
yarn
DOTENV_CONFIG_PATH=./.env.prod node -r dotenv/config populateContracts.js
```
1. Run
```
npm start
```

## APIs

### GET /api/contract
Return the contracts

### GET /api/transaction
Return the transactions sort by time in descending order

### GET /api/gas-price
Return the gas prices sort by time in descending order

## How to Add New Contracts?
Just add new contracts in `populateContracts.js` and then run it to populate new
contracts into the database
