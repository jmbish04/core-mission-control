"""
MCP Server Implementation for Factory Orchestrator Tool

Exposes tool functions as MCP tools for agents.
"""

from typing import Any, Dict, List
import json

from .modules.placeholder_processor import process_placeholders
from .modules.order_validator import validate_order_structure
from .modules.template_manager import list_templates, extract_placeholders

# MCP tool definitions
MCP_TOOLS = [
    {
        "name": "process_placeholders",
        "description": "Process placeholders in cloned template files",
        "inputSchema": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string"},
                "placeholder_json_path": {"type": "string"},
                "workspace_path": {"type": "string"},
            },
            "required": ["order_id", "placeholder_json_path", "workspace_path"],
        },
    },
    {
        "name": "validate_order",
        "description": "Validate an order structure",
        "inputSchema": {
            "type": "object",
            "properties": {
                "order_data": {"type": "object"},
            },
            "required": ["order_data"],
        },
    },
    {
        "name": "list_templates",
        "description": "List available templates in a factory",
        "inputSchema": {
            "type": "object",
            "properties": {
                "factory_path": {"type": "string"},
            },
            "required": ["factory_path"],
        },
    },
    {
        "name": "extract_placeholders",
        "description": "Extract placeholders from template files",
        "inputSchema": {
            "type": "object",
            "properties": {
                "template_path": {"type": "string"},
            },
            "required": ["template_path"],
        },
    },
]

def handle_mcp_call(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle MCP tool call.
    
    Args:
        tool_name: Name of the MCP tool
        arguments: Tool arguments
    
    Returns:
        Tool result
    """
    try:
        if tool_name == "process_placeholders":
            result = process_placeholders(
                arguments["order_id"],
                arguments["placeholder_json_path"],
                arguments["workspace_path"],
            )
            return {"content": [{"type": "text", "text": json.dumps(result)}]}
        
        elif tool_name == "validate_order":
            result = validate_order_structure(arguments["order_data"])
            return {"content": [{"type": "text", "text": json.dumps(result)}]}
        
        elif tool_name == "list_templates":
            templates = list_templates(arguments["factory_path"])
            return {"content": [{"type": "text", "text": json.dumps({"ok": True, "templates": templates})}]}
        
        elif tool_name == "extract_placeholders":
            placeholders = extract_placeholders(arguments["template_path"])
            return {"content": [{"type": "text", "text": json.dumps({"ok": True, "template_files": placeholders})}]}
        
        else:
            return {"error": f"Unknown tool: {tool_name}"}
    
    except Exception as e:
        return {"error": str(e)}

def get_mcp_tools() -> List[Dict[str, Any]]:
    """Get list of available MCP tools."""
    return MCP_TOOLS

