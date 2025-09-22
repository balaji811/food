import express from  "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const upload = multer({ 
    dest: path.join(__dirname, 'uploads/'),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});


const db = new pg.Client({
   user:"postgres",
   host:"localhost",
   database:"newone",
   password:"balaji125",
   port:5432
});

db.connect();

const app = express();
const port = 3000;
const saltRounds = 10;



app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());







app.get("/",(req,res) =>{
     res.render("index.ejs");
});


app.get("/adminlogin",(req,res) =>{
   res.render("adlogin.ejs");
});


app.post("/adminpost", async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).render("adlogin.ejs", {
        error: "Email and password are required"
      });
    }

    // Check if admin exists
    const result = await db.query(
      "SELECT * FROM admins WHERE email = $1", 
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).render("admin.ejs", {
        error: "Invalid email or password"
      });
    }

    const admin = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, admin.password);
    
    if (!passwordMatch) {
      return res.status(401).render("adlogin.ejs", {
        error: "Invalid email or password"
      });
    }

    // Successful login - redirect to admin dashboard
    res.render("admin.ejs");
    
  } catch(err) {
    console.error("Admin login error:", err);
    res.status(500).render("adlogin.ejs", {
      error: "Login failed. Please try again."
    });
  }
});




//donor  login
app.get("/registrationpg",(req,res) =>{
    res.render("registeration.ejs");
});

app.post("/registration", async (req, res) => {
  const { email, password, user_type } = req.body;
  
  try {
      // Validate input
      if (!email || !password || !user_type) {
          return res.status(400).render("registeration.ejs", {
              error: "All fields are required"
          });
      }

      // Check if email exists
      const checkResult = await db.query(
          "SELECT * FROM users WHERE email = $1", 
          [email]
      );
  
      if (checkResult.rows.length > 0) {
          return res.status(400).render("registeration.ejs", {
              error: "Email already exists"
          });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Insert into users table
      const userResult = await db.query(
          "INSERT INTO users (email, password, user_type) VALUES ($1, $2, $3) RETURNING id",
          [email, hashedPassword, user_type]
      );
      
      // Redirect based on user type
      switch(user_type) {
          case 'restaurant':
              return res.render("resturants.ejs", { userType: user_type });
          case 'organization':
              return res.render("reccater.ejs", { userType: user_type });
          case 'individual':
              return res.render("households.ejs", { userType: user_type });
          default:
              return res.status(400).render("registeration.ejs", {
                  error: "Invalid user type"
              });
      }
      
  } catch(err) {
      console.error("Registration error:", err);
      res.status(500).render("registeration.ejs", {
          error: "Registration failed. Please try again."
      });
  }
});



app.get("/login",(req,res) =>{
    res.render("login.ejs");
});

app.post("/loginpost", async (req, res) => {
  const { email, password } = req.body;
  
  try {
      
      if (!email || !password) {
          return res.status(400).render("login.ejs", {
              error: "Email and password are required"
          });
      }

      const result = await db.query(
          "SELECT * FROM users WHERE email = $1", 
          [email]
      );
      
      if (result.rows.length === 0) {
          return res.status(404).render("login.ejs", {
              error: "User not found"
          });
      }

      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
          return res.status(401).render("login.ejs", {
              error: "Incorrect password"
          });
      }

      switch(user.user_type) {
          case 'restaurant':
              return res.render("resturants.ejs", { userType: user.user_type });
          case 'organization':
              return res.render("reccater.ejs", { userType: user.user_type });
          case 'individual':
              return res.render("households.ejs", { userType: user.user_type });
          default:
              return res.render("login.ejs", {
                  error: "Invalid user type"
              });
      }
  } catch(err) {
      console.error("Login error:", err);
      res.status(500).render("login.ejs", {
          error: "Login failed. Please try again."
      });
  }
});






app.get("/recreg", (req,res) =>{
    res.render("recreg.ejs");
});


