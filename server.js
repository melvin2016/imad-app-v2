var express = require('express');
var morgan = require('morgan');
var Pool = require('pg').Pool;
var path = require('path');
var crypto = require('crypto');
var bodyParser = require('body-parser');
var session = require('express-session');

var config = {
  host : 'db.imad.hasura-app.io',
  user : 'melvin2016',
  password : process.env.DB_PASSWORD,
  port : '5432',
  database : 'melvin2016'

};
var pool = new Pool(config);

var app = express();
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(session({
    
    secret:"glassdoor",
    cookies:{maxAge:1000*60*60*24*30}

    
    }));




var counter=0;
app.get('/counter', function(req,res){
   counter = counter + 1;
   res.send(counter.toString());

});

var comments=[];
app.get('/submit-comment' , function(req,res){
    var comment = req.query.comment;
    comments.push(comment);
    res.send(JSON.stringify(comments));
});

function createTemplate(data){
    var title = data.title;
    var head_img = data.head_img;
    var heading = data.heading;
    var para1 = data.para1;
    var para2 = data.para2;

    var htmlContent=`<html>
<head>
    <title>
        ${title}
    </title>
    <link href="https://fonts.googleapis.com/css?family=Amatic+SC|Baloo+Bhai|Lalezar|Lato|Oswald" rel="stylesheet">
    <link type="text/css"href="/ui/style.css" rel="stylesheet" />
    <meta name="viewport" content="width=device-width, initial-sacle=1">
</head>
<body>
    <div class="links">
              <ul id="ul_nav">
                <li><a class="active" href="/"><img src="http://findicons.com/files/icons/1580/devine_icons_part_2/128/home.png" alt="Home"> Home</a></li>
                <li><a href="/articles/profile"><img src="https://maxcdn.icons8.com/Share/icon/Users//user_male_circle_filled1600.png" alt="Profile"> Profile</a></li>
                <li><a href="/articles/my-articles"><img src="http://www.housingeurope.eu/site/theme/_assets/img/type-article.png" alt="Works">Articles</a></li>
                <li ><a  href="/articles/vision"><img src="http://www.pngall.com/wp-content/uploads/2016/05/Vision-Free-Download-PNG.png" alt="vision">VISION</a></li>
                <span id="userAndPass">
                    <li><input type="text" id="username" placeholder="Username"></li>
                    <li><input type="password" id="password" placeholder="Password"></li>
                </span>
                <li><span id="loginArea" style="color:green;"><input type="submit" id="submit_form" Value="Login "></span> </li>
                <li><span id="logoutArea" ><input type="submit" id="register_user" value="Or Register !"></span></li>
                
              </ul>
            </div>
    <div class="container">
        
        <div class="center">
            <img src="/ui/${head_img}" class="img-medium"/>
        </div>
        <h1>${heading}<hr></h1>
        <p>
            ${para1}
        </p>
        <p>
            ${para2}
        </p>
        <div id="opinionBox">
        
        </div>
        
    </div>
  <footer>
  <p>
    <a href="https://twitter.com/melvingeorge11"><img src="http://icons.iconarchive.com/icons/spoon-graphics/doodle/128/Twitter-icon.png"></a>
    &nbsp&nbsp&nbsp<a href="https://www.facebook.com/alkitj10"><img src="http://inc.anphicle.com/2012/01/facebook.png"></a>
  </p>
  &copy Meak Inc.
  </footer>
  <script type="text/javascript" src="/ui/main.js"> </script>
</body>
</html>`;

return htmlContent;
}

//For Other PAges
app.get('/articles/:articlename', function (req, res) {
    pool.query("SELECT * FROM articles WHERE title =$1",[req.params.articlename] , function(err,result){
        if(err){
            res.status(500).send(err.toString());
        }else{
            if(result.rows.length===0){
                res.status(404).send('<center><img src="http://geraldo.com/public/images/notfound.png" alt="article not Found !"><br><a href="http://melvin2016.imad.hasura-app.io/">Home !</a></center>');
            }else{
                var articleData = result.rows[0];
                res.send(createTemplate(articleData));
            }
            
        }
        
    });
});



