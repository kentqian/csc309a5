var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var fs = require('fs');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

/* GET index page. */
router.get('/', function (req, res, next) {
    res.render('index');
});



router.route("/register")
    /* GET register page. */
    .get(function (req, res) {
        res.render("register");
    })
    /* POST register. */
    .post(function (req, res, next) {
        //get user information
        var uname = req.body.uname;
        var upwd = req.body.upwd;
        var loc = req.body.location;
        var firstUser = false;

        //if the user is the first in database
        Users.findOne({}, function (err, doc) {
            if (!doc) {
                firstUser = true;
            }
        })

        Users.findOne({ email: uname }, function (err, doc) {
            //if user exist in database
            if (doc) {
                req.session.error = 'User Exists';
                res.sendStatus(500);
            } else {
                var base64Image;
                //read default user picture, convert to base64 string
                fs.readFile('default.png', 'binary', function (err, original_data) {
                    base64Image = new Buffer(original_data, 'binary').toString('base64');
                    //if user is first in db, role is superAdmin
                    var role;
                    if (firstUser) {
                        role = 'superAdmin';
                    } else {
                        role = 'regular';
                    }

                    //create user in db
                    var user = Users.create({
                        email: uname,
                        password: upwd,
                        description: '',
                        display_name: uname,
                        image: base64Image,
                        role: role,
                        ip: '',
                        device: '',
                        location: loc
                    }
                    , function (err, doc) {
                        //log session informaion
                        req.session.user = doc;
                        req.session.error = "Login success";
                        res.sendStatus(200);
                    })

                });
            }
        });
    });


router.route("/login")
    /* GET login page. */
    .get(function (req, res) {
        res.render("login");
    })
    /* POST login. */
    .post(function (req, res) {
        var uname = req.body.uname;
        Users.findOne({ email: uname }, function (err, doc) {
            //if no user were found
            if (!doc) {
                req.session.error = 'User does not exist';
                res.sendStatus(404);
            } else {
                //if password is not correct
                if (req.body.upwd != doc.password) {
                    req.session.error = "Wrong password";
                    res.sendStatus(404);
                } else {
                    //log session information
                    req.session.user = doc;
                    res.sendStatus(200);
                }
            }
        });
    });

/* GET user home page. */
router.get("/:email/home", function (req, res) {
    Books.find({borrowed: false}, function (err, data) {
        //if not logged in 
        if (!req.session.user) {
            req.session.error = "Please login";
            res.redirect("/login");
        } else {
            res.locals.books = data;
            res.render("home");
        }
    })
});




router.route("/:email/profile")
    /* GET user profile page. */
    .get(function (req, res) {
        //find user 
        Users.findOne({ email: req.params.email }, function (err, doc) {
            //if not logged in 
            if (!req.session.user) {
                req.session.error = "Please login";
                res.redirect("/login");
            } else {
                res.render("profile", {
                    email: doc.email, description: doc.description,
                    display_name: doc.display_name, image: doc.image, role: doc.role
                });
            }
        })

    })
    /* POST user profile. */
   .post(function (req, res) {
       var display_name = req.body.display_name;
       var description = req.body.description;
       //update user profile
       Users.update({ email: req.params.email }, { display_name: display_name, description: description }, function (err, doc) {
           res.sendStatus(200);
       })
   });

/* POST user password. */
router.post("/:email/password", function (req, res) {
    //find user
    Users.findOne({ email: req.params.email }, function (err, doc) {
        if (req.body.current_password != doc.password) {
            res.sendStatus(500);
        } else {
            //update user password
            Users.update({ email: req.params.email }, { password: req.body.new_password }, function (err, doc) {
                res.sendStatus(200);
            })
        }
    })

});

/* POST user admin. */
router.post("/:email/admin", function (req, res) {
    //find user
    Users.findOne({ email: req.params.email }, function (err, doc) {
        //update user role
        Users.update({ email: req.params.email }, { role: 'admin' }, function (err, doc) {
            res.sendStatus(200);
        })

    })

});

/* POST user unadmin. */
router.post("/:email/unadmin", function (req, res) {
    //find user
    Users.findOne({ email: req.params.email }, function (err, doc) {
        //update user role
        Users.update({ email: req.params.email }, { role: 'regular' }, function (err, doc) {
            res.sendStatus(200);
        })

    })

});

/* POST user delete. */
router.post("/:email/delete", function (req, res) {
    //find user
    Users.findOne({ email: req.params.email }, function (err, doc) {
        //remove user
        doc.remove(function () {
            res.sendStatus(200);
        })

    })

});

/* GET user edit page. */
router.get("/:email/edit", function (req, res) {
    //find user
    Users.findOne({ email: req.params.email }, function (err, doc) {
        //if not logged in
        if (!req.session.user) {
            req.session.error = "Please login";
            res.redirect("/login");
        } else {
            if ((req.session.user.role == 'regular' && req.session.user.email != req.params.email) || (req.session.user.role == 'admin' && req.session.user.email != req.params.email && doc.role != 'regular')) {
                res.sendStatus(404);
            } else {
                res.render("edit", {
                    email: doc.email, description: doc.description,
                    display_name: doc.display_name, image: doc.image, role: doc.role
                });
            }
        }
    })

});

