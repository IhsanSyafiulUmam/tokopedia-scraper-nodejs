const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    price: { type: String, required: true },
    original_price: { type: String },
    countReview: { type: Number },
    rating: { type: Number },
    url: { type: String, required: true },
    imageUrl: { type: String },
    preorder: { type: Boolean },
    discountPercentage: { type: Number },
    wishlist: { type: Boolean },
    shop: {
        id: { type: Number },
        url: { type: String },
        name: { type: String },
        goldmerchant: { type: Boolean },
        official: { type: Boolean },
        reputation: { type: String },
        location: { type: String }
    }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