function hash(string,salt){
    var hash = crypto.pbkdf2Sync(string, salt, 100000, 512, 'sha512');
    return ["pbkdf2","100000",salt,hash.toString('hex')].join('$');
}

app.post('/create-user',function(req,res){
    
    var username = req.body.username;
    var password = req.body.password;
    
    var salt = crypto.randomBytes(128).toString('hex');
    var dbString = hash(password,salt);
    pool.query('INSERT INTO "user" (username,password) VALUES ($1 ,$2)',[username,dbString],function(err,result){
        
        if(err){
            res.status(500).send(err.toString());
        }else{
            res.send("USER SUCCESSFULLY CREATED "+username);
        }
        
    });
    
});

app.post('/login',function(req,res){
    
    var username = req.body.username;
    var password = req.body.password;
    
    

    pool.query('SELECT * FROM "user" WHERE username = $1',[username],function(err,result){
        
        if(err){
            res.status(500).send(err.toString());
        }else{
            if(result.rows.length === 0){
                res.status(403).send('username/password is invalid !');
            }else{
               var dbString = result.rows[0].password;
                var salt = dbString.split('$')[2];
                var hashedP = hash(password,salt);
                if(hashedP === dbString  ){
                    req.session.auth = {userId:result.rows[0].id};
                    res.send(username);
                    
                  }else{
                     res.status(403).send('username/password is invalid !');
                 } 
                
            }
            
            
        }
        
    });
 
        
});

app.get('/check-login', function (req, res) {
   if (req.session && req.session.auth && req.session.auth.userId) {
       // Load the user object
       pool.query('SELECT * FROM "user" WHERE id = $1', [req.session.auth.userId], function (err, result) {
           if (err) {
              res.status(500).send(err.toString());
           } else {
              res.send(result.rows[0].username);
           }
       });
   } else {
       res.status(400).send('<center><img src="http://cdn.appthemes.com/wp-content/uploads/2013/03/not-logged-in.png" alt="Not Logged In !"></center>');
   }
});

app.get('/logout',function(req,res){
    delete req.session.auth;
    res.send('<center><img src="http://www.carshowsafari.com/images/logged_out/successfully-logged-out.png" alt="successfully logged Out !"><br><a href="http://melvin2016.imad.hasura-app.io/">Go To Home Page !</a><center>');
});



app.post('/comments',function(req,res){
    if(req.session && req.session.auth && req.session.auth.userId){
        
        pool.query("INSERT INTO comments (comment,user) VALUES ($1,$2)",[req.body.comment,req.body.username],function(err,result){
            if(err){
                res.status(500).send(err.toString());
            }else{
                res.status(200).send('Comment inserted!');
            }
            
        });
        
    }else{
        
        res.status(403).send('Only logged in users can comment');
    }
    
    
});

app.post('/loadCommentsUserArtilcle',function(req,res){
    
    if(req.session && req.session.auth && req.session.auth.userId){
        
        pool.query('SELECT * FROM comments',function(err,result){
            
            if(err){
                res.send(err.toString());
                
            }else{
                comments=[];
                user=[];
                article=[];
                for(var i = 0 ; i<result.rows.length ; i++){
                    
                     comments.push(result.rows[i].comment);
                     user.push(result.rows[i].user);
                     article.push(result.rows[i].article);
                    
                    
                }
                res.status(200).send(JSON.stringify([comments,user,article]));
            }
            
        });
        
    }else{
        
        res.status(403).send('Not Found !');
    }
    
});
//For Home Page
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'index.html'));
});





app.get('/ui/:filename', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', req.params.filename));
});

var port = 8080; // Use 8080 for local development because you might already have apache running on 80
app.listen(8080, function () {
  console.log(`IMAD course app listening on port ${port}!`);
});