/* POST user picture. */
router.post("/:email/picture", multipartMiddleware, function (req, res) {
    //read pictire from tmp path
    fs.readFile(req.files.picture.path, 'binary', function (err, original_data) {
        //convert to base64 string
        var base64Image = new Buffer(original_data, 'binary').toString('base64');
        //find user
        Users.findOne({ email: req.params.email }, function (err, doc) {
            //update user image
            doc.image = base64Image;
            Users.update({ email: req.params.email }, { image: base64Image }, function (err, data) {
                req.session.user = doc;
                res.redirect('/' + req.params.email + '/profile');
            })

        })

    })

});

/* GET user behavior page. */
router.get("/:email/behaviour", function (req, res) {
    Users.findOne({ email: req.params.email }, function (err, doc) {
        //if not logged in
        if (!req.session.user) {
            req.session.error = "Please login";
            res.redirect("/login");
        } else {
            res.render("behaviour", {
                ip: doc.ip, device: doc.device, location: doc.location
            });
        }
    })

});

/* GET logout. */
router.get("/logout", function (req, res) {
    req.session.user = null;
    req.session.error = null;
    res.redirect("/");
});


router.route("/:email/share")
    /* GET user share page. */
    .get(function (req, res) {
        //find user 
        Users.findOne({ email: req.params.email }, function (err, doc) {
            //if not logged in 
            if (!req.session.user) {
                req.session.error = "Please login";
                res.redirect("/login");
            } else {
                res.render("share",{email: req.params.email});
            }
        })

    })
    /* POST user share. */
    .post(multipartMiddleware, function (req, res) {
        var title = req.body.title;
        var author = req.body.author;
        var description = req.body.description;
        fs.readFile(req.files.picture.path, 'binary', function (err, original_data){
            var book_image = new Buffer(original_data, 'binary').toString('base64');
            if (book_image == ""){
                fs.readFile('imagesdefault.jpg', 'binary', function (err, original_data) {
                    bookimage = new Buffer(original_data, 'binary').toString('base64');
                    Books.create({
                    owner: req.params.email,
                    title: title,
                    author: author,
                    rate: 0,
                    description: description,
                    borrowed: false,
                    image: bookimage
                }
                , function (err, doc) {
                    console.log(bookimage);
                    res.redirect('/' + req.params.email + '/home');
                    });
                });
            }else{
                Books.create({
                    owner: req.params.email,
                    title: title,
                    author: author,
                    description: description,
                    borrowed: false,
                    image: book_image
                }
                , function (err, doc) {
                    res.redirect('/' + req.params.email + '/home');
                });
            }
        });
    });

























/* GET user books page. */
router.get("/:email/library", function (req, res) {
    Users.findOne({ email: req.params.email }, function (err, doc) {
        //if not logged in
        if (!req.session.user) {
            req.session.error = "Please login";
            res.redirect("/login");
        } else {
            Books.find({ owner: req.params.email }, function (err, doc) {
                res.locals.books = doc;
                res.render("library");
            })
        }
    })
});


/* GET user message. */
router.get("/:email/message", function (req, res) {
    Messages.find({ to: req.params.email }, function (err, doc) {
        res.locals.messages = doc;
        res.render("message");
    })
});


router.route("/:email1/message/:email2")
    .get(function (req, res) {
        Messages.findOne({ from: req.params.email1, to: req.params.email2 }, function (err, doc1) {
            if (doc1) {
                Messages.findOne({ from: req.params.email2, to: req.params.email1 }, function (err, doc2) {
                    res.locals.messages1 = doc1;
                    res.locals.messages2 = doc2;
                    res.locals.to = req.params.email2;
                    res.render("chat");
                })
            } else {
                Messages.create({
                    from: req.params.email1,
                    to: req.params.email2,
                    text: []
                })
                Messages.findOne({ from: req.params.email1, to: req.params.email2 }, function (err, doc1) {
                    Messages.findOne({ from: req.params.email2, to: req.params.email1 }, function (err, doc2) {
                        res.locals.messages1 = doc1;
                        res.locals.messages2 = doc2;
                        res.locals.to = req.params.email2;
                        res.render("chat");
                    })
                })
            }
        })
    })
    
   .post(function (req, res) {
      
           
               Messages.update({ from: req.params.email1, to: req.params.email2 }, { $push: { text: {body: req.body.text } } }, { upsert: true }, function (err) {
                   res.sendStatus(200);
               });

           
       

   });


router.route("/book/:id")
    /* GET book page. */
    .get(function (req, res) {
        Books.findById(req.params.id, function (err, doc) {
            res.locals.book = doc;
            res.render("book");
        })
    })
    /* POST book. */
   .post(function (req, res) {
       Books.findById(req.params.id, function (err, doc) {
           var rate = (doc.rate * doc.comments.length + parseInt(req.body.rate)) / (doc.comments.length + 1);
           Books.update({ _id: req.params.id }, { rate: rate, $push: { comments: { email: req.body.email, body: req.body.body, rate: req.body.rate } } }, { upsert: true }, function (err) {
               res.sendStatus(200);
           });
       })
       
   });



router.post("/book/:id/borrow", function (req, res) {
    Books.update({ _id: req.params.id }, { borrowed: true, owner: req.body.email }, function (err) {
        Users.update({ email: req.body.email }, { $push: { books: { id: req.params.id } } }, function (err) {
            res.sendStatus(200);
        })
    })
});








module.exports = router;



