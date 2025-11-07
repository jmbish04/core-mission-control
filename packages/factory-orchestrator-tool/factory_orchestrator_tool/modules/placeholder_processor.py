"""
Placeholder Processor Module

Processes placeholders in cloned template files by:
1. Reading placeholder JSON payload
2. Scanning workspace for template files
3. Finding /** PLACEHOLDER_ID **/ patterns
4. Injecting comment docstring + newline + placeholder
"""

import json
import os
import re
from typing import Dict, List, Any

def process_placeholders(order_id: str, placeholder_json_path: str, workspace_path: str) -> Dict[str, Any]:
    """
    Process placeholders in cloned template files.
    
    Args:
        order_id: Order ID
        placeholder_json_path: Path to placeholder JSON file
        workspace_path: Workspace directory containing cloned files
    
    Returns:
        Dict with processing results
    """
    # Step 1: Read placeholder JSON
    with open(placeholder_json_path, 'r') as f:
        placeholder_payload = json.load(f)
    
    # Step 2: Scan workspace for template files
    files_processed = []
    files_modified = []
    
    for root, dirs, files in os.walk(workspace_path):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        for file in files:
            file_path = os.path.join(root, file)
            relative_path = os.path.relpath(file_path, workspace_path)
            
            # Skip non-code files (adjust extensions as needed)
            if not any(file.endswith(ext) for ext in ['.ts', '.tsx', '.js', '.jsx', '.py', '.md']):
                continue
            
            try:
                # Step 3: Read file content
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                
                # Step 4: Find and replace placeholders
                for placeholder_id, placeholder_info in placeholder_payload.items():
                    # Find /** PLACEHOLDER_ID **/ pattern
                    pattern = rf'/\*\*\s*{re.escape(placeholder_id)}\s*\*\*/'
                    
                    if re.search(pattern, content):
                        # Get mini-prompt from placeholder info
                        mini_prompt = placeholder_info.get('mini_prompt', f'Implement {placeholder_id}')
                        
                        # Create replacement: comment docstring + newline + placeholder
                        replacement = f'/** agent: {mini_prompt} **/\n/** {placeholder_id} **/'
                        
                        # Replace the placeholder pattern
                        content = re.sub(pattern, replacement, content)
                        files_modified.append(relative_path)
                
                # Step 5: Write modified content back
                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                
                files_processed.append(relative_path)
                
            except Exception as e:
                # Log error but continue processing other files
                print(f"Error processing {relative_path}: {e}")
    
    return {
        'ok': True,
        'order_id': order_id,
        'files_processed': len(files_processed),
        'files_modified': len(files_modified),
        'files_processed_list': files_processed,
        'files_modified_list': files_modified,
    }

