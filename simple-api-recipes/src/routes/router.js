const express = require('express');
const mongodb = require('mongodb');
const indicative = require('indicative');
const error = require('./helpers').error;
const replaceId = require('./helpers').replaceId;
const currentDateAndTime = require('./helpers').currentDateAndTime;
const util = require('util');

const router = express.Router();
const ObjectID = mongodb.ObjectID;

// GET (read all users)
router.get('/', function(req, res) {
    const db = req.app.locals.db;
    db.collection('users').find().toArray().then(users => {
        res.json(users);
    });
});

// POST (create a user)
router.post('/', function (req, res) {
    const db = req.app.locals.db;
    const user = req.body;
    indicative.validate(user, 
        {
            name: 'required|string',
            username: 'required|string|min:2|max:15',
            password: 'regex:^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]',
            sex: 'required|regex:[mf]',
            role: 'in:admin,user',
            imageUrl: 'url',
            description: 'string|max:512',
            statusOfAcc: 'in:active,suspended,deactivated'
     })
    .then(user => {
        user.dateOfReg = currentDateAndTime();
        if (!user.imageUrl) {
            if (user.sex === 'f') {
                user.imageUrl = 'http://wuf9.org/wp-content/themes/wuf9/img/default-female.jpg';
            } else {
                user.imageUrl = 'https://www.mastermindpromotion.com/wp-content/uploads/2015/02/facebook-default-no-profile-pic-300x300.jpg';
            }
        }
        user.dateOfLastChange = user.dateOfReg;
        console.log("Inserting user: ", user);
        db.collection('users').insertOne(user).then(result => {
            if(result.result.ok && result.insertedCount === 1) {
                replaceId(user);
                const uri = req.baseUrl + '/' + user._id
                res.location(uri).status(201).json(user);
            }
        });
    }).catch(err => error(req, res, 400, 
        `Invalid user: ${util.inspect(err)}`, err));
});

// GET (read user data)
router.get('/:userId', function(req, res) {
    const params = req.params;
    const db = req.app.locals.db;
    indicative.validate(params, {userId: 'required|regex:^[0-9a-f]{24}$' })
        .then(() => {
            db.collection('users').findOne({_id: new ObjectID(params.userId)})
            .then(user => {
                if(user) {
                    replaceId(user);
                    res.json(user);
                } else {
                    error(req, res, 404, `Invalid user ID: ${params.userId}. There is no user with such ID in the database`);
                }
            });
        }).catch(err => error(req, res, 404, 
            `Invalid user ID: ${params.userId}. Id should have 24 hexadecimal characters.`, err));
});

// PUT (update user data)
router.put('/:userId', function(req, res) {
    const db = req.app.locals.db;
    const params = req.params;
    const user = req.body;
    if(params.userId !== user.id) {
        error(req, res, 404, `User ID does not match: ${params.userId} vs. ${user.id} `)
    }
    indicative.validate(user, 
        { 
            id: 'required|regex:^[0-9a-f]{24}$',
            name: 'required|string',
            username: 'required|string|min:2|max:15',
            password: 'regex:^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]',
            sex: 'required|regex:[mf]',
            role: 'in:admin,user',
            imageUrl: 'url',
            description: 'string|max:512',
            statusOfAcc: 'in:active,suspended,deactivated'
     })
    .then(user => {
        user.dateOfLastChange = currentDateAndTime();
        console.log("Updating user: ", user);
        user._id = new ObjectID(user.id);
        delete (user.id);
        db.collection('users').updateOne({_id: user._id}, {"$set": user})
        .then(result => {
            console.log("User to update: ", user);
            if(result.result.ok && result.modifiedCount === 1) {
                replaceId(user);
                res.status(200).json(user);
            }
        });
    }).catch(err => error(req, res, 400, 
        `Invalid user: ${util.inspect(err)}`, err));
});

// DELETE (remove a user)
router.delete('/:userId', function(req, res) {
    const params = req.params;
    const db = req.app.locals.db;
    indicative.validate(params, {userId: 'required|regex:^[0-9a-f]{24}$'})
        .then(() => {
            db.collection('users').findOneAndDelete({_id: new ObjectID(params.userId)})
            .then(({ value }) => {
                if(value) {
                    replaceId(value);
                    res.json(value);
                } else {
                    error(req, res, 404, `Invalid user ID: ${params.userId}`)
                }
            });
        }).catch(err => error(req, res, 404, 
            `Invalid user ID: ${params.userId}. Id should have 24 hexadecimal characters.`, err));
});

// GET (read all recipes)
router.get('/:userId/recipes', function(req, res) {
    const params = req.params;
    const db = req.app.locals.db;
    // check whether the user exists first
    indicative.validate(params, {userId: 'required|regex:^[0-9a-f]{24}$' })
        .then(() => {
            db.collection('users').findOne({_id: new ObjectID(params.userId)})
            .then(user => {
                if(!user) {
                    error(req, res, 404, `Invalid user ID: ${params.userId}. There is no user with such ID in the database`);
                }
            });
        }).catch(err => error(req, res, 404, 
            `Invalid user ID: ${params.userId}. Id should have 24 hexadecimal characters.`, err));

    db.collection('recipes').find({userId: params.userId}).toArray().then(recipes => {
        res.json(recipes.map(a => replaceId(a)));
    });
});

