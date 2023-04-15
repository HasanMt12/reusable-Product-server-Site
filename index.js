const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const port = process.env.PORT || 5000;
const app = express();

//middleware

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gniuvqv.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

 // Jwt Token
 function verifyJWT(req, res, next) {
  console.log("token inside verifyJWT", req.headers.authorization);
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }
  // bearer  eta split(" ") kora hoilo
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}  


async function run(){
    try{
        const productCollections = client.db('reusableProductSell').collection('sellProduct')
        const categoryCollections = client.db('reusableProductSell').collection('category')
        const reservationCollections = client.db('reusableProductSell').collection('reservation')
        const usersCollections = client.db('reusableProductSell').collection('users')
        const sellerProductCollections = client.db('reusableProductSell').collection('sellerProduct')
        const paymentsCollections = client.db('reusableProductSell').collection('payment')
        const advertiseCollections = client.db('reusableProductSell').collection('adPost')
        const wishlistCollections = client.db('reusableProductSell').collection('wishlist')
        const allProductCollections = client.db('reusableProductSell').collection('allproduct')
        // admin middleware
            const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollections.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }   
        //seller middleware
         const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollections.findOne(query);

            if (user?.role !== 'mentor') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }
      



                     // get all categories and show HOME page
          app.get("/categories", async (req, res) => {
              const query = {};
            
              const categories = await categoryCollections.find(query).toArray();
              res.send(categories);
          });

                    // get single category product by name and show dynamic route
                    //and seller  category product also added dynamically
            app.get("/categories/:name", async (req, res) => {
                const name = req.params.name;
                const query = { categoryName: name };
                
                const globalProduct = await productCollections.find(query).toArray();
                const sellerProduct = await sellerProductCollections.find(query).toArray();
                const result = [...globalProduct, ...sellerProduct]

                res.send(result);
            });

                    //reservation/bookings post by and add database
        app.post('/reservation', async (req, res) => {
            const reservation = req.body
            console.log(reservation);
            const result = await reservationCollections.insertOne(reservation);
            res.send(result);
        })

        app.get('/reservation/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const reserve = await reservationCollections.findOne(query);
            res.send(reserve);
        })
        app.get('/allproduct', async (req, res) => {
            const query = {};
            const allproduct = await allProductCollections.find(query).toArray();
            res.send(allproduct);
        })


        // app.get(' ', async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: ObjectId(id) };
        //     const pro = await productCollections.findOne(query);
        //     const sell = await sellerProductCollections.findOne(query)
        //     res.send({pro , sell});
        // })

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

            //jwt 
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


        app.get('/users:email' , async(req , res) =>{
            const email = req.params.email;
            const query = { email : email }
            const user = await usersCollections.find(query).toArray();
            res.send(user);
        })
            //all user find and protect admin route
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

           app.delete('/users/:id',  verifyJWT, verifyAdmin,  async(req , res) => {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const result = await usersCollections.deleteOne(filter);
            res.send(result)
           })

          

                // add product to the database
           app.post('/product', async(req, res) => {
                const product = req.body;
                const result = await sellerProductCollections.insertOne(product);
                res.send(result);
           })

                //get product by database 
        //    app.get('/product', async(req, res) => {
        //     const query = {} 
        //     const product = await sellerProductCollections.find(query).toArray();
        //     res.send(product);
        //    })


        //get seller add product
        app.get('/product', async(req , res) =>{
            const email = req.query.email;
            const query = {email: email};
            const products = await sellerProductCollections.find(query).toArray();
            res.send(products);
        })
            // delete seller product
            app.delete('/product/:id', verifyJWT , verifySeller,  async(req , res) => {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const result = await sellerProductCollections.deleteOne(filter);
            res.send(result)
           })


            //payment method 
            app.post('/create-payment-intent', async (req, res) => {
                const bookingData = req.body;
                const price = bookingData.price;
                const amount = price * 100;
                const paymentIntent = await stripe.paymentIntents.create({
                  currency: 'usd',
                   amount: amount,
                "payment_method_types": [
                    "card"
                ]
                });
                  res.send({
                  clientSecret: paymentIntent.client_secret,
                });
              })



              //payment method update paid 
              app.post('/payments', async (req, res) =>{
                const payment = req.body;
                const result = await paymentsCollections.insertOne(payment);
                const id = payment.bookingId
                const filter = {_id: ObjectId(id)}
                const updatedDoc = {
                    $set: {
                        paid: true,
                        transactionId: payment.transactionId
                    }
                }
                const updatedResult = await sellerProductCollections.updateOne(filter, updatedDoc)
            // if(!updatedDoc.modifiedCount){
            //     const sellerUpdate ={
            //          $set: {
            //             paid: true,
            //             status : true,
            //             transactionId: payment.transactionId
            //         }
            //     };
            //      const sellerProductUpdate = await sellerProductCollections.updateOne(filter, sellerUpdate);
            // }    
         
            res.send(result );
        })

// get specific seller id
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollections.findOne(query);
            res.send({ isSeller: user?.role === 'mentor'});
        })


  // get all seller id 
        app.get("/users/seller", async (req, res) => {
        const query = { role: "mentor" };
        const sellers = await usersCollections.find(query).toArray();
        res.send(sellers);
        });

     //get all buyer id
        app.get("/users/buyer", async (req, res) => {
        const query = { role: "mentee" };
        const sellers = await usersCollections.find(query).toArray();
        res.send(sellers);
        });


        app.post("/advertise", async (req, res) => {
      const advertised = req.body;
      const query = {
        _id: advertised._id,
      };
      console.log(query);
      const alreadyBooked = await advertiseCollections.find(query).toArray();
      if (alreadyBooked.length > 0) {
        const message = ('You already have advertised ${advertised.name}');
        return res.send({ acknowledged: false, message });
      }
      const result = await advertiseCollections.insertOne(advertised);
      res.send(result);
    });


    app.get("/advertise", async (req, res) => {
      const query = {};
      const result = await advertiseCollections.find(query).toArray();
      res.send(result);
    });


    app.post("/wishlist", async (req, res) => {
        const wishlist = req.body;
        const result = await wishlistCollections.insertOne(wishlist);
        res.send(result);
    });

    app.get('/wishlist',async (req,res)=>{
const email = req.query.email
const query = {email: email}
const wishlist = await wishlistCollections.find(query).toArray();
res.send(wishlist);
})

           
    }
    finally{

    }
}
run().catch(console.log);


app.get('/', async(req, res) =>{
    res.send('usedProduct  server is running');
})

app.listen(port, () => console.log(`used product sell site server portal running on ${port}`))