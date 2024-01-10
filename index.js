const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



// middleware
app.use(cors());
app.use(express.json());

// verifyJWT
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if(!authorization){
       return res.status(401).send({error: true, message:"unauthorized access"})
    }
    // bearer token
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if(err){
          return res.status(401).send({error: true, message:"unauthorized access"})
        }
        req.decoded = decoded;
        next();
    })
}







const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hkduy2w.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const productCollection = client.db('sarker_shopDB').collection('products');
    const reviewCollection = client.db('sarker_shopDB').collection('reviews');
    const cartCollection = client.db('sarker_shopDB').collection('carts');
    const userCollection = client.db('sarker_shopDB').collection('users');



    // JWT 
    app.post('/jwt', (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
        res.send({ token });
    })

    // verifyAdmin middleware
     const verifyAdmin = async(req, res, next) => {
        const email = req.decoded.email;
        const query = {email: email};
        const user = await userCollection.findOne(query);
        if(user?.role !== 'admin'){
          return res.status(403).send({error: true, message: 'forbidden request'})
        }
        next();
     }


    // users api
    app.post('/users', async(req, res) => {
        const user = req.body;
        const query = { email: user.email };
        const existingUser = await userCollection.findOne(query);
        if(existingUser){
          return res.send({message : "User already exists"})
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
    })

    // use verifyJWT before using verifyAdmin
    app.get('/users', verifyJWT, verifyAdmin, async(req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result);
    })

    // get admin api
    app.get('/users/admin/:email', verifyJWT, async(req, res) => {
      const email = req.params.email;
      const query = {email: email};
      if(req.decoded.email !== email){
        res.send({admin: false})
      }
      const user = await userCollection.findOne(query);
      const result = {admin: user?.role === 'admin'};
      res.send(result)
  })

  // create admin api
    app.patch('/users/admin/:id', async(req, res) => {
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updateDoc = {
          $set: {
            role: "admin"
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc );
        res.send(result);
    })

    app.delete('/users/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await userCollection.deleteOne(query);
        res.send(result);
    })

    //  products api
    app.get('/products', async(req, res) => {
        const result = await productCollection.find().toArray();
        res.send(result);
    });
    // porduct upload
    app.post('/products', verifyJWT, verifyAdmin, async(req, res) => {
        const product = req.body;
        const result = await productCollection.insertOne(product);
        res.send(result);
    })
    // product delete 
    app.delete('/products/:id', verifyJWT, verifyAdmin, async (req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await productCollection.deleteOne(query);
        res.send(result);
    })
    // get single product
    app.get('/products/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await productCollection.findOne(query);
        res.send(result);
    })
    // update a single product
    app.put('/products/:id', async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const options = { upsert: true };
      const updateProduct = req.body;
      const product = {
        $set: {
            // image: updateProduct.image,
            productName: updateProduct.productName,
            brand: updateProduct.brand,
            category: updateProduct.category,
            price: updateProduct.price,
            reviews: updateProduct.reviews,
            description: updateProduct.description,
        },
      };
      const result = await productCollection.updateOne(filter, product, options);
      res.send(result);
    })

    // reviews api
    app.get('/reviews', async(req, res) => {
        const result = await reviewCollection.find().toArray();
        res.send(result);
    })
    // review post
    app.post('/reviews', async(req, res) => {
        const review = req.body;
        const result = await reviewCollection.insertOne(review);
        res.send(result);
    })

    // cart collection api
    app.get('/carts', verifyJWT, async(req, res) => {
        const email = req.query.email;
        if(!email){
           res.send([])
        }

        const decodedEmail = req.decoded.email;
        if(email !== decodedEmail){
          return res.status(403).send({error: true, message:"forbidden access"})
        }

        const query = {email: email}
        const result = await cartCollection.find(query).toArray();
        res.send(result);
    })

    app.post('/carts', async(req, res) => {
        const item = req.body;
        // console.log(item);
        const result = await cartCollection.insertOne(item);
        res.send(result);
    })

    app.delete('/carts/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await cartCollection.deleteOne(query);
        res.send(result);
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);






app.get("/", (req, res) => {
    res.send('Server is running...')
})

app.listen( port, () => {
    console.log(`Server is running on port ${port}`)
})


