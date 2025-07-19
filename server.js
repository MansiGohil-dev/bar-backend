const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const JsBarcode = require('jsbarcode');
const { createCanvas } = require('canvas');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL  ,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));
app.use(express.json());

// MongoDB Atlas connection
mongoose
  .connect(process.env.MONGODB_URI, { retryWrites: true, w: 'majority' })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, trim: true },
  barcode: { type: String },
  barcodeNumber: { type: String }, // Add barcode number field
});

const Product = mongoose.model('Product', productSchema);

// Generate barcode as PNG data URL with name and number
// const generateBarcode = (name, barcodeNumber) => {
//   const canvas = createCanvas(200, 100); // Adjust size as needed
//   const ctx = canvas.getContext('2d');

//   // Draw the barcode
//   JsBarcode(canvas, barcodeNumber, {
//     format: 'CODE128',
//     displayValue: false, // Hide the default barcode number
//     width: 2,
//     height: 60,
//     margin: 10,
//   });

//   // Add product name above barcode
//   ctx.fillStyle = '#000000';
//   ctx.font = '16px Arial';
//   ctx.textAlign = 'center';
//   ctx.fillText(name, canvas.width / 2, 20);

//   // Add barcode number below barcode
//   ctx.font = '12px Arial';
//   ctx.fillText(barcodeNumber, canvas.width / 2, 90);

//   // Convert to data URL and return
//   const dataURL = canvas.toDataURL('image/png');
//   console.log('Generated barcode dataURL:', dataURL.substring(0, 50) + '...'); // Log to verify content
//   return dataURL;
// };
const generateBarcode = (name, barcodeNumber) => {
  const canvasWidth = 300;
  const canvasHeight = 150;
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Fill background white (optional, improves PNG appearance)
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Product Name (Top Centered)
  ctx.fillStyle = '#000';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(name, canvasWidth / 2, 25);

  // Barcode (Middle)
  const barcodeCanvas = createCanvas(280, 60);
  JsBarcode(barcodeCanvas, barcodeNumber, {
    format: 'CODE128',
    width: 2,
    height: 60,
    displayValue: false,
    margin: 0,
  });
  ctx.drawImage(barcodeCanvas, (canvasWidth - barcodeCanvas.width) / 2, 40);

  // Barcode Number (Bottom Centered)
  ctx.font = '16px Arial';
  ctx.fillText(barcodeNumber, canvasWidth / 2, 130);

  return canvas.toDataURL('image/png');
};

// Create a new product
app.post('/api/products', async (req, res) => {
  try {
    const { name, price, description } = req.body;
    if (!name || price == null) {
      return res.status(400).json({ error: 'Name and price are required' });
    }
    if (price < 0) {
      return res.status(400).json({ error: 'Price cannot be negative' });
    }

    // Generate a sample 13-digit barcode number
    const barcodeNumber = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();

    const product = new Product({ name, price, description });
    await product.save();

    // Generate barcode with name and custom barcode number
    const barcode = generateBarcode(name, barcodeNumber);
    product.barcode = barcode;
    product.barcodeNumber = barcodeNumber;
    await product.save();

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Update a product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, price, description } = req.body;
    if (!name || price == null) {
      return res.status(400).json({ error: 'Name and price are required' });
    }
    if (price < 0) {
      return res.status(400).json({ error: 'Price cannot be negative' });
    }

    const productData = { name, price, description };
    const barcodeNumber = req.body.barcodeNumber || Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
    const barcode = generateBarcode(name, barcodeNumber);

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...productData, barcode, barcodeNumber },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete a product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));