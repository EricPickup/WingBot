import argparse

from google.cloud import language
from google.cloud.language import enums
from google.cloud.language import types

if __name__ == '__main__':

    content = "I like to go to hackathons, I'm currently coding this project at Hack The Valley in Scarborough"
    client = language.LanguageServiceClient()
    document = types.Document(
        content=content,
        type=enums.Document.Type.PLAIN_TEXT)
    annotations = client.analyze_entities(document=document)
    print(annotations)