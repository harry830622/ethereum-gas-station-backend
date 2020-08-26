const mongoose = require('mongoose');

const { Schema } = mongoose;

const contractSchema = new Schema(
  {
    address: { type: Schema.Types.String, required: true, unique: true },
    name: { type: Schema.Types.String, required: true, unique: true },
    abi: { type: Schema.Types.String, required: true },
    displayName: { type: Schema.Types.String },
  },
  { timestamps: true },
);

const Contract = mongoose.model('Contract', contractSchema);

module.exports = Contract;
