var express = require('express');
var router = express.Router();
var usersController = require('../controllers/users');
var staticsController = require('../controllers/statics');
var businessController = require('../controllers/businesses');

var yelp = require('yelp-fusion');
var dotenv = require('dotenv').load()
var client = yelp.client(process.env.YELP_API_KEY)
var User = require('../models/user')

var Comments = require('../models/comment')

var Business = require('../models/business')


function authenticateUser(req, res, next) {
  // If the user is authenticated, then we continue the execution
  if (req.isAuthenticated()) return next();

  // Otherwise the request is always redirected to the home page
  res.redirect('/');
}

router.route('/')
  .get(staticsController.home);

router.route('/signup')
  .get(usersController.getSignup)
  .post(usersController.postSignup)

router.route('/login')
  .get(usersController.getLogin)
  .post(usersController.postLogin)

router.route("/logout")
  .get(usersController.getLogout)

router.route("/secret")
  .get(authenticateUser, usersController.secret)

// Search on initial click of submit
router.route("/search/:searchTerm/:locationTerm")
  .get((req, res) => {
    console.log('searching');
    client.search({
      term: req.params.searchTerm,
      location: req.params.locationTerm
    }).then(response => {
      res.send(response.jsonBody)
    }).catch(e => {
      console.log(e);
    });
  })

// Page 1, 2, 3... of results
router.route("/search/:searchTerm/:page/:locationTerm")
  .get((req, res) => {
    console.log(req.params.offset);
    client.search({
      term: req.params.searchTerm,
      offset: 20 * (req.params.page -1),
      location: req.params.locationTerm
    }).then(response => {
      res.send(response.jsonBody)
    }).catch(e => {
      console.log(e);
    });
  })

// show each business
router.route('/show/:businessId')
.get((req, res) => {
  Business.findOne({yelpID: req.params.businessId}, (err, booBusiness) => {
    if (booBusiness) {
      Business.findOne({yelpID: req.params.businessId}, (err, business) => {
        console.log(business);
        if(err) console.log(err);
        res.render('show', {data: business})
      })

    } else {
      client.business(req.params.businessId).then(response => {
          console.log(response.jsonBody.id);
          res.render('show', {data: response.jsonBody})
        }).catch(e => {
          console.log(e);
        });
    }
  })

})


// User profile view
router.route('/profile/:userId')
.get((req, res) => {
  User.findById(req.params.userId, (err, user) => {
    // console.log(user.local)
    res.render('user', {userData: user})
  })
})


// Creates comment and business or just create comment
router.route('/show/:businessId/comment')
  .post((req, res) => {
    //comment is album
    //artist is buissness
    Business.findOne({yelpID: req.params.businessId}, (err, business) => {
      // if business is true then create comment normal, if not create business with post above then create comment
      if(err) return console.log(err)
      if (!business){
        //create the business
        client.business(req.params.businessId).then(response => {
          Business.create({
            yelpID: response.jsonBody.id,
            name: response.jsonBody.name,
            address: response.jsonBody.location.display_address,
            img_url: response.jsonBody.image_url
          }, function (err, business){
            var newComment = new Comments(req.body)
            newComment._business = business._id
            newComment._by = user._id

            newComment.save((err) => {
              if(err) return console.log(err)

              business.comments.push(newComment)
              business.save((err, comment)=>{
                if(err) return console.log(err)
                console.log(comment);
                res.redirect('/show/' + req.params.businessId)
              })
            })
          })
        })

      } else {
        //create a comment on the business
        var newComment = new Comments(req.body)
        newComment._business = business._id
        newComment._by = user._id

        newComment.save((err) => {
          if(err) return console.log(err)

          business.comments.push(newComment)
          business.save((err, comment)=>{
            if(err) return console.log(err)
            console.log(comment);
            res.redirect('/show/' + req.params.businessId)
          })
        })
      }
    })
  })

router.route('/show/:businessId/comment/:commentId').get((req, res) => {
  console.log('Working HITS');
})

router.route('/show/:businessId/comment/:commentId').patch((req, res) => {
  console.log('Working HITS');
})


// router.route('show/:id').post(businessController.createBusiness)



module.exports = router
