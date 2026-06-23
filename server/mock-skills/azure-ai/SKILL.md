---
name: azure-ai
description: Integrate Azure AI Cognitive Services into your apps — Vision, Speech, Language, Document Intelligence, and OpenAI on Azure.
version: 1.0.0
author: microsoft
source: microsoft/azure-skills
category: Cloud & AI
tags:
  - azure
  - ai
  - openai
  - cognitive-services
---

# Azure AI

Integrate the full Azure AI portfolio into web, mobile, and backend applications.

## Azure OpenAI Quick Start

```python
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint="https://<resource>.openai.azure.com/",
    api_key=os.environ["AZURE_OPENAI_KEY"],
    api_version="2024-10-01",
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}],
)
```

## Authentication Best Practice

```python
# Prefer managed identity in production
from azure.identity import DefaultAzureCredential
credential = DefaultAzureCredential()
```

## Service Overview

| Service | Use case |
|---|---|
| Azure OpenAI | Chat, embeddings, DALL-E |
| Azure AI Vision | Image classification, OCR |
| Azure AI Language | Sentiment, NER, summarization |
| Document Intelligence | Invoice and form extraction |
| Azure AI Speech | STT, TTS, real-time transcription |
| Azure AI Search | Vector search, semantic ranking, RAG |

## Installation

```
npx skills add https://github.com/microsoft/azure-skills --skill azure-ai
```
