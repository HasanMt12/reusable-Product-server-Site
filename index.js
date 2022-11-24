const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

//middleware

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gniuvqv.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const productCollections = client.db('reusableProductSell').collection('sellProduct')
        const categoryCollections = client.db('reusableProductSell').collection('category')

          // get all categories
          app.get("/categories", async (req, res) => {
              const query = {};
              const categories = await categoryCollections.find(query).toArray();
              res.send(categories);
          });

           // get single category product by name
            app.get("/categories/:name", async (req, res) => {
                const name = req.params.name;
                const query = { categoryName: name };
                const result = await productCollections.find(query).toArray();
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