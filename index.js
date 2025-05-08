const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { exec } = require('child_process');

const app = express();
const port = 3000;
const JWT_SECRET = 'your_jwt_secret';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.static(path.join(__dirname)));

// MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "uts2025",
  database: "agro_connect",
});
db.connect((err) => {
  if (err) {
    console.error("MySQL Connection Error:", err);
    return;
  }
  console.log("Connected to MySQL");
});

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];  // Get token from Authorization header

  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;  // Attach user info to request object
    next();  // Proceed to the next route handler
  });
}

// Serve the initial page (change as needed)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "insert_product.html"));
});

// Register Route
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  const query = 'INSERT INTO users (email, password) VALUES (?, ?)';
  db.query(query, [email, hashedPassword], (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Registration failed' });
    }
    res.status(200).json({ success: true });
  });
});

// Login Route
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
    if (err || result.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result[0];
    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT token and send it back to client
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ success: true, token, email: user.email });
  });
});

// Multer Setup for Image Uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload Product Route (protected)
app.post("/upload", authenticateToken, upload.single("image"), (req, res) => {
  const { product_name, category, price, description, contact_number} = req.body;
  const { userId } = req.user;

  if (!req.file) {
    return res.status(400).json({ error: "Image is required" });
  }

  const { originalname, mimetype, buffer } = req.file;

  const query = `
    INSERT INTO products (product_name, category, price, description, contact_number, name, mime_type, data, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [product_name, category, price, description, contact_number, originalname, mimetype, buffer, userId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Failed to upload product" });
    }
    res.json({ productId: result.insertId });
  });
});

// Get All Products (protected)
app.get("/get-products", authenticateToken, (req, res) => {
  const sql = `
    SELECT products.id, product_name, category, price, description, contact_number, users.email AS owner_email, user_id
    FROM products
    JOIN users ON products.user_id = users.id
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Fetch error:", err);
      return res.status(500).json({ error: "Failed to fetch products" });
    }
    res.json(results);  // Send the products as JSON
  });
});

// Serve image from the database or file system
app.get("/image/:id", authenticateToken, (req, res) => {
  const productId = req.params.id;
  
  // Query the database to fetch the image associated with the product
  const sql = "SELECT mime_type, data FROM products WHERE id = ?";
  db.query(sql, [productId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }

    const image = results[0];
    res.setHeader("Content-Type", image.mime_type);  // Set the mime type (e.g., image/jpeg)
    res.send(image.data);  // Send the image data in the response
  });
});

// Delete Product Route (protected)
app.delete("/delete-product/:id", authenticateToken, (req, res) => {
  const productId = req.params.id;
  const { userId } = req.user;  // Get the userId from the JWT token

  // Check if the user is the owner of the product
  const checkOwnershipQuery = "SELECT user_id FROM products WHERE id = ?";
  db.query(checkOwnershipQuery, [productId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Failed to fetch product" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const productOwnerId = results[0].user_id;

    // If the user doesn't own the product, reject the request
    if (userId !== productOwnerId) {
      return res.status(403).json({ error: "Unauthorized to delete this product" });
    }

    // If ownership is confirmed, proceed to delete the product
    const deleteProductQuery = "DELETE FROM products WHERE id = ?";
    db.query(deleteProductQuery, [productId], (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to delete product" });
      }
      res.json({ success: true, message: "Product deleted successfully" });
    });
  });
});


// Start Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
