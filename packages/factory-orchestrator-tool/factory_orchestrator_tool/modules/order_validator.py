"""
Order Validator Module

Validates order structure against expected schema.
"""

import json
from typing import Dict, Any, List

def validate_order_structure(order_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate order structure.
    
    Args:
        order_data: Order dictionary to validate
    
    Returns:
        Dict with validation result and errors if any
    """
    errors: List[str] = []
    
    # Required fields
    required_fields = ['id', 'factory']
    for field in required_fields:
        if field not in order_data:
            errors.append(f"Missing required field: {field}")
    
    # Validate placeholder_payload if present
    if 'placeholder_payload' in order_data:
        placeholder_payload = order_data['placeholder_payload']
        if not isinstance(placeholder_payload, dict):
            errors.append("placeholder_payload must be a dictionary")
        else:
            for placeholder_id, placeholder_info in placeholder_payload.items():
                if not isinstance(placeholder_info, dict):
                    errors.append(f"placeholder_payload[{placeholder_id}] must be a dictionary")
                elif 'mini_prompt' not in placeholder_info:
                    errors.append(f"placeholder_payload[{placeholder_id}] missing 'mini_prompt'")
    
    if errors:
        return {
            'ok': False,
            'errors': errors,
        }
    
    return {
        'ok': True,
        'order': order_data,
    }

