const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

//middleware

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gniuvqv.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next){
   
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send('unauthorize access');
    }
    const token =  authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'forbidden access'})
        }
        req.decoded = decoded;
        next();
    })
}

async function run(){
    try{
        const productCollections = client.db('reusableProductSell').collection('sellProduct')
        const categoryCollections = client.db('reusableProductSell').collection('category')
        const reservationCollections = client.db('reusableProductSell').collection('reservation')
        const usersCollections = client.db('reusableProductSell').collection('users')
         
                     // get all categories and show HOME page
          app.get("/categories", async (req, res) => {
              const query = {};
              const categories = await categoryCollections.find(query).toArray();
              res.send(categories);
          });

                    // get single category product by name and show dynamic route
            app.get("/categories/:name", async (req, res) => {
                const name = req.params.name;
                const query = { categoryName: name };
                const result = await productCollections.find(query).toArray();
                res.send(result);
            });

                    //reservation/bookings post by and add database
        app.post('/reservation', async (req, res) => {
            const reservation = req.body
            console.log(reservation);
            const result = await reservationCollections.insertOne(reservation);
            res.send(result);
        })

                    //get reservation data and send client side
        app.get('/reservation', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if(email !== decodedEmail){
                return res.status(403).send({message: 'forbidden access'});
            }
            const query = { email: email };
            const reservation = await reservationCollections.find(query).toArray();
            res.send(reservation);
        })


        app.get('/jwt', async(req , res) => {
            const email = req.query.email;
            const query = {email: email};
            const user = await usersCollections.findOne(query);
            if(user){
                const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '10d'})
                return res.send({accessToken: token})
            }
            console.log(user);
            res.status(403).send({accessToken: ''})
        })

                    // post all users and add database
        app.post('/users', async(req , res) => {
            const user = req.body;
            const result = await usersCollections.insertOne(user);
            res.send(result);
        })
        
                    //get all users by database and send data to client side
        app.get('/users' , async(req , res) =>{
            const query = {} ; 
            const users = await usersCollections.find(query).toArray();
            res.send(users);
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollections.findOne(query);
            res.send({ isAdmin: user?.role === 'admin'});
        })
        
        // update seller account to verified
        app.put('/users/admin/:id',  async(req , res) => {
           
            const id = req.params.id;
              const filter = {_id:ObjectId(id)}
              const options = {upsert: true};
              const updatedDoc = {
                $set: {
                  verification: 'verify'
                }
              }
              const result = await usersCollections.updateOne(filter,  updatedDoc, options);
              res.send(result);
           });

           
    }
    finally{

    }
}
run().catch(console.log);


app.get('/', async(req, res) =>{
    res.send('usedProduct  server is running');
})

app.listen(port, () => console.log(`used product sell site server portal running on ${port}`))