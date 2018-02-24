import argparse
import json
import google.cloud.language
import sys
import os

from google.cloud import language
from google.cloud.language import enums
from google.cloud.language import types


def getSenti(cont):
    global sentiScore
    global sentiSize
    # Create a Language client.
    language_client = google.cloud.language.LanguageServiceClient()

    for tweet in cont["direct_tweets"]:
        # TODO (Developer): Replace this with the text you want to analyze.
        text = u''+tweet["text"]
        document = google.cloud.language.types.Document(
            content=text,
            type=google.cloud.language.enums.Document.Type.PLAIN_TEXT)

        # Use Language to detect the sentiment of the text.
        response = language_client.analyze_sentiment(document=document)
        sentiment = response.document_sentiment

        if( sentiment.score <= -0.21 or 0.21 <= sentiment.score ):
            sentiScore += sentiment.score
            sentiSize += 1.0


        # print(u'Text: {}'.format(text))
        # print(u'Sentiment: Score: {}, Magnitude: {}'.format(
        # sentiment.score, sentiment.magnitude))

def getMood():
    global sentiScore
    sentiScore = sentiScore/sentiSize
    senti = None
    if( sentiScore <= -0.21 ):
        senti = "sad"
    elif( -0.2 < sentiScore and sentiScore < 0.2 ):
        senti = "neutral"
    elif( 0.21 <= sentiScore ):
        senti = "happy"
    else:
        senti = "null"

    return senti

sentiScore = 0
sentiSize = 0.0
d = open(sys.argv[1], "r")
data = json.loads(d.read())
getSenti(data)

with open(str(os.getpid())+'.txt', 'w') as f:
    json.dump(getMood(), f, indent=2)
    




