const mongoose = require('mongoose');

const { Schema } = mongoose;

const gasUsedSchema = new Schema(
  {
    contract: { type: Schema.Types.ObjectId, ref: 'Contract', required: true },
    method: { type: Schema.Types.String, required: true },
    amount: { type: Schema.Types.Number, required: true },
  },
  { timestamps: true },
);

gasUsedSchema.index({ createdAt: -1 });

const GasUsed = mongoose.model('GasUsed', gasUsedSchema);

module.exports = GasUsed;