app.post("/regrec", async (req, res) => {
    const { email, password, user_type } = req.body;
  
    try {
      // Validate input
      if (!email || !password || !user_type) {
        return res.status(400).render("recreg.ejs", {
          error: "All fields are required",
          formData: req.body
        });
      }
  
      // Check if email exists in receivers table
      const checkResult = await db.query(
        "SELECT * FROM receivers WHERE email = $1", 
        [email]
      );
  
      if (checkResult.rows.length > 0) {
        return res.status(400).render("recreg.ejs", {
          error: "Email already exists",
          formData: req.body
        });
      }
  
      // Hash password
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
      // Insert into receivers table
      await db.query(
        "INSERT INTO receivers (email, password, user_type) VALUES ($1, $2, $3)",
        [email, hashedPassword, user_type]
      );
  
      // Redirect to appropriate login page based on user type
      switch(user_type) {
        case 'ngo':
          return res.redirect("/ngo");
        case 'individual':
          return res.redirect("/individuals");
        case 'volunteer':
          return res.redirect("/volunteers");
        default:
          return res.redirect("/reclogin");
      }
  
    } catch(err) {
      console.error("Receiver registration error:", err);
      res.status(500).render("recreg.ejs", {
        error: "Registration failed. Please try again.",
        formData: req.body
      });
    }
  });

app.get("/reclogin",(req,res) =>{
    res.render("reclogin.ejs");
});

app.post("/reclog", async (req, res) => {
    const { email, password } = req.body;
    
    try {
      // Validate input
      if (!email || !password) {
        return res.status(400).render("reclogin.ejs", {
          error: "Email and password are required"
        });
      }
  
      // Check if receiver exists
      const result = await db.query(
        "SELECT * FROM receivers WHERE email = $1", 
        [email]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).render("reclogin.ejs", {
          error: "Receiver not found"
        });
      }
  
      const receiver = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, receiver.password);
      
      if (!passwordMatch) {
        return res.status(401).render("reclogin.ejs", {
          error: "Incorrect password"
        });
      }
  
      // Redirect based on receiver type
      switch(receiver.user_type) {
        case 'ngo':
          return res.redirect("/ngo");
        case 'individual':
          return res.redirect("/individuals");
        case 'volunteer':
          return res.redirect("/volunteers");
        default:
          return res.redirect("/dashboard");
      }
    } catch(err) {
      console.error("Receiver login error:", err);
      res.status(500).render("reclogin.ejs", {
        error: "Login failed. Please try again."
      });
    }
  });


 /* app.get("/ngo",(req,res) =>{
     res.render("ngo.ejs");
  });*/

  app.get('/ngo', async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM food_donations');
      res.render("ngo.ejs", { foods: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  });
  



//catering


app.get("/resturnats",(req,res) =>{
     app.render("resturants.ejs");
});



app.get("/reccater",(req,res) =>{
    res.render("reccater.ejs");
});



app.get("/household",(req,res) =>{
  res.render("households.ejs");
});

app.get("/resturants",(req,res) =>{
 res.render("resturants.ejs");
});

app.get("/caters",(req,res) =>{
res.render("reccater.ejs");
});


// donor post

app.get("/donor",(req,res) =>{
   res.render("donor.ejs");
});


app.post('/donorpost', async (req, res) => {
  const { donor_name, contact_info, location, food_item, quantity, description } = req.body;

  try {
    await db.query(
      'INSERT INTO food_donations (donor_name, contact_info, location, food_item, quantity, description) VALUES ($1, $2, $3, $4, $5, $6)',
      [donor_name, contact_info, location, food_item, quantity, description]
    );
    res.send("Thank you! Your donation was submitted successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving your donation.");
  }
});
     

//receiveer
app.get('/ngo', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM food_donations');
    res.render("ngo.ejs", { foods: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


app.get('/individuals', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM food_donations');
    res.render("reindividual.ejs", { foods: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.get('/volunteers', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM food_donations');
    res.render("revolunteers.ejs", { foods: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});










app.listen(port , ()=>{
  console.log(`server running at port ${port}`);
});
