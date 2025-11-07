"""
Template Manager Module

Provides template management functions:
- List templates
- Extract placeholders
"""

import os
import re
from typing import List, Dict, Any

def list_templates(factory_path: str) -> List[Dict[str, str]]:
    """
    List available templates in a factory path.
    
    Args:
        factory_path: Path to factory templates directory
    
    Returns:
        List of template dictionaries with name and path
    """
    templates = []
    
    if not os.path.isdir(factory_path):
        return templates
    
    for item in os.listdir(factory_path):
        item_path = os.path.join(factory_path, item)
        if os.path.isdir(item_path) and not item.startswith('.'):
            templates.append({
                'name': item,
                'path': item_path,
            })
    
    return templates

def extract_placeholders(template_path: str) -> List[Dict[str, Any]]:
    """
    Extract placeholders from template files.
    
    Args:
        template_path: Path to template directory
    
    Returns:
        List of template file dictionaries with placeholders
    """
    template_files_data = []
    
    for root, dirs, files in os.walk(template_path):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        for file in files:
            # Look for .template files or regular code files
            if file.endswith('.template') or any(file.endswith(ext) for ext in ['.ts', '.tsx', '.js', '.jsx', '.py']):
                filepath = os.path.join(root, file)
                placeholders = []
                
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Find /** PLACEHOLDER_ID **/ patterns
                    placeholder_pattern = r'/\*\*\s*(PLACEHOLDER_[A-Z0-9_]+)\s*\*\*/'
                    found_placeholders = re.findall(placeholder_pattern, content)
                    
                    # Also find {{PLACEHOLDER_...}} patterns
                    template_pattern = r'\{\{(PLACEHOLDER_[A-Z0-9_]+)\}\}'
                    found_template_placeholders = re.findall(template_pattern, content)
                    
                    # Combine and deduplicate
                    all_placeholders = list(set(found_placeholders + found_template_placeholders))
                    placeholders = all_placeholders
                    
                    if placeholders:
                        template_files_data.append({
                            'path': os.path.relpath(filepath, template_path),
                            'placeholders': placeholders,
                        })
                except Exception as e:
                    print(f"Error reading or parsing {filepath}: {e}")
    
    return template_files_data

