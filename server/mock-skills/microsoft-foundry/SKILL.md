---
name: microsoft-foundry
description: Deploy and manage AI models on Azure AI Foundry — endpoints, RAG pipelines, prompt flows, and monitoring at enterprise scale.
version: 1.0.0
author: microsoft
source: microsoft/azure-skills
category: Cloud & AI
tags:
  - azure
  - ai
  - foundry
  - rag
---

# Microsoft Foundry

Build, deploy, and monitor AI solutions on Azure AI Foundry (formerly Azure AI Studio).

## Getting Started

```bash
az login
az extension add --name ml
pip install azure-ai-ml azure-identity
```

## Deploy a Model

```python
from azure.ai.ml import MLClient
from azure.identity import DefaultAzureCredential

client = MLClient(
    credential=DefaultAzureCredential(),
    subscription_id="<your-subscription-id>",
    resource_group_name="<your-rg>",
    workspace_name="<your-hub>",
)
```

## RAG Pipeline Pattern

1. Ingest documents into Azure Blob Storage
2. Index with Azure AI Search (vector + keyword hybrid)
3. Configure retrieval in Prompt Flow
4. Deploy as a managed endpoint
5. Monitor with Azure Monitor

## Supported Models

- GPT-4o, GPT-4o-mini
- Phi-3, Phi-4
- Llama 3.x
- Mistral
- Custom fine-tuned models

## Installation

```
npx skills add https://github.com/microsoft/azure-skills --skill microsoft-foundry
```
