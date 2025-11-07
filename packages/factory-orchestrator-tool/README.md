# Factory Orchestrator Tool

Unified Python tool for factory order orchestration with multiple interfaces:
- **CLI**: Direct command-line interface
- **TUI**: Interactive menu wizard
- **MCP**: Exposed as MCP tool for agents
- **FastAPI**: REST API server

## Installation

```bash
pip install -e .
```

## Usage

### CLI

```bash
factory-orchestrator process-placeholders --order-id ORD-123 --placeholder-json /path/to/placeholders.json --workspace /workspace/target
factory-orchestrator validate-order --order-file /path/to/order.json
factory-orchestrator list-templates --factory-path /apps/agent-factory/templates
factory-orchestrator extract-placeholders --template-path /apps/agent-factory/templates/basic-worker
factory-orchestrator menu  # Interactive menu
```

### FastAPI Server

```bash
python -m factory_orchestrator_tool.api
# Server runs on http://0.0.0.0:8000
```

### MCP

The tool can be exposed as an MCP server for agent integration.

