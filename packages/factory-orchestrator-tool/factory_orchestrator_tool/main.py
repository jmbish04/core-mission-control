"""
Factory Orchestrator Tool - Main CLI/TUI Entrypoint

Provides multiple interfaces:
- CLI: Direct command-line interface
- TUI: Interactive menu wizard using rich
- MCP: Exposed as MCP tool for agents
- FastAPI: REST API server (started separately)
"""

import typer
from typing import Optional
from rich.console import Console
from rich.prompt import Prompt, Confirm
from rich.table import Table
import json
import sys

from .modules.placeholder_processor import process_placeholders
from .modules.order_validator import validate_order_structure
from .modules.template_manager import list_templates, extract_placeholders

app = typer.Typer(help="Factory Orchestrator Tool - Unified interface for factory order orchestration")
console = Console()

@app.command()
def process_placeholders_cmd(
    order_id: str = typer.Option(..., "--order-id", "-o", help="Order ID"),
    placeholder_json: str = typer.Option(..., "--placeholder-json", "-j", help="Path to placeholder JSON file"),
    workspace: str = typer.Option(..., "--workspace", "-w", help="Workspace directory path"),
):
    """
    Process placeholders in cloned template files.
    
    Reads placeholder JSON, scans workspace for template files, and injects
    comment docstrings + placeholders into files.
    """
    try:
        result = process_placeholders(order_id, placeholder_json, workspace)
        console.print(f"[green]✓[/green] Processed placeholders for order {order_id}")
        console.print_json(json.dumps(result))
        return result
    except Exception as e:
        console.print(f"[red]✗[/red] Error processing placeholders: {e}")
        sys.exit(1)

@app.command()
def validate_order(
    order_file: str = typer.Option(..., "--order-file", "-f", help="Path to order JSON file"),
):
    """
    Validate an order structure.
    """
    try:
        with open(order_file, 'r') as f:
            order_data = json.load(f)
        
        result = validate_order_structure(order_data)
        if result['ok']:
            console.print(f"[green]✓[/green] Order is valid")
        else:
            console.print(f"[red]✗[/red] Order validation failed:")
            for error in result.get('errors', []):
                console.print(f"  - {error}")
        console.print_json(json.dumps(result))
        return result
    except Exception as e:
        console.print(f"[red]✗[/red] Error validating order: {e}")
        sys.exit(1)

@app.command()
def list_templates_cmd(
    factory_path: str = typer.Option(..., "--factory-path", "-p", help="Path to factory templates directory"),
):
    """
    List available templates in a factory.
    """
    try:
        templates = list_templates(factory_path)
        console.print(f"[green]✓[/green] Found {len(templates)} templates")
        console.print_json(json.dumps({"ok": True, "templates": templates}))
        return templates
    except Exception as e:
        console.print(f"[red]✗[/red] Error listing templates: {e}")
        sys.exit(1)

@app.command()
def extract_placeholders_cmd(
    template_path: str = typer.Option(..., "--template-path", "-t", help="Path to template directory"),
):
    """
    Extract placeholders from template files.
    """
    try:
        placeholders = extract_placeholders(template_path)
        console.print(f"[green]✓[/green] Extracted placeholders")
        console.print_json(json.dumps({"ok": True, "template_files": placeholders}))
        return placeholders
    except Exception as e:
        console.print(f"[red]✗[/red] Error extracting placeholders: {e}")
        sys.exit(1)

@app.command()
def menu():
    """
    Interactive menu wizard (TUI).
    """
    console.print("[bold blue]Factory Orchestrator Tool[/bold blue]")
    console.print("=" * 50)
    
    while True:
        console.print("\n[bold]Available Commands:[/bold]")
        table = Table()
        table.add_column("Option", style="cyan")
        table.add_column("Description", style="white")
        table.add_row("1", "Process Placeholders")
        table.add_row("2", "Validate Order")
        table.add_row("3", "List Templates")
        table.add_row("4", "Extract Placeholders")
        table.add_row("q", "Quit")
        console.print(table)
        
        choice = Prompt.ask("\nSelect an option", default="q")
        
        if choice == "q":
            console.print("[yellow]Goodbye![/yellow]")
            break
        elif choice == "1":
            order_id = Prompt.ask("Order ID")
            placeholder_json = Prompt.ask("Placeholder JSON path")
            workspace = Prompt.ask("Workspace path")
            process_placeholders_cmd(order_id, placeholder_json, workspace)
        elif choice == "2":
            order_file = Prompt.ask("Order JSON file path")
            validate_order(order_file)
        elif choice == "3":
            factory_path = Prompt.ask("Factory templates path")
            list_templates_cmd(factory_path)
        elif choice == "4":
            template_path = Prompt.ask("Template directory path")
            extract_placeholders_cmd(template_path)
        else:
            console.print("[red]Invalid option[/red]")

if __name__ == "__main__":
    app()

