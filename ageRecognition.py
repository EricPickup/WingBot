import json
import urllib
import requests
import os
import sys
import math

def getImagePaths():
	paths = []
	path = "public/images/" + sys.argv[1] + "/Profile"
	for root, dirs, files in os.walk(path):
		for file_ in files:
			paths.append(os.path.join(root, file_))
	return paths

config = json.load(open('config.json'))["Azure"]

headers = {
    'Content-Type': 'application/octet-stream',
    'Ocp-Apim-Subscription-Key': config['api_key'],
}

params = {
    'returnFaceId': 'false',
    'returnFaceLandmarks': 'false',
    'returnFaceAttributes': 'age,gender',
}

url = (config['url'] + 'detect?%s') % params

paths = getImagePaths()

faceList = []

for path in paths:
	f = open(path, "rb")
	body = f.read()
	f.close()
	response = requests.post(url, body, params=params, headers=headers)
	faceList.append(response)
	if response.status_code != 200:
	    raise ValueError(
	        'Request to Azure returned an error %s, the response is:\n%s'
	        % (response.status_code, response.text)
	    )

male = []
female = []
for face in faceList:
	attributes = (face.json())[0]['faceAttributes']
	if (attributes['gender'] == 'male'):
		male.append(attributes['age'])
	else:
		female.append(attributes['age'])

if (len(male) > len(female)):
	ageSum = 0
	for age in male:
		ageSum += age
	ageSum = ageSum / len(male)
else:
	ageSum = 0
	for age in female:
		ageSum += age
	ageSum = ageSum / len(female)

print(math.floor(ageSum));
