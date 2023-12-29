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

    app.get('/users', async(req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result);
    })

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

    // reviews api
    app.get('/reviews', async(req, res) => {
        const result = await reviewCollection.find().toArray();
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


