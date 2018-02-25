import json
import sys
from google.cloud import language
from google.cloud.language import enums
from google.cloud.language import types
import os

MAX_TOP_LIKES = 5

'''
Function: findKeywords
Desc: Finds each noun in a tweet and keeps track of the frequency of the nouns
Input: Tweet
Output: List of most frequently mentioned nounds
'''
def findKeywords(data, overallLikes):

	keywordsDict = {}
	nouns = [str] * 20
	freq = [0] * 20

	client = language.LanguageServiceClient()
	for tweet in data["direct_tweets"]:
		text = tweet["text"]
		document = types.Document(
			content=text,
			type=enums.Document.Type.PLAIN_TEXT)
		result = client.analyze_entity_sentiment(document)
		for entity in result.entities:
			for mention in entity.mentions:
				if mention.sentiment.score:
					entityName = entity.name.lower()
					if "http://" not in str(entityName) and "https://" not in str(entityName) and "&" not in str(entityName) and "\\" not in str(entityName):
						if float(mention.sentiment.score) > 0:
							if entityName in overallLikes['dislikes']:
								overallLikes['dislikes'][entityName] -= 1
							elif entityName in overallLikes['likes']:
								overallLikes['likes'][entityName] += 1
							else:
								overallLikes['likes'][entityName] = 1
						elif float(mention.sentiment.score) < 0:
							if entityName in overallLikes['likes']:
								overallLikes['likes'][entityName] -= 1
							elif entityName in overallLikes['dislikes']:
								overallLikes['dislikes'][entityName] += 1
							else:
								overallLikes['dislikes'][entityName] = 1
	topLikes = dict()
	topLikes['likes'] = []
	topLikes['dislikes'] = []
	count = 0
	for word in sorted(overallLikes['likes'], key=overallLikes['likes'].get, reverse=True):
		if overallLikes['likes'][word] > 0:
			topLikes['likes'].append(word)
		count += 1
		if count > MAX_TOP_LIKES:
			break
	count = 0
	for word in sorted(overallLikes['dislikes'], key=overallLikes['dislikes'].get, reverse=True):
		if overallLikes['dislikes'][word] > 0:
			topLikes['dislikes'].append(word)
		count += 1
		if count > MAX_TOP_LIKES:
			break

	return topLikes

overallLikes = dict()
overallLikes['likes'] = dict()
overallLikes['dislikes'] = dict()

d = open(sys.argv[1], "r")
data = json.loads(d.read())
overallLikes = findKeywords(data, overallLikes)

d.close()

with open(str(os.getpid())+'.json', 'w') as f:
    json.dump(overallLikes, f, indent=2)