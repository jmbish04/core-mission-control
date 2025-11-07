# factory/shared/factory-base.Dockerfile

FROM node:22-slim

LABEL maintainer="VibeHQ Mission Control"
LABEL description="Base image for all VibeHQ factories with preinstalled AI CLIs and shared utilities"

# --- Core System Tools ---
RUN apt-get update && apt-get install -y \
    python3 python3-pip git curl jq bash nano && \
    npm install -g typescript wrangler@latest pnpm && \
    pip3 install requests rich && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# --- Install Python tooling packages (Factory Automation System) ---
# Note: These packages will be installed from the packages/ directory
# The actual COPY and RUN commands will be added when building the image
# For now, we ensure the base dependencies are available
RUN pip3 install typer pydantic fastapi uvicorn || echo "Note: Python packages will be installed during image build"

# --- AI CLI Toolchain (installed globally but idle until keys provided) ---
RUN npm install -g \
    codex-cli@latest \
    @google/gemini-cli \
    @anthropic/claude-cli \
    cursor-agent-cli \
    github-copilot-cli

# --- Install MCP CLI (for template analysis) ---
RUN npm install -g @modelcontextprotocol/cli || echo "mcp-cli installation skipped (may not be available)"

# --- Environment defaults ---
ENV NODE_ENV=production
ENV PATH="/usr/local/bin:$PATH"
WORKDIR /app

# --- Shared utility scripts (patched at build) ---
COPY ./@shared/factory-templates/scripts /usr/local/bin/
RUN chmod +x /usr/local/bin/* || true

# --- Install Python tooling packages (Factory Automation System) ---
# Copy Python packages and install them
COPY packages/pmo-scaffolder /tmp/pmo-scaffolder
COPY packages/template-manager-tool /tmp/template-manager-tool
COPY packages/factory-orchestrator-tool /tmp/factory-orchestrator-tool
RUN pip3 install -e /tmp/pmo-scaffolder && \
    pip3 install -e /tmp/template-manager-tool && \
    pip3 install -e /tmp/factory-orchestrator-tool && \
    rm -rf /tmp/pmo-scaffolder /tmp/template-manager-tool /tmp/factory-orchestrator-tool

# --- Optional health check ---
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
 CMD wrangler --version || exit 1

CMD ["bash"]