// GET (read a recipe by user)
router.get('/:userId/recipes/:recipeId', function(req, res) {
    const params = req.params;
    const db = req.app.locals.db;
    indicative.validate(params, {userId: 'required|regex:^[0-9a-f]{24}$'})
        .then(() => {
            db.collection('users').findOne({_id: new ObjectID(params.userId)})
            .then(user => {
                if(!user) {
                    error(req, res, 404, `Invalid user ID: ${params.userId}`);
                }
            });
        }).catch(err => error(req, res, 404, 
            `Invalid user ID: ${params.userId}. Id should have 24 hexadecimal characters.`, err));

    indicative.validate(params, {recipeId: 'required|regex:^[0-9a-f]{24}$'})
        .then(() => {
            db.collection('recipes').findOne({_id: new ObjectID(params.recipeId)})
            .then(recipe => {
                if(recipe) {
                    replaceId(recipe);
                    res.json(recipe);
                } else {
                    error(req, res, 404, `Invalid recipe ID: ${params.recipeId}`)
                }
            });
        }).catch(err => error(req, res, 404, 
            `Invalid recipe ID: ${params.recipeId}. Id should have 24 hexadecimal characters.`, err));
});

// POST (create a recipe for user)
router.post('/:userId/recipes', (req, res) => {
    const params = req.params;
    const db = req.app.locals.db;
    const recipe = req.body;
    indicative.validate(params, {userId: 'required|regex:^[0-9a-f]{24}$'})
        .then(() => {
            db.collection('users').findOne({_id: new ObjectID(params.userId)})
            .then(user => {
                if(!user) {
                    error(req, res, 404, `Invalid user ID: ${params.userId}`);
                }
            });
        }).catch(err => error(req, res, 404, 
            `Invalid user ID: ${params.userId}. Id should have 24 hexadecimal characters.`, err));
    
    indicative.validate(recipe, 
        {
            name: 'required|string|max:80',
            shortDescr: 'required|max:256',
            time: 'regex:[0-9]+',
            imageUrl: 'url',
            longDescr: 'string|max:2048'
    })
    .then(recipe => {
        recipe.userId = params.userId;
        recipe.dateOfPubl = currentDateAndTime();
        recipe.dateOfLastChange = recipe.dateOfPubl;
        console.log("Inserting recipe: ", recipe);
        db.collection('recipes').insertOne(recipe).then(result => {
            if(result.result.ok && result.insertedCount === 1) {
                replaceId(recipe);
                const uri = req.baseUrl + `/${params.userId}/recipes/` + recipe._id
                res.location(uri).status(201).json(recipe);
            }
        });
    }).catch(err => error(req, res, 400, 
        `Invalid recipe: ${util.inspect(err)}`, err));
});

// PUT (update recipe of user)
router.put('/:userId/recipes/:recipeId', (req, res) => {
    const db = req.app.locals.db;
    const params = req.params;
    const recipe = req.body;

    indicative.validate(params, {userId: 'required|regex:^[0-9a-f]{24}$'})
        .then(() => {
            db.collection('users').findOne({_id: new ObjectID(params.userId)})
            .then(user => {
                if(!user) {
                    error(req, res, 404, `Invalid user ID: ${params.userId}`);
                }
            });
        }).catch(err => error(req, res, 404, 
            `Invalid user ID: ${params.userId}. Id should have 24 hexadecimal characters.`, err));
    
    indicative.validate(recipe, 
        {
            name: 'required|string|max:80',
            shortDescr: 'required|max:256',
            time: 'regex:[0-9]+',
            imageUrl: 'url',
            longDescr: 'string|max:2048'
     })
    .then(recipe => {
        recipe.userId = params.userId;
        recipe.dateOfLastChange = currentDateAndTime();
        console.log("Updating recipe: ", recipe);
        recipe._id = new ObjectID(params.recipeId);
        db.collection('recipes').updateOne({ _id: recipe._id, userId: recipe.userId}, {"$set": recipe} )
        .then(result => {
            console.log("Recipe to update: ", recipe);
            if(result.result.ok && result.modifiedCount === 1) {
                replaceId(recipe);
                res.status(200).json(recipe);
            }
        });
    }).catch(err => error(req, res, 400, 
        `Invalid recipe: ${util.inspect(err)}`, err));
});

// DELETE (remove recipe for user)
router.delete('/:userId/recipes/:recipeId', function(req, res) {
    const params = req.params;
    const db = req.app.locals.db;

    indicative.validate(params, {userId: 'required|regex:^[0-9a-f]{24}$'})
        .then(() => {
            db.collection('users').findOne({_id: new ObjectID(params.userId)})
            .then(user => {
                if(!user) {
                    error(req, res, 404, `Invalid user ID: ${params.userId}`);
                }
            });
        }).catch(err => error(req, res, 404, 
            `Invalid user ID: ${params.userId}. Id should have 24 hexadecimal characters.`, err));
    
    indicative.validate(params, {recipeId: 'required|regex:^[0-9a-f]{24}$'})
        .then(() => {
            db.collection('recipes').findOneAndDelete({_id: new ObjectID(params.recipeId)})
            .then(({ value }) => {
                if(value) {
                    replaceId(value);
                    res.json(value);
                } else {
                    error(req, res, 404, `Invalid recipe ID: ${params.recipeId}`)
                }
            });
        }).catch(err => error(req, res, 404, 
            `Invalid recipe ID: ${params.recipeId}. Id should have 24 hexadecimal characters.`, err));
});

module.exports = router;
