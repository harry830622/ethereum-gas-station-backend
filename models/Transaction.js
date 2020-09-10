const mongoose = require('mongoose');

const { Schema } = mongoose;

const transactionSchema = new Schema({
  hash: { type: Schema.Types.String, required: true, unique: true },
  from: { type: Schema.Types.String, required: true },
  to: { type: Schema.Types.String, required: true },
  input: { type: Schema.Types.String, required: true },
  gas: {
    price: { type: Schema.Types.Number, required: true },
    limit: { type: Schema.Types.Number, required: true },
    used: { type: Schema.Types.Number, required: true },
  },
  timestamp: { type: Schema.Types.Date, required: true, expires: '1d' },
});

transactionSchema.index({ timestamp: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
