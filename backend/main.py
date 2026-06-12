from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration variables
endpoint = "https://niwiaidev-gs-resource.services.ai.azure.com/api/projects/niwiaidev-gs"
agent_name = "voice-agent-v2"
# 1. Global Setup
credential = DefaultAzureCredential()
project_client = AIProjectClient(
    endpoint=endpoint,
    credential=credential,
    allow_preview=True,
)

# Create OpenAI client bound to your agent
openai_client = project_client.get_openai_client(
    agent_name=agent_name
)


class ChatRequest(BaseModel):
    message: str


@app.get("/")
async def root():
    return {
        "status": "running",
        "agent": agent_name
    }


# 2. Dynamic Route Execution (Safe from crashing the server on startup)
@app.post("/chat")
async def chat(data: ChatRequest):
    try:
        response = openai_client.responses.create(
            input=data.message,
        )

        return {
            "success": True,
            "answer": response.output_text,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
