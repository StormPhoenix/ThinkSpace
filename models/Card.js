const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: '未命名卡片'
  },
  type: {
    type: String,
    enum: ['custom', 'stock'],
    default: 'custom'
  },
  attributes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  stockCode: {
    type: String,
    default: null
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
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
      // 转换 categoryId 为字符串（如果是 ObjectId）
      if (ret.categoryId && ret.categoryId.toString) {
        ret.categoryId = ret.categoryId.toString();
      }
      return ret;
    }
  }
});

module.exports = mongoose.model('Card', cardSchema);

