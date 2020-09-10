const mongoose = require('mongoose');

const { Schema } = mongoose;

const gasPriceSchema = new Schema({
  instant: { type: Schema.Types.Number, required: true },
  fast: { type: Schema.Types.Number, required: true },
  standard: { type: Schema.Types.Number, required: true },
  slow: { type: Schema.Types.Number, required: true },
  timestamp: { type: Schema.Types.Date, required: true },
});

gasPriceSchema.index({ timestamp: -1 });

const GasPrice = mongoose.model('GasPrice', gasPriceSchema);

module.exports = GasPrice;
