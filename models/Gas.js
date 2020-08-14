const mongoose = require('mongoose');

const { Schema } = mongoose;

const gasSchema = new Schema(
  {
    fastest: { type: Schema.Types.Number, required: true },
    fast: { type: Schema.Types.Number, required: true },
    average: { type: Schema.Types.Number, required: true },
    safeLow: { type: Schema.Types.Number, required: true },
    fastestWait: { type: Schema.Types.Number, required: true },
    fastWait: { type: Schema.Types.Number, required: true },
    averageWait: { type: Schema.Types.Number, required: true },
    safeLowWait: { type: Schema.Types.Number, required: true },
  },
  { timestamps: true },
);

const Gas = mongoose.model('Gas', gasSchema);

module.exports = Gas;
