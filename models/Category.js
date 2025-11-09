const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: '未命名分类'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false, // 使用自定义的 createdAt，不使用 Mongoose 的 timestamps
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

module.exports = mongoose.model('Category', categorySchema);

