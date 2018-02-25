import argparse
import io
import json
import os
import sys

from google.cloud import language
import numpy
import six

def classify(text):
    """Classify the input text into categories. """
    language_client = language.LanguageServiceClient()
    categoriesDict = {}

    for tweet in text["direct_tweets"]:

        try:
            
            document = language.types.Document(
                content=tweet["text"],
                type=language.enums.Document.Type.PLAIN_TEXT)
            response = language_client.classify_text(document)
            categories = response.categories

            for i in range(len(categories)):
                
                if categories[i].name in categoriesDict:
                    categoriesDict[categories[i].name] += 1
                else:
                    categoriesDict[categories[i].name] = 1

            # print(tweet["text"])
            # print(categories[0].name)


        except Exception as e:
            
            continue

    

    # print(text)
    # for category in categories:
    #     print(u'=' * 20)
    #     print(u'{:<16}: {}'.format('category', category.name))
    #     print(u'{:<16}: {}'.format('confidence', category.confidence))

    return categoriesDict

d = open(sys.argv[1], "r")
data = json.loads(d.read())
outdata = {}
outdata["categories"] = []


counter = 0
catergoryDict = classify(data)
for category in sorted(catergoryDict, key=catergoryDict.get, reverse=True):
    outdata["categories"].append(category)
    counter += 1
    if(counter > 4):
        break
    

with open(str(os.getpid())+'.json', 'w') as f:
    json.dump(outdata, f, indent=2)

# text = "Google Home enables users to speak voice commands to interact with services through the Home's intelligent personal assistant called Google Assistant. A large number of services, both in-house and third-party, are integrated, allowing users to listen to music, look at videos or photos, or receive news updates entirely by voice. "


