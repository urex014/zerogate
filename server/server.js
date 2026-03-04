const express = require('express');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const app = express();
const prisma = new PrismaClient();
app.use(cors());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 3. Tell Express to serve the 'uploads' folder publicly
app.use('/uploads', express.static(uploadDir));

const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const name = req.body.name || "Test Item";
    const price = req.body.price || 29.99;
    const quantity = parseInt(req.body.quantity, 10) || 1;

    // 4. Save the file to disk permanently with a unique timestamp
    const uniqueFilename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    fs.writeFileSync(filePath, req.file.buffer);

    // 5. Create the public URL for the database
    // This allows Next.js to fetch the image directly from Node
    const publicImageUrl = `http://localhost:5000/uploads/${uniqueFilename}`;

    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);

    const aiResponse = await axios.post('http://localhost:8000/analyze', formData, {
      headers: formData.getHeaders(),
    });

    const { vector, suggested_tags } = aiResponse.data;

    const product = await prisma.product.create({
      data: {
        name: name,
        price: parseFloat(price),
        imageUrl: publicImageUrl, 
        tags: suggested_tags,
        quantity: quantity,
      },
    });

    const vectorString = `[${vector.join(',')}]`;
    await prisma.$executeRaw`
      UPDATE "Product" 
      SET "featureVector" = ${vectorString}::vector 
      WHERE id = ${product.id}
    `;

    res.json({
      message: "Product successfully tagged and saved!",
      productId: product.id,
      tags: suggested_tags
    });

  } catch (error) {
    console.error("Pipeline Error:", error.message);
    res.status(500).json({ error: "Failed to process the item" });
  }
});
app.get('/recommend/:id', async (req, res) => {
  try {
    const targetId = req.params.id;

    // 1. Get the main product
    const mainProduct = await prisma.product.findUnique({
      where: { id: targetId }
    });

    if (!mainProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // 2. Get the visually similar items
    const similarProducts = await prisma.$queryRaw`
      SELECT id, name, price, "imageUrl", tags
      FROM "Product"
      WHERE id != ${targetId}
      ORDER BY "featureVector" <=> (
        SELECT "featureVector" FROM "Product" WHERE id = ${targetId}
      )
      LIMIT 4;
    `;

    res.json({
      product: mainProduct,
      recommendations: similarProducts
    });

  } catch (error) {
    console.error("Recommendation Error:", error.message);
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

// --- Reverse Image Search Route ---
// POST /search: The Visual Search Endpoint
// POST /search: The Visual Search Endpoint
app.post('/search', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Image required" });

    const form = new FormData();

    // THE FIX: Smartly handle both Memory and Disk storage from Multer
    if (req.file.path) {
      form.append('file', fs.createReadStream(req.file.path));
    } else if (req.file.buffer) {
      // If it's in memory, we pass the raw buffer and force a filename so Python accepts it
      form.append('file', req.file.buffer, { filename: req.file.originalname || 'search_target.jpg' });
    } else {
      throw new Error("Multer configuration error: No buffer or path found.");
    }

    // Ping Python with the STRICT multipart boundaries
    const aiResponse = await axios.post('http://localhost:8000/analyze', form, {
      headers: { ...form.getHeaders() },
    });

    const { vector } = aiResponse.data;

    // Format strictly for pgvector
    const formattedVector = `[${vector.join(',')}]`;

    // Mathematical Search
    const matches = await prisma.$queryRaw`
      SELECT 
        id, 
        name, 
        price, 
        "imageUrl", 
        tags,
        1 - ("featureVector" <=> ${formattedVector}::vector) as similarity
      FROM "Product"
      WHERE "featureVector" IS NOT NULL
      ORDER BY "featureVector" <=> ${formattedVector}::vector
      LIMIT 6;
    `;

    // Clean up only if a physical file was created
    if (req.file.path) {
      fs.unlinkSync(req.file.path);
    }

    res.json({ matches });

  } catch (error) {
    console.error("Search_Engine_Failure:", error.message || error);
    res.status(500).json({ error: "Failed to query vector database", details: error.message });
  }
});

// GET /search/text: Standard Text Database Query
app.get('/search/text', async (req, res) => {
  try {
    const { q } = req.query;

    // If query is empty, return empty array
    if (!q || q.trim() === '') {
      return res.json({ matches: [] });
    }

    // Mathematical Search: ILIKE %query%
    const matches = await prisma.product.findMany({
      where: {
        name: {
          contains: q,
          mode: 'insensitive', // Makes 'jacket' match 'Jacket'
        },
      },
      take: 12, // Limit results to prevent UI overload
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ matches });

  } catch (error) {
    console.error("Text_Search_Failure:", error.message || error);
    res.status(500).json({ error: "Failed to query database" });
  }
});

// POST: Save shipping data securely off-chain during checkout
app.post('/fulfillment/save', async (req, res) => {
  try {
    const { itemId, address } = req.body;

    await prisma.product.update({
      where: { id: parseInt(itemId) },
      data: { shippingAddress: address }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Fulfillment_Save_Error:", error);
    res.status(500).json({ error: "Failed to secure shipping telemetry" });
  }
});

// GET: Retrieve shipping data for the seller
app.get('/fulfillment/:itemId', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.itemId) },
      select: { shippingAddress: true }
    });

    res.json({ address: product?.shippingAddress || "No address provided" });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve address" });
  }
});

app.listen(5000, () => console.log('Node Orchestrator running on port 5000'));