import json
import sys
from google.cloud import language
from google.cloud.language import enums
from google.cloud.language import types

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
					entityName = entity.name.encode('utf-8').lower()
					if float(mention.sentiment.score) > 0:
						if entityName in overallLikes['likes']:
							overallLikes['likes'][entityName] += 1
						else:
							overallLikes['likes'][entityName] = 1
					elif float(mention.sentiment.score) < 0:
						if entityName in overallLikes['dislikes']:
							overallLikes['dislikes'][entityName] += 1
						else:
							overallLikes['dislikes'][entityName] = 1
	topLikes = dict()
	topLikes['likes'] = dict()
	topLikes['dislikes'] = dict()
	count = 0
	for word in sorted(overallLikes['likes'], key=overallLikes['likes'].get, reverse=True):
		topLikes['likes'][word] = overallLikes['likes'][word]
		count += 1
		if count > MAX_TOP_LIKES:
			break
	count = 0
	for word in sorted(overallLikes['dislikes'], key=overallLikes['dislikes'].get, reverse=True):
		topLikes['dislikes'][word] = overallLikes['dislikes'][word]
		count += 1
		if count > MAX_TOP_LIKES:
			break

	return topLikes

overallLikes = dict()
overallLikes['likes'] = dict()
overallLikes['dislikes'] = dict()

data = json.loads(sys.argv[1])
overallLikes = findKeywords(data, overallLikes)
print(overallLikes)

d.close()

with open("dataDump.json","w") as f:
	json.dump(overallLikes, f, indent=2)