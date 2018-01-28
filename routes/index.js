var express = require('express');
var router = express.Router();
var path = require('path');

var watson = require('watson-developer-cloud');
var fs = require('fs');
var config = require('../config.json');

var exec = require('child-process-promise').exec;

//var spawn = require("child_process").spawn;
var spawn = require('child_process').spawn;

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});
router.get('/results', function(req, res, next){
	res.render('results');
});

router.get('/watson', function(req, res, next){
	console.log(config.IBM.api_key);
	var visual_recognition = watson.visual_recognition({
		api_key: config.IBM.api_key,
		version: 'v3',
		version_date: '2016-05-20'
	});
	var params = {
		images_file: fs.createReadStream(path.join(__dirname, '../public/images/eric.jpg'))
	}
	visual_recognition.detectFaces(params,
		function(err, response) {
			if (err)
				console.log(err);
			else
				console.log(JSON.stringify(response, null, 2));
		}
	);
	res.send("ok!");
});

router.post('/fetchTwitterData', function(req, res, next){
	console.log("fetching data...");
	console.log('python ' + path.join("fetchTwitterData.py") + " " + req.body.twitter_handle + " " + 100)
	exec('python ' + "fetchTwitterData.py" + " " + req.body.twitter_handle + " " + 100)
		.then(function (result) {
			setTimeout(() => {
				res.send('done');
			}, 360000)
			console.log('python compute.py');
			exec('python compute.py')
				.then(function (result) {
					console.log("Data computed !");
					var data = require('../dataDump');
					var mentions = require('../data');
					data.mentions = mentions.top_mentions;
					data.pp = mentions.profile_picture_url;
					data.at = req.body.twitter_handle;
					console.log(data.pp);
					res.render("results", data);
				})
				.catch(function (err) {
					console.error('ERROR: ', err);
				});
		})
		.catch(function (err) {
			console.error('ERROR: ', err);
		});
	// exec("python "+path.join(__dirname, "../fetchTwitterData.py")+" "+req.body.twitter_handle+" 10", function(err, stdout, stderr){
	// 	if (err){
	// 		console.error('error while fetching tweets');
	// 		res.send("error")
	// 	}
	// 	console.log("done.");
	// 	res.redirect("/results");
	// });
});

router.get('/moose', function(req, res, next){
	req.setTimeout(0);
	var process2 = spawn('python', [path.join(__dirname, "../compute.py")]);
	process2.stdout.on('data', function (data) {
		console.log(data);
		res.redirect("/results");
	});
});

module.exports = router;
