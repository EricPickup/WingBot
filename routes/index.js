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
	res.render('index');
});
router.get('/results', function(req, res, next){
	res.render('results');
});

router.get("/error", function(req, res, next){
	res.render('error');
});

// router.get('/watson', function(req, res, next){
// 	console.log(config.IBM.api_key);
// 	var visual_recognition = watson.visual_recognition({
// 		api_key: config.IBM.api_key,
// 		version: 'v3',
// 		version_date: '2016-05-20'
// 	});
// 	var params = {
// 		images_file: fs.createReadStream(path.join(__dirname, '../public/images/eric.jpg'))
// 	}
// 	visual_recognition.detectFaces(params,
// 		function(err, response) {
// 			if (err)
// 				console.log(err);
// 			else
// 				console.log(JSON.stringify(response, null, 2));
// 		}
// 	);
// 	res.send("ok!");
// });

router.post('/fetchTwitterData', function(req, res, next){

	var data;

	
	console.log("> spawning fetchTwitterData.py");
	console.log(req.body);
	req.body.handle = req.body.handle.replace("@", "");
	var tweetLimit = 80;
	var playCV = true;
	var twitter_data = spawn('python3', ["fetchTwitterData.py",
		req.body.handle,
		tweetLimit
	]);
	console.log("> waiting for fetchTwitterData.py to complete");
	twitter_data.on('close', function (twitter_data_data) {
		console.log(">> fetchTwitterData.py completed!");

		var pathToTwitterData = path.join(__dirname, "../", twitter_data.pid + '.json');
		
		console.log("> reading fetchTwitterData.py output");
		fs.readFile(pathToTwitterData, 'utf-8', function (err, text) {
			if (err) console.log(err);
			console.log("> spawning google_cloud.py");
			var google_cloud = spawn('python3', [
				"google_cloud.py",
				path.join(__dirname, "../"+twitter_data.pid+".json")
			]);

			console.log("> spawning computeLikes.py");
			var computeLikes = spawn('python3', [
				"computeLikes.py",
				path.join(__dirname, "../" + twitter_data.pid + ".json")
			]);

			console.log("> spawning classifyText.py");
			var classifyText = spawn('python3', [
				"classifyText.py",
				path.join(__dirname, "../" + twitter_data.pid + ".json")
			]);

			
			console.log("> creating data object");
			data = JSON.parse(text);
			data.at = req.body.handle;
			data.pp = data.profile_picture_url;
			if (data.images.length <= 0) playCV = false;
			if (!playCV) console.log("no cv");
			console.log(data.images.length);

			if (playCV){
				console.log("> spawning Playground");
				console.log(data.images);
				var imageUrls = data.images.map(function(image){
					return image.URL;
				});
				console.log(imageUrls);
				var Playground = spawn(path.join(__dirname, '../image-analysis/Playground'), imageUrls);

				console.log("> spawning ageRecognition.py");
			}

			var one = false;
			var two = false;
			var three = false;
			var age = false;
			var cv = false;
			if (!playCV){
				cv = true;
				age = true;
			}

			var pathToComputeLikes;
			var pathToGoogleCloud;
			var pathToAgeRecognition;

			if (playCV){

				Playground.on("close", function (dt) {
					cv = true;

					var ageRecognition = spawn('python3', [
						"ageRecognition.py",
						Playground.pid
					]);
					ageRecognition.stdout.on("data", function (dat) {
						console.log("\n\n\n\n\nGETTING AGE HERE\n\n\n\n\n");
						data.age = dat;
						console.log(data.age);

						age = true;
						if (one && two && three && cv && age) {
							console.log("> rendering results");
							if (pathToClassifyText) {
								fs.unlink(pathToClassifyText, function (err) {
									if (err) console.log(err);
								});
							}
							if (pathToGoogleCloud) {
								fs.unlink(pathToGoogleCloud, function (err) {
									if (err) console.log(err);
								});
							}
							if (pathToComputeLikes) {
								fs.unlink(pathToComputeLikes, function (err) {
									if (err) console.log(err);
								});
							}
							if (pathToTwitterData) {
								fs.unlink(pathToTwitterData, function (err) {
									if (err) console.log(err);
								});
							}
							console.log(data);

							return res.render("results", data);
						}
					});

					data.cv = {}
					data.cv.playground_PID = Playground.pid;
					data.cv.photos = []
					console.log(Playground.pid);
					fs.readdir(path.join(__dirname, "../public/images/" + Playground.pid, "/Faces"), function(err, pictures){
						if (err) console.log(err);
						pictures.forEach(function(pic){
							data.cv.photos.push({
								url: path.join("/images/" + Playground.pid, "/Faces/", pic),
								frequency: pic.split(" ")[1].split(".")[0]
							});
						});

						if (one && two && three && cv && age) {
							console.log("> rendering results");
							if (pathToClassifyText) {
								fs.unlink(pathToClassifyText, function (err) {
									if (err) console.log(err);
								});
							}
							if (pathToGoogleCloud) {
								fs.unlink(pathToGoogleCloud, function (err) {
									if (err) console.log(err);
								});
							}
							if (pathToComputeLikes) {
								fs.unlink(pathToComputeLikes, function (err) {
									if (err) console.log(err);
								});
							}
							if (pathToTwitterData) {
								fs.unlink(pathToTwitterData, function (err) {
									if (err) console.log(err);
								});
							}
							console.log(data);

							return res.render("results", data);
						}
					});

				});
				
				


			}
		
			console.log("> async: waiting for google_cloud.py to finish");
			google_cloud.on("close", function(google_cloud_data){
				pathToGoogleCloud = path.join(__dirname, "../", google_cloud.pid + '.txt');

				console.log("> reading google_cloud.py output");
				fs.readFile(pathToGoogleCloud, 'utf-8', function(err, text){
					if (err) console.log(err);					
					data.emotion = text;
					console.log("> data.emotion set to "+data.emotion);
					one = true;
					if (one && two && three && cv && age) {
						console.log("> rendering results");
						if (pathToClassifyText) {
							fs.unlink(pathToClassifyText, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToGoogleCloud) {
							fs.unlink(pathToGoogleCloud, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToComputeLikes) {
							fs.unlink(pathToComputeLikes, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToTwitterData) {
							fs.unlink(pathToTwitterData, function (err) {
								if (err) console.log(err);
							});
						}
						console.log(data);

						return res.render("results", data);
					}
				});

				
			});

			console.log("> async: waiting for computeLikes.py to finish");			
			computeLikes.on("close", function(compute_likes_data){
				pathToComputeLikes = path.join(__dirname, "../", computeLikes.pid + '.json');
				
				console.log("> reading computeLikes.py output");				
				fs.readFile(pathToComputeLikes, 'utf-8', function (err, text) {
					if (err) console.log(err);
					text = JSON.parse(text);
					data.likes = text.likes;
					console.log("> data.likes is set to " + data.likes);
					data.dislikes = text.dislikes;
					console.log("> data.dislikes is set to " + data.dislikes);
					console.log(data);
					
					two = true;

					if (one && two && three && cv && age) {
						console.log("> rendering results");
						if (pathToClassifyText) {
							fs.unlink(pathToClassifyText, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToGoogleCloud) {
							fs.unlink(pathToGoogleCloud, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToComputeLikes) {
							fs.unlink(pathToComputeLikes, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToTwitterData) {
							fs.unlink(pathToTwitterData, function (err) {
								if (err) console.log(err);
							});
						}
						console.log(data);

						return res.render("results", data);
					}
				});
						

				
			});

			console.log("> async: waiting for classifyText.py to finish");
			classifyText.on("close", function (classify_text_data) {
				pathToClassifyText = path.join(__dirname, "../", classifyText.pid + '.json');

				console.log("> reading classifyText.py output");
				fs.readFile(pathToClassifyText, 'utf-8', function (err, text) {
					if (err) console.log(err);
					data.categories = JSON.parse(text).categories;
					console.log(data.categories);
					three = true;
					if (one && two && three && cv && age) {
						console.log("> rendering results");
						if (pathToClassifyText) {
							fs.unlink(pathToClassifyText, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToGoogleCloud) {
							fs.unlink(pathToGoogleCloud, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToComputeLikes) {
							fs.unlink(pathToComputeLikes, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToTwitterData) {
							fs.unlink(pathToTwitterData, function (err) {
								if (err) console.log(err);
							});
						}
						console.log(data);

						return res.render("results", data);
					}
				});

				
			});

			
			

		});

	});
	
});

module.exports = router;
