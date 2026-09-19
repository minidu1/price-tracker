const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json()); // lets Express understand JSON sent in requests
let products = []; // temporary in-memory "database"


app.get('/', (req, res) => {
  res.send('Server is running');
});

app.post('/products', (req, res) => {
  const { name, url } = req.body;
  const newProduct = { id: products.length + 1, name, url, price: null };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

app.get('/products', (req, res) => {
  res.json(products);
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});