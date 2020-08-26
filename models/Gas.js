const mongoose = require('mongoose');

const { Schema } = mongoose;

const gasSchema = new Schema(
  {
    price: { type: Schema.Types.Map, of: Schema.Types.Number, required: true },
    limit: {
      type: Schema.Types.Map,
      of: { type: Schema.Types.Map, of: Schema.Types.Number },
      required: true,
    },
    waitTimeInSec: {
      type: Schema.Types.Map,
      of: Schema.Types.Number,
      required: true,
    },
  },
  { timestamps: true },
);

const Gas = mongoose.model('Gas', gasSchema);

module.exports = Gas;
