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

router.get("/error", function(req, res, next){
	res.render('error');
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
	const process = spawn('python', ["fetchTwitterData.py",
		req.body.twitter_handle,
		30
	]);
	// process.stdout.on('data', function (data) {
	// 	console.log("sending!");
	// 	res.send(data.toString());
	// });
	console.log(process.pid);
	// exec('python ' + "fetchTwitterData.py" + " " + req.body.twitter_handle + " " + 300, function (err, stdout, stderr) {
	// 	// process.stdout.on(‘data’, function (data) {
	// 	// 	res.send(data.toString());
	// 	// });


	// 	res.send(stdout);

	// 	// console.log('python compute.py');
	// 	// exec('python compute.py')
	// 	// 	.then(function (result) {
	// 	// 		console.log("Data computed !");
	// 	// 		var data = require('../dataDump');
	// 	// 		var mentions = require('../data');
	// 	// 		data.mentions = mentions.top_mentions;
	// 	// 		data.pp = mentions.profile_picture_url;
	// 	// 		data.at = req.body.twitter_handle;
	// 	// 		console.log(data.pp);
	// 	// 		res.render("results", data);
	// 	// 	})
	// 	// 	.catch(function (err) {
	// 	// 		console.error('ERROR: ', err);
	// 	// 	});
	// 	//res.redirect("error");
	// })
	// .catch(function (err) {
	// 	console.error('ERROR: ', err);
	// });
});

// router.post('/twitterdata', function(req, res, next) {

// 	console.log(req.body);
// 	res.render("error");

// });

module.exports = router;
