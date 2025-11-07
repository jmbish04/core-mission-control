"""
FastAPI Server for Factory Orchestrator Tool

Provides REST API interface for the tool.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import json

from .modules.placeholder_processor import process_placeholders
from .modules.order_validator import validate_order_structure
from .modules.template_manager import list_templates, extract_placeholders

app = FastAPI(title="Factory Orchestrator Tool API")

class ProcessPlaceholdersRequest(BaseModel):
    order_id: str
    placeholder_json_path: str
    workspace_path: str

class ValidateOrderRequest(BaseModel):
    order_data: Dict[str, Any]

class ListTemplatesRequest(BaseModel):
    factory_path: str

class ExtractPlaceholdersRequest(BaseModel):
    template_path: str

@app.post("/api/process-placeholders")
async def process_placeholders_endpoint(request: ProcessPlaceholdersRequest):
    """Process placeholders in cloned template files."""
    try:
        result = process_placeholders(
            request.order_id,
            request.placeholder_json_path,
            request.workspace_path
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/validate-order")
async def validate_order_endpoint(request: ValidateOrderRequest):
    """Validate an order structure."""
    try:
        result = validate_order_structure(request.order_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/list-templates")
async def list_templates_endpoint(request: ListTemplatesRequest):
    """List available templates."""
    try:
        templates = list_templates(request.factory_path)
        return {"ok": True, "templates": templates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/extract-placeholders")
async def extract_placeholders_endpoint(request: ExtractPlaceholdersRequest):
    """Extract placeholders from template files."""
    try:
        placeholders = extract_placeholders(request.template_path)
        return {"ok": True, "template_files": placeholders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

