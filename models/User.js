const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    email: { type: Schema.Types.String, required: true, unique: true },
    isToNotifyWhen24HLow: { type: Schema.Types.Boolean },
  },
  { timestamps: true },
);

const User = mongoose.model('User', userSchema);

module.exports = User;
