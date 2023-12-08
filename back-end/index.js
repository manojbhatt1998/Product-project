const express = require("express");
require('./db/config');
const cors = require("cors");
const { validateEmail } = require("./validation");
const Products = require('./db/product');
const users = require('./db/user');
const jwt = require('jsonwebtoken');
const jwtkey = 'e-comm';
const app = express();
const bodyParser = require('body-parser');


app.use(express.json());
app.use(cors());

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});


// register api
app.post('/register' ,async (req, res) => {
  // Check if the email property exists in req.body
  if (!req.body.email) {
    return res.status(400).send('Email address is required');
  }

  // Remove spaces from the email in req.body
  req.body.email = req.body.email.trim();

  // Check if the email is valid
  if (!validateEmail(req.body.email)) {
    return res.status(400).send('Invalid email address');
  }

  // Check if email already exists
  const existingUser = await users.findOne({ email: req.body.email });
  if (existingUser) {
    return res.status(400).send('Email already exists');
  }

  // Use the User model to create a new user
  let user = new users(req.body);
  let result = await user.save();

  // Remove password from the result before sending it in the response
  result = result.toObject();
  delete result.password;
  if (result) {
    jwt.sign({ result }, jwtkey, { expiresIn: '3h' }, (err, token) => {
      if (err) {
        res.status(500).send({ result: "Something went wrong. Please try after some time" });
      }
      res.send({ result, auth: token })
    })
  }
});

//login api
app.post('/login' ,async (req, res) => {
  console.log("email", req.body.email);
  console.log("password", req.body.password);

  if (req.body.password && req.body.email) {
    // Remove spaces from the email in req.body
    req.body.email = req.body.email.trim();

    // Check if the email is valid
    if (!validateEmail(req.body.email)) {
      return res.status(400).send('Invalid email address');
    }

    let result = await users.findOne(req.body); //.select("password")
    if (result) {
      jwt.sign({ result }, jwtkey, { expiresIn: '3h' }, (err, token) => {
        if (err) {
          res.status(500).send({ result: "Something went wrong. Please try after some time" });
        }

        // Create a new object without the password field
        const userWithoutPassword = {
          _id: result._id,
          email: result.email,
          // Add other fields you want to include in the response
        };

        res.send({ result: userWithoutPassword, auth: token });
        console.log("result--", userWithoutPassword);
      })
    } else {
      return res.status(400).send("No user found");
    }
  } else {
    res.send("No user found");
  }
});

//Add product api
app.post("/add-product", verifyToken , async (req, res) => {
  try {
    let newProduct = new Products(req.body);
    let result = await newProduct.save();
    res.send(result);
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).send("Internal Server Error");
  }
});

//Get list product api
app.get("/list-product", verifyToken ,async (req, res) => {
  try {
    const products = await Products.find();

    if (products.length > 0) {
      res.send(products);
    } else {
      res.send("No product found");
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Internal Server Error");
  }
});

//Delete product api
app.delete('/product/:id', verifyToken , async (req, res) => {
  try {
    const result = await Products.deleteOne({ _id: req.params.id });

    if (result.deletedCount > 0) {
      res.send({ message: 'Product deleted successfully' });
    } else {
      res.status(404).send({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

//Get Single Product
app.get("/product/:id", verifyToken ,async (req, res) => {
  //console.log(req.params.id);
  try {
    const product = await Products.findOne({ _id: req.params.id });
    if (product) {
      res.send(product);
    } else {
      res.status(404).send("No product found");
    }
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).send("Internal Server Error");
  }
});

//Update product
app.put("/update/:id", verifyToken , async (req, res) => {
  try {
    const result = await Products.updateOne(
      { _id: req.params.id },
      { $set: req.body }
    );

    if (result) {
      const updatedProduct = await Products.findOne({ _id: req.params.id });
      res.send({ message: 'Product updated successfully', updatedProduct });
    } else {
      res.status(404).send({ message: 'No changes made or product not found' });
    }
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});



//search api
app.get("/search/:key" , async (req, res) => {
  try {
    let result = await Products.find({
      "$or": [
        { name: { $regex: new RegExp(req.params.key, 'i') } },
        { price: { $regex: new RegExp(req.params.key, 'i') } },
        { category: { $regex: new RegExp(req.params.key, 'i') } }
      ]
    });
    res.json(result);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//token function
function verifyToken(req, res, next) {
  let token = req.headers['authorization'];

  if (token) {
    token = token.split(' ')[1];
    console.log("token---", token);

    jwt.verify(token, jwtkey, (err, valid) => {
      if (err) {
        // If the token is not valid, send a 401 Unauthorized status
        res.status(401).send({ result: "Invalid token" });
      } else {
        // If the token is valid, proceed to the next middleware
        next();
      }
    });
  } else {
    // If no token is present, send a 401 Unauthorized status
    res.status(401).send({ result: "Token missing in the request headers" });
  }
}



app.listen(5000, () => {
  console.log("Running port 5000");
});
