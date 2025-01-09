const mongoose = require("mongoose");

const ammunitionSchema = new mongoose.Schema({
  ammunitionId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [".22", ".38", ".338", ".50"],
    required: true,
    default: ".22",
  },
  damage: {
    type: Number,
    required: true,
    default: 1,
  },
});

module.exports = mongoose.model("Ammunition", ammunitionSchema);